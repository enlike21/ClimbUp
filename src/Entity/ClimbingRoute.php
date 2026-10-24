<?php

namespace App\Entity;

use App\Enum\RouteType;
use App\Repository\ClimbingRouteRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ClimbingRouteRepository::class)]
class ClimbingRoute
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(type: 'string', length: 20)]
    private string $routeType;

    #[ORM\Column(length: 255)]
    private ?string $difficulty = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $difficultyOrder = null;

    #[ORM\Column]
    private ?int $pitches = 1;

    #[ORM\Column]
    private ?int $length = 0;

    #[ORM\Column(type: 'float', nullable: true)]
    private ?float $rating = null;

    #[ORM\Column(length: 500, nullable: true)]
    private ?string $url = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $sector = null;

    #[ORM\ManyToOne(targetEntity: Location::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?Location $location = null;

    #[ORM\OneToMany(mappedBy: 'route', targetEntity: UserRoute::class, cascade: ['remove'], orphanRemoval: true)]
    private Collection $savedByUsers;

    public function __construct()
    {
        $this->savedByUsers = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(string $name): static
    {
        $this->name = $name;

        return $this;
    }

    public function getRouteType(): RouteType
    {
        return RouteType::from($this->routeType);
    }

    public function setRouteType(RouteType $routeType): self
    {
        $this->routeType = $routeType->value;

        return $this;
    }

    public function getDifficulty(): ?string
    {
        return $this->difficulty;
    }

    public function setDifficulty(string $difficulty): static
    {
        $this->difficulty = $difficulty;

        return $this;
    }

    public function getPitches(): ?int
    {
        return $this->pitches;
    }

    public function setPitches(int $pitches): static
    {
        $this->pitches = $pitches;

        return $this;
    }

    public function getLength(): ?int
    {
        return $this->length;
    }

    public function setLength(int $length): static
    {
        $this->length = $length;

        return $this;
    }

    public function getLocation(): ?Location
    {
        return $this->location;
    }

    public function setLocation(?Location $location): static
    {
        $this->location = $location;

        return $this;
    }

    public function getDifficultyOrder(): ?int
    {
        return $this->difficultyOrder;
    }

    public function setDifficultyOrder(?int $difficultyOrder): static
    {
        $this->difficultyOrder = $difficultyOrder;

        return $this;
    }

    public function getRating(): ?float
    {
        return $this->rating;
    }

    public function setRating(?float $rating): static
    {
        $this->rating = $rating;

        return $this;
    }

    public function getUrl(): ?string
    {
        return $this->url;
    }

    public function setUrl(?string $url): static
    {
        $this->url = $url;

        return $this;
    }

    public function getSector(): ?string
    {
        return $this->sector;
    }

    public function setSector(?string $sector): static
    {
        $this->sector = $sector;

        return $this;
    }

    // Métodos para la relación con UserRoute
    public function getSavedByUsers(): Collection
    {
        return $this->savedByUsers;
    }

    public function addSavedByUser(UserRoute $userRoute): self
    {
        if (!$this->savedByUsers->contains($userRoute)) {
            $this->savedByUsers->add($userRoute);
            $userRoute->setRoute($this);
        }

        return $this;
    }

    public function removeSavedByUser(UserRoute $userRoute): self
    {
        if ($this->savedByUsers->removeElement($userRoute)) {
            if ($userRoute->getRoute() === $this) {
                $userRoute->setRoute(null);
            }
        }

        return $this;
    }
}
