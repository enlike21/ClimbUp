<?php

namespace App\Tests\Entity;

use App\Entity\CompletedRoute;
use App\Enum\AttemptType;
use PHPUnit\Framework\TestCase;

class CompletedRouteTest extends TestCase
{
    public function testAttemptTypeRoundTripsThroughBackedEnum(): void
    {
        $completedRoute = new CompletedRoute();
        $completedRoute->setAttemptType(AttemptType::FLASH);

        $this->assertSame(AttemptType::FLASH, $completedRoute->getAttemptType());
        $this->assertSame('flash', $completedRoute->getAttemptType()->value);
    }

    public function testAttemptTypeIsNullByDefault(): void
    {
        $completedRoute = new CompletedRoute();

        $this->assertNull($completedRoute->getAttemptType());
    }

    public function testPersonalRatingAndNotesAreSettable(): void
    {
        $completedRoute = new CompletedRoute();
        $completedRoute->setPersonalRating(4);
        $completedRoute->setNotes('Roca un poco mojada pero buena escalada.');

        $this->assertSame(4, $completedRoute->getPersonalRating());
        $this->assertSame('Roca un poco mojada pero buena escalada.', $completedRoute->getNotes());
    }

    public function testCompletedAtIsSetOnConstruction(): void
    {
        $completedRoute = new CompletedRoute();

        $this->assertInstanceOf(\DateTimeInterface::class, $completedRoute->getCompletedAt());
    }
}
