<?php

namespace App\Entity;

use App\Repository\GameScoreRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: GameScoreRepository::class)]
#[ORM\Table(name: 'game_score')]
class GameScore
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, unique: true, onDelete: 'CASCADE')]
    private ?UserInterface $user = null;

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
