<?php

namespace App\Repository;

use App\Entity\ClimbingRoute;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\ORM\Tools\Pagination\Paginator;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<ClimbingRoute>
 */
class ClimbingRouteRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, ClimbingRoute::class);
    }

    /**
     * @return ClimbingRoute[]
     */
    public function findAllWithLocation(): array
    {
        return $this->createQueryBuilder('r')
            ->addSelect('l')
            ->join('r.location', 'l')
            ->getQuery()
            ->getResult();
    }

    /**
     * @param string[] $difficulties
     *
     * @return ClimbingRoute[]
     */
    public function findFiltered(
        ?string $name,
        ?string $routeType,
        array $difficulties,
        ?string $region = null,
        ?int $locationId = null,
        ?string $sort = null,
        ?int $limit = null,
    ): array {
        $qb = $this->filteredQuery($name, $routeType, $difficulties, $region, $locationId, $sort);
        if (null !== $limit) {
            $qb->setMaxResults($limit);
        }

        return $qb->getQuery()->getResult();
    }

    /**
     * One page of the filtered list plus the total count, both done by the database -
     * loading every matching route just to slice one page out of it doesn't scale.
     *
     * @param string[] $difficulties
     *
     * @return array{routes: ClimbingRoute[], total: int}
     */
    public function findFilteredPage(
        ?string $name,
        ?string $routeType,
        array $difficulties,
        ?string $region,
        ?int $locationId,
        ?string $sort,
        int $page,
        int $perPage,
    ): array {
        $qb = $this->filteredQuery($name, $routeType, $difficulties, $region, $locationId, $sort)
            ->setFirstResult(($page - 1) * $perPage)
            ->setMaxResults($perPage);
        $paginator = new Paginator($qb->getQuery());

        return ['routes' => iterator_to_array($paginator), 'total' => \count($paginator)];
    }

    /**
     * @param string[] $difficulties
     */
    private function filteredQuery(
        ?string $name,
        ?string $routeType,
        array $difficulties,
        ?string $region,
        ?int $locationId,
        ?string $sort,
    ): QueryBuilder {
        $qb = $this->createQueryBuilder('r')
            ->addSelect('l')
            ->join('r.location', 'l');

        if ($name) {
            $qb->andWhere('r.name LIKE :name OR l.name LIKE :name OR l.region LIKE :name')
               ->setParameter('name', '%'.$name.'%');
        }

        if ($routeType) {
            $qb->andWhere('r.routeType = :routeType')
               ->setParameter('routeType', $routeType);
        }

        if ($difficulties) {
            $qb->andWhere('r.difficulty IN (:difficulties)')
               ->setParameter('difficulties', $difficulties);
        }

        if ($region) {
            $qb->andWhere('l.region = :region')
               ->setParameter('region', $region);
        }

        if ($locationId) {
            $qb->andWhere('l.id = :locationId')
               ->setParameter('locationId', $locationId);
        }

        match ($sort) {
            'difficulty_asc' => $qb->orderBy('r.difficultyOrder', 'ASC'),
            'difficulty_desc' => $qb->orderBy('r.difficultyOrder', 'DESC'),
            'name_asc' => $qb->orderBy('r.name', 'ASC'),
            default => $qb->orderBy('r.rating', 'DESC'),
        };
        // Stable order across pages when the sort column has ties.
        $qb->addOrderBy('r.id', 'ASC');

        return $qb;
    }

    /**
     * Routes of the same type and similar difficulty, closest ones first.
     * Falls back to routes of the same type when difficulty data is missing.
     *
     * @return ClimbingRoute[]
     */
    public function findSimilar(ClimbingRoute $route, int $limit = 4): array
    {
        $qb = $this->createQueryBuilder('r')
            ->addSelect('l')
            ->join('r.location', 'l')
            ->andWhere('r.id != :id')
            ->andWhere('r.routeType = :routeType')
            ->setParameter('id', $route->getId())
            ->setParameter('routeType', $route->getRouteType()->value)
            ->setMaxResults($limit);

        $order = $route->getDifficultyOrder();

        if (null !== $order) {
            $qb->addSelect('ABS(r.difficultyOrder - :order) AS HIDDEN diffDistance')
                ->setParameter('order', $order)
                ->orderBy('diffDistance', 'ASC')
                ->addOrderBy('r.rating', 'DESC');
        } else {
            $qb->orderBy('r.rating', 'DESC');
        }

        return $qb->getQuery()->getResult();
    }
}
