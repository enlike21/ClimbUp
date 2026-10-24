<?php

namespace App\Tests\Service;

use App\Repository\ClimbingRouteRepository;
use App\Repository\CompletedRouteRepository;
use App\Repository\LocationRepository;
use App\Repository\UserRepository;
use App\Service\StatisticsService;
use PHPUnit\Framework\TestCase;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\Security\Core\User\UserInterface;

class StatisticsServiceTest extends TestCase
{
    private ClimbingRouteRepository $routeRepository;

    private UserRepository $userRepository;

    private LocationRepository $locationRepository;

    private CompletedRouteRepository $completedRouteRepository;

    private ArrayAdapter $cache;

    private StatisticsService $service;

    protected function setUp(): void
    {
        $this->routeRepository = $this->createMock(ClimbingRouteRepository::class);
        $this->userRepository = $this->createMock(UserRepository::class);
        $this->locationRepository = $this->createMock(LocationRepository::class);
        $this->completedRouteRepository = $this->createMock(CompletedRouteRepository::class);
        $this->cache = new ArrayAdapter();

        $this->service = new StatisticsService(
            $this->routeRepository,
            $this->userRepository,
            $this->locationRepository,
            $this->completedRouteRepository,
            $this->cache,
            $this->cache,
        );
    }

    public function testGetGeneralStatsReturnsRepositoryTotals(): void
    {
        $this->routeRepository->expects($this->once())
            ->method('count')
            ->with([])
            ->willReturn(12);
        $this->userRepository->expects($this->once())
            ->method('count')
            ->with([])
            ->willReturn(8);
        $this->locationRepository->expects($this->once())
            ->method('count')
            ->with([])
            ->willReturn(5);

        $this->assertSame([
            'totalRoutes' => 12,
            'totalUsers' => 8,
            'totalLocations' => 5,
        ], $this->service->getGeneralStats());
    }

    public function testGetGeneralStatsUsesCacheOnSubsequentCalls(): void
    {
        $this->routeRepository->expects($this->once())
            ->method('count')
            ->with([])
            ->willReturn(12);
        $this->userRepository->expects($this->once())
            ->method('count')
            ->with([])
            ->willReturn(8);
        $this->locationRepository->expects($this->once())
            ->method('count')
            ->with([])
            ->willReturn(5);

        $expected = [
            'totalRoutes' => 12,
            'totalUsers' => 8,
            'totalLocations' => 5,
        ];

        $this->assertSame($expected, $this->service->getGeneralStats());
        $this->assertSame($expected, $this->service->getGeneralStats());
    }

    public function testInvalidateGeneralStatsRefreshesCachedTotals(): void
    {
        $this->routeRepository->expects($this->exactly(2))
            ->method('count')
            ->with([])
            ->willReturnOnConsecutiveCalls(12, 13);
        $this->userRepository->expects($this->exactly(2))
            ->method('count')
            ->with([])
            ->willReturnOnConsecutiveCalls(8, 9);
        $this->locationRepository->expects($this->exactly(2))
            ->method('count')
            ->with([])
            ->willReturnOnConsecutiveCalls(5, 6);

        $this->assertSame([
            'totalRoutes' => 12,
            'totalUsers' => 8,
            'totalLocations' => 5,
        ], $this->service->getGeneralStats());

        $this->service->invalidateGeneralStats();

        $this->assertSame([
            'totalRoutes' => 13,
            'totalUsers' => 9,
            'totalLocations' => 6,
        ], $this->service->getGeneralStats());
    }

    public function testGetUserStatsReturnsEmptyArrayWhenUserHasNoCompletedRoutes(): void
    {
        $user = $this->createMock(UserInterface::class);

        $this->completedRouteRepository->expects($this->once())
            ->method('findBy')
            ->with(['user' => $user], ['completedAt' => 'DESC'])
            ->willReturn([]);

        $this->assertSame([], $this->service->getUserStats($user));
    }
}
