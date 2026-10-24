<?php

namespace App\Tests\Service;

use App\Service\GradeConversionService;
use PHPUnit\Framework\TestCase;

class GradeConversionServiceTest extends TestCase
{
    private GradeConversionService $service;

    protected function setUp(): void
    {
        $this->service = new GradeConversionService();
    }

    /**
     * @dataProvider ydsToFrenchProvider
     */
    public function testConvertsYdsToFrench(string $yds, string $expectedFrench): void
    {
        $this->assertSame($expectedFrench, $this->service->convert($yds));
    }

    public static function ydsToFrenchProvider(): array
    {
        return [
            'basic grade' => ['5.9', '6a'],
            'lettered grade' => ['5.10a', '6a+'],
            'top of scale' => ['5.15c', '9c+'],
            'plus modifier' => ['5.9+', '6a+'],
            'minus modifier' => ['5.8-', '5'],
            'bare grade without letter' => ['5.10', '6a+'],
            'aid grade suffix stripped' => ['5.9 A2', '6a'],
            'risk modifier stripped' => ['5.10a R', '6a+'],
            'v-scale suffix stripped' => ['5.9+ V4', '6a+'],
            'split grade takes first' => ['5.10a/b', '6a+'],
            'third class' => ['3rd', 'III'],
            'fourth class' => ['4th', 'IV'],
            'fifth class' => ['5th', 'V'],
            'easy fifth' => ['Easy 5th', 'V'],
        ];
    }

    public function testAlreadyFrenchGradePassesThrough(): void
    {
        $this->assertSame('7a+', $this->service->convert('7a+'));
    }

    public function testAlreadyBoulderGradePassesThrough(): void
    {
        $this->assertSame('V4', $this->service->convert('V4'));
    }

    public function testUnknownGradeFallsBackToOriginal(): void
    {
        $this->assertSame('unknown-grade', $this->service->convert('unknown-grade'));
    }

    public function testGetOrderReturnsRankForKnownGrade(): void
    {
        $this->assertSame(12, $this->service->getOrder('6a'));
    }

    public function testGetOrderReturnsNullForUnknownGrade(): void
    {
        $this->assertNull($this->service->getOrder('not-a-grade'));
    }

    public function testGetOrderIsMonotonicallyIncreasingAcrossDifficulty(): void
    {
        $this->assertLessThan(
            $this->service->getOrder('7a'),
            $this->service->getOrder('6a'),
        );
    }
}
