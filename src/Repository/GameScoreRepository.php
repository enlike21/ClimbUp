<?php

namespace App\Repository;

use App\Entity\GameScore;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * @extends ServiceEntityRepository<GameScore>
 */
class GameScoreRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, GameScore::class);
    }

    /**
     * @return GameScore[]
     */
    public function findTop(int $limit = 10): array
    {
        return $this->createQueryBuilder('s')
            ->addSelect('u')
            ->join('s.user', 'u')
            ->orderBy('s.heightMeters', 'DESC')
            ->addOrderBy('s.achievedAt', 'ASC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    public function findRank(UserInterface $user): ?int
    {
        $score = $this->findOneBy(['user' => $user]);
        if (null === $score) {
            return null;
        }

        $better = $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->where('s.heightMeters > :height')
            ->setParameter('height', $score->getHeightMeters())
            ->getQuery()
            ->getSingleScalarResult();

        return (int) $better + 1;
    }
}
