<?php

namespace App\Repository;

use App\Entity\Location;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Location>
 */
class LocationRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Location::class);
    }

    /**
     * @return string[]
     */
    public function findDistinctRegions(): array
    {
        $result = $this->createQueryBuilder('l')
            ->select('DISTINCT l.region')
            ->where('l.region IS NOT NULL')
            ->orderBy('l.region', 'ASC')
            ->getQuery()
            ->getSingleColumnResult();

        return array_filter($result);
    }

    /**
     * @return Location[]
     */
    public function findAllSorted(): array
    {
        return $this->createQueryBuilder('l')
            ->orderBy('l.name', 'ASC')
            ->getQuery()
            ->getResult();
    }

    public function findAllWithRouteCounts(): array
    {
        $conn = $this->getEntityManager()->getConnection();

        return $conn->fetchAllAssociative("
            SELECT l.id, l.name, l.latitude, l.longitude, l.region,
                   COUNT(r.id) as route_count,
                   SUM(CASE WHEN r.route_type = 'Sport' THEN 1 ELSE 0 END) as sport_count,
                   SUM(CASE WHEN r.route_type = 'Trad' THEN 1 ELSE 0 END) as trad_count,
                   SUM(CASE WHEN r.route_type = 'Boulder' THEN 1 ELSE 0 END) as boulder_count,
                   SUM(CASE WHEN r.route_type NOT IN ('Sport','Trad','Boulder') THEN 1 ELSE 0 END) as other_count
            FROM location l
            LEFT JOIN climbing_route r ON r.location_id = l.id
            GROUP BY l.id, l.name, l.latitude, l.longitude, l.region
        ");
    }
}
