<?php

namespace App\Tests\Enum;

use App\Enum\AttemptType;
use PHPUnit\Framework\TestCase;

class AttemptTypeTest extends TestCase
{
    public function testEveryCaseHasALabelAndIcon(): void
    {
        foreach (AttemptType::cases() as $case) {
            $this->assertNotSame('', $case->label());
            $this->assertNotSame('', $case->icon());
        }
    }

    public function testTryFromInvalidValueReturnsNull(): void
    {
        $this->assertNull(AttemptType::tryFrom('not-a-real-style'));
    }

    public function testFromKnownValue(): void
    {
        $this->assertSame(AttemptType::ONSIGHT, AttemptType::from('onsight'));
    }
}
