<?php

namespace App\Repository;

use App\Entity\GameDailyScore;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * @extends ServiceEntityRepository<GameDailyScore>
 */
class GameDailyScoreRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GameDailyScore::class);
    }

    /**
     * @return GameDailyScore[]
     */
    public function findTopForDay(\DateTimeImmutable $day, int $limit = 10): array
    {
        return $this->createQueryBuilder('s')
            ->addSelect('u')
            ->join('s.user', 'u')
            ->where('s.day = :day')
            ->setParameter('day', $day, 'date_immutable')
            ->orderBy('s.heightMeters', 'DESC')
            ->addOrderBy('s.achievedAt', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function findRankForDay(UserInterface $user, \DateTimeImmutable $day): ?int
    {
        $score = $this->findOneBy(['user' => $user, 'day' => $day]);
        if (null === $score) {
            return null;
        }

        $better = $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->where('s.day = :day')
            ->andWhere('s.heightMeters > :height')
            ->setParameter('day', $day, 'date_immutable')
            ->setParameter('height', $score->getHeightMeters())
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $better + 1;
    }
}
