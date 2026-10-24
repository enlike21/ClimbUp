<?php

namespace App\Service\Game;

/**
 * A run the server has replayed and verified. $day is set for daily-challenge runs.
 */
final class ValidatedGameRun
{
    public function __construct(
        public readonly ClimbSimulation $sim,
        public readonly ?\DateTimeImmutable $day,
    ) {
    }

    public function isDaily(): bool
    {
        return null !== $this->day;
    }

    public function heightMeters(): int
    {
        return $this->sim->heightMeters();
    }
}
