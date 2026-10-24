<?php

namespace App\Tests\Service\Game;

use App\Service\Game\ClimbSimulation;
use App\Service\Game\GameAchievements;
use App\Service\Game\GameRunValidator;
use App\Service\Game\InvalidGameRunException;
use PHPUnit\Framework\TestCase;

class GameRunValidatorTest extends TestCase
{
    private GameRunValidator $validator;

    protected function setUp(): void
    {
        $this->validator = new GameRunValidator();
    }

    /**
     * @return array<string, mixed>
     */
    private static function fixture(string $name): array
    {
        return json_decode((string) file_get_contents(__DIR__.'/../../fixtures/game/'.$name), true, 512, \JSON_THROW_ON_ERROR);
    }

    /**
     * @param array<string, mixed> $fixture
     *
     * @return array<string, mixed>
     */
    private static function payload(array $fixture, string $mode = 'free', ?string $day = null): array
    {
        return [
            'version' => ClimbSimulation::SIM_VERSION,
            'mode' => $mode,
            'seed' => $fixture['seed'],
            'day' => $day,
            'inputs' => $fixture['inputs'],
            'endTick' => $fixture['endTick'],
            'height' => $fixture['expected']['height'],
        ];
    }

    public function testGenuineFreeRunIsAccepted(): void
    {
        $fixture = self::fixture('run-42.json');
        $run = $this->validator->validate(self::payload($fixture), new \DateTimeImmutable('2026-10-23'));

        $this->assertSame($fixture['expected']['height'], $run->heightMeters());
        $this->assertFalse($run->isDaily());
        $this->assertSame($fixture['achievements'], GameAchievements::forRun($run->sim, false));
    }

    public function testInflatedHeightIsRejected(): void
    {
        $payload = self::payload(self::fixture('run-42.json'));
        $payload['height'] = 1200;

        $this->expectException(InvalidGameRunException::class);
        $this->validator->validate($payload, new \DateTimeImmutable('2026-10-23'));
    }

    public function testMadeUpRunWithNoInputsIsRejected(): void
    {
        $this->expectException(InvalidGameRunException::class);
        $this->validator->validate([
            'version' => ClimbSimulation::SIM_VERSION,
            'mode' => 'free',
            'seed' => 5,
            'inputs' => [],
            'endTick' => 100,
            'height' => 900,
        ], new \DateTimeImmutable('2026-10-23'));
    }

    public function testOutdatedClientGetsAConflict(): void
    {
        $payload = self::payload(self::fixture('run-1.json'));
        $payload['version'] = ClimbSimulation::SIM_VERSION + 1;

        try {
            $this->validator->validate($payload, new \DateTimeImmutable('2026-10-23'));
            $this->fail('Expected an outdated client to be rejected');
        } catch (InvalidGameRunException $e) {
            $this->assertSame(409, $e->getStatusCode());
        }
    }

    public function testMalformedInputIsRejected(): void
    {
        $payload = self::payload(self::fixture('run-1.json'));
        $payload['inputs'][3] = ['x', 10];

        $this->expectException(InvalidGameRunException::class);
        $this->validator->validate($payload, new \DateTimeImmutable('2026-10-23'));
    }

    public function testDailyRunOnTheRightDayIsAccepted(): void
    {
        $fixture = self::fixture('run-1789350723.json');
        $run = $this->validator->validate(self::payload($fixture, 'daily', '2026-10-23'), new \DateTimeImmutable('2026-10-23'));

        $this->assertTrue($run->isDaily());
        $this->assertContains('diario', GameAchievements::forRun($run->sim, true));
    }

    public function testDailyRunFromJustBeforeMidnightIsStillAccepted(): void
    {
        $fixture = self::fixture('run-1789350723.json');
        $run = $this->validator->validate(self::payload($fixture, 'daily', '2026-10-23'), new \DateTimeImmutable('2026-10-24'));

        $this->assertSame('2026-10-23', $run->day?->format('Y-m-d'));
    }

    public function testOldDailyRunIsRejected(): void
    {
        $fixture = self::fixture('run-1789350723.json');

        $this->expectException(InvalidGameRunException::class);
        $this->validator->validate(self::payload($fixture, 'daily', '2026-10-23'), new \DateTimeImmutable('2026-10-26'));
    }

    public function testDailyRunWithAnotherSeedIsRejected(): void
    {
        $fixture = self::fixture('run-42.json');

        $this->expectException(InvalidGameRunException::class);
        $this->validator->validate(self::payload($fixture, 'daily', '2026-10-23'), new \DateTimeImmutable('2026-10-23'));
    }

    public function testSkinsNeedTheirAchievement(): void
    {
        $this->assertTrue(GameAchievements::isSkinUnlocked('clasico', []));
        $this->assertFalse(GameAchievements::isSkinUnlocked('cumbre', ['denali']));
        $this->assertTrue(GameAchievements::isSkinUnlocked('glaciar', ['denali']));
        $this->assertFalse(GameAchievements::isSkinUnlocked('no-existe', ['denali']));
    }
}
