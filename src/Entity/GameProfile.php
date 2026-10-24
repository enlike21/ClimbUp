<?php

namespace App\Entity;

use App\Repository\GameProfileRepository;
use App\Service\Game\GameAchievements;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * A player's Al Filo progress that isn't a score: unlocked achievements, chosen climber skin
 * and how many validated runs they've finished.
 */
#[ORM\Entity(repositoryClass: GameProfileRepository::class)]
#[ORM\Table(name: 'game_profile')]
class GameProfile
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: 'integer')]
    private ?int $id = null;

    #[ORM\OneToOne(targetEntity: User::class)]
    #[ORM\JoinColumn(nullable: false, unique: true, onDelete: 'CASCADE')]
    private ?UserInterface $user = null;

    /** @var list<string> */
    #[ORM\Column(type: 'json')]
    private array $achievements = [];

    #[ORM\Column(type: 'string', length: 32)]
    private string $skin = GameAchievements::DEFAULT_SKIN;

    #[ORM\Column(type: 'integer')]
    private int $runs = 0;

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

    /**
     * @return list<string>
     */
    public function getAchievements(): array
    {
        return $this->achievements;
    }

    /**
     * Adds the given achievements and returns the ones that are new.
     *
     * @param list<string> $achievements
     *
     * @return list<string>
     */
    public function unlock(array $achievements): array
    {
        $new = array_values(array_diff($achievements, $this->achievements));
        $this->achievements = array_values(array_unique(array_merge($this->achievements, $new)));

        return $new;
    }

    public function getSkin(): string
    {
        return $this->skin;
    }

    public function setSkin(string $skin): self
    {
        $this->skin = $skin;

        return $this;
    }

    public function getRuns(): int
    {
        return $this->runs;
    }

    public function addRun(): self
    {
        ++$this->runs;

        return $this;
    }
}
