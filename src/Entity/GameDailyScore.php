<?php

namespace App\Entity;

use App\Repository\GameDailyScoreRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * Best height per player on one day's Al Filo daily challenge (the same seeded mountain for
 * everyone that day).
 */
#[ORM\Entity(repositoryClass: GameDailyScoreRepository::class)]
#[ORM\Table(name: 'game_daily_score')]
#[ORM\UniqueConstraint(name: 'UNIQ_GAME_DAILY_USER_DAY', columns: ['user_id', 'day'])]
class GameDailyScore
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?UserInterface $user = null;

    #[ORM\Column(type: 'date_immutable')]
    private ?\DateTimeImmutable $day = null;

    #[ORM\Column(type: 'integer')]
    private int $heightMeters = 0;

    #[ORM\Column(type: 'datetime_immutable')]
    private ?\DateTimeImmutable $achievedAt = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getUser(): ?UserInterface
    {
        return $this->user;
    }

    public function setUser(?UserInterface $user): self
    {
        $this->user = $user;

        return $this;
    }

    public function getDay(): ?\DateTimeImmutable
    {
        return $this->day;
    }

    public function setDay(\DateTimeImmutable $day): self
    {
        $this->day = $day;

        return $this;
    }

    public function getHeightMeters(): int
    {
        return $this->heightMeters;
    }

    public function setHeightMeters(int $heightMeters): self
    {
        $this->heightMeters = $heightMeters;

        return $this;
    }

    public function getAchievedAt(): ?\DateTimeImmutable
    {
        return $this->achievedAt;
    }

    public function setAchievedAt(\DateTimeImmutable $achievedAt): self
    {
        $this->achievedAt = $achievedAt;

        return $this;
    }
}
