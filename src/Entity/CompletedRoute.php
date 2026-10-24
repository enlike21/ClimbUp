<?php

namespace App\Entity;

use App\Enum\AttemptType;
use App\Repository\CompletedRouteRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: CompletedRouteRepository::class)]
#[ORM\Index(columns: ['user_id'], name: 'idx_completed_route_user')]
#[ORM\Index(columns: ['route_id'], name: 'idx_completed_route_route')]
class CompletedRoute
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?UserInterface $user = null;

    #[ORM\ManyToOne(targetEntity: ClimbingRoute::class, inversedBy: 'savedByUsers')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?ClimbingRoute $route = null;

    #[ORM\Column(type: 'datetime')]
    private ?\DateTimeInterface $completedAt = null;

    #[ORM\Column(type: 'string', length: 20, nullable: true)]
    private ?string $attemptType = null;

    #[ORM\Column(type: 'smallint', nullable: true)]
    private ?int $personalRating = null;

    #[ORM\Column(type: 'string', length: 500, nullable: true)]
    private ?string $notes = null;

    public function __construct()
    {
        $this->completedAt = new \DateTime();
    }

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

    public function getRoute(): ?ClimbingRoute
    {
        return $this->route;
    }

    public function setRoute(?ClimbingRoute $route): self
    {
        $this->route = $route;

        return $this;
    }

    public function getCompletedAt(): ?\DateTimeInterface
    {
        return $this->completedAt;
    }

    public function setCompletedAt(\DateTimeInterface $completedAt): self
    {
        $this->completedAt = $completedAt;

        return $this;
    }

    public function getAttemptType(): ?AttemptType
    {
        return null !== $this->attemptType ? AttemptType::from($this->attemptType) : null;
    }

    public function setAttemptType(?AttemptType $attemptType): self
    {
        $this->attemptType = $attemptType?->value;

        return $this;
    }

    public function getPersonalRating(): ?int
    {
        return $this->personalRating;
    }

    public function setPersonalRating(?int $personalRating): self
    {
        $this->personalRating = $personalRating;

        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): self
    {
        $this->notes = $notes;

        return $this;
    }
}
