<?php

namespace App\Service;

use App\Repository\ClimbingRouteRepository;
use App\Repository\CompletedRouteRepository;
use App\Repository\LocationRepository;
use App\Repository\UserRepository;
use Psr\Cache\CacheItemPoolInterface;
use Symfony\Component\Security\Core\User\UserInterface;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class StatisticsService
{
    public function __construct(
        private readonly ClimbingRouteRepository $routeRepository,
        private readonly UserRepository $userRepository,
        private readonly LocationRepository $locationRepository,
        private readonly CompletedRouteRepository $completedRouteRepository,
        private readonly CacheInterface $cache,
        private readonly CacheItemPoolInterface $cachePool,
    ) {
    }

    /**
     * Invalidate the cached site-wide counters. Call after any operation that
     * changes the number of routes, users, locations or completed routes.
     */
    public function invalidateGeneralStats(): void
    {
        $this->cachePool->deleteItem('stats.general');
        $this->cachePool->deleteItem('stats.admin');
    }

    public function getGeneralStats(): array
    {
        return $this->cache->get('stats.general', function (ItemInterface $item): array {
            $item->expiresAfter(3600);

            return [
                'totalRoutes' => $this->routeRepository->count([]),
                'totalUsers' => $this->userRepository->count([]),
                'totalLocations' => $this->locationRepository->count([]),
            ];
        });
    }

    public function getAdminStats(): array
    {
        return $this->cache->get('stats.admin', function (ItemInterface $item): array {
            $item->expiresAfter(1800);

            return array_merge($this->getGeneralStats(), [
                'totalCompletedRoutes' => $this->completedRouteRepository->count([]),
            ]);
        });
    }

    public function getUserStats(UserInterface $user): array
    {
        $completedRoutes = $this->completedRouteRepository->findBy(
            ['user' => $user],
            ['completedAt' => 'DESC']
        );

        if (empty($completedRoutes)) {
            return [];
        }

        $byRegion = [];
        $byGrade = [];
        $maxDifficultyOrder = 0;
        $maxGrade = null;

        foreach ($completedRoutes as $cr) {
            $route = $cr->getRoute();
            $region = $route->getLocation()->getRegion() ?? 'Sin región';
            $grade = $route->getDifficulty();
            $order = $route->getDifficultyOrder();

            $byRegion[$region] = ($byRegion[$region] ?? 0) + 1;
            if ($grade) {
                $byGrade[$grade] = ($byGrade[$grade] ?? 0) + 1;
            }

            if (null !== $order && $order > $maxDifficultyOrder) {
                $maxDifficultyOrder = $order;
                $maxGrade = $grade;
            }
        }

        arsort($byRegion);

        // Sort grades by difficulty order
        $gradeOrders = [];
        foreach ($completedRoutes as $cr) {
            $route = $cr->getRoute();
            $grade = $route->getDifficulty();
            if ($grade && !isset($gradeOrders[$grade])) {
                $gradeOrders[$grade] = $route->getDifficultyOrder() ?? 0;
            }
        }
        uksort($byGrade, fn ($a, $b) => ($gradeOrders[$a] ?? 0) <=> ($gradeOrders[$b] ?? 0));

        $recentData = [];
        foreach (array_slice($completedRoutes, 0, 10) as $cr) {
            $route = $cr->getRoute();
            $recentData[] = [
                'name' => $route->getName(),
                'difficulty' => $route->getDifficulty(),
                'location' => $route->getLocation()->getName(),
                'type' => $route->getRouteType()->value,
                'date' => $cr->getCompletedAt()->format('d/m/Y'),
            ];
        }

        return [
            'maxGrade' => $maxGrade,
            'totalCompleted' => count($completedRoutes),
            'byRegion' => $byRegion,
            'byGrade' => $byGrade,
            'recent' => $recentData,
        ];
    }
}
