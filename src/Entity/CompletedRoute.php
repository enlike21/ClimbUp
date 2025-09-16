<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use App\Repository\CompletedRouteRepository;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: CompletedRouteRepository::class)]
class CompletedRoute
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: "CASCADE")]
    private ?UserInterface $user = null;

    #[ORM\ManyToOne(targetEntity: ClimbingRoute::class, inversedBy: 'savedByUsers')]
    #[ORM\JoinColumn(nullable: false, onDelete: "CASCADE")]
    private ?ClimbingRoute $route = null;

    #[ORM\Column(type: 'datetime')]
    private ?\DateTimeInterface $completedAt = null;

    public function __construct()
    {
        $this->completedAt = new \DateTime();
    }

    public function getId(): ?int { return $this->id; }

    public function getUser(): ?UserInterface { return $this->user; }

    public function setUser(?UserInterface $user): self { $this->user = $user; return $this; }

    public function getRoute(): ?ClimbingRoute { return $this->route; }

    public function setRoute(?ClimbingRoute $route): self { $this->route = $route; return $this; }

    public function getCompletedAt(): ?\DateTimeInterface { return $this->completedAt; }

    public function setCompletedAt(\DateTimeInterface $completedAt): self { $this->completedAt = $completedAt; return $this; }
}
