<?php

namespace App\Entity;

use App\Repository\UserRouteRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity(repositoryClass: UserRouteRepository::class)]
#[ORM\Index(columns: ['user_id'], name: 'idx_user_route_user')]
#[ORM\Index(columns: ['route_id'], name: 'idx_user_route_route')]
class UserRoute
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: User::class, inversedBy: 'savedRoutes')]
    #[ORM\JoinColumn(nullable: false)]
    private ?UserInterface $user = null;

    #[ORM\ManyToOne(targetEntity: ClimbingRoute::class, inversedBy: 'savedByUsers')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?ClimbingRoute $route = null;

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
}
