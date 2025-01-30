<?php

namespace App\Entity;

use App\Repository\ClimbingRouteRepository;
use Doctrine\ORM\Mapping as ORM;
use App\Enum\RouteType;
use Doctrine\DBAL\Types\Types;

#[ORM\Entity(repositoryClass: ClimbingRouteRepository::class)]
class ClimbingRoute
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private ?string $name = null;

    #[ORM\Column(length: 255)]
    private ?string $url = null;

    #[ORM\Column(nullable: true)]
    private ?float $avg_stars = 0;

    #[ORM\Column(nullable: true)]
    private ?float $your_stars = 0;

    #[ORM\Column(type: "route_type_enum")]
    private ?RouteType $routeType = null;

    #[ORM\Column(length: 255)]
    private ?string $rating = null;

    #[ORM\Column]
    private ?int $pitches = 1;

    #[ORM\Column]
    private ?int $length = 0;

    #[ORM\ManyToOne(targetEntity: Location::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?Location $location = null;

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

    public function getUrl(): ?string
    {
        return $this->url;
    }

    public function setUrl(string $url): static
    {
        $this->url = $url;
        return $this;
    }

    public function getAvgStars(): ?float
    {
        return $this->avg_stars;
    }

    public function setAvgStars(?float $avg_stars): static
    {
        $this->avg_stars = $avg_stars;
        return $this;
    }

    public function getYourStars(): ?float
    {
        return $this->your_stars;
    }

    public function setYourStars(?float $your_stars): static
    {
        $this->your_stars = $your_stars;
        return $this;
    }

    public function getRouteType(): ?RouteType
    {
        return $this->routeType;
    }

    public function setRouteType(RouteType $routeType): self
    {
        $this->routeType = $routeType;
        return $this;
    }

    public function getRating(): ?string
    {
        return $this->rating;
    }

    public function setRating(string $rating): static
    {
        $this->rating = $rating;
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
}
