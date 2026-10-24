<?php

namespace App\Tests\Service\Game;

use App\Service\Game\ClimbSimulation;
use App\Service\Game\Mulberry32;
use PHPUnit\Framework\TestCase;

/**
 * Parity with the browser: each fixture is a run played through public/js/game/sim.js
 * (tests/js/generate-game-fixtures.mjs). Replaying its inputs here must land on exactly the
 * same state - any drift means the server would reject (or accept) the wrong runs.
 */
class ClimbSimulationTest extends TestCase
{
    /**
     * @return iterable<string, array{array<string, mixed>}>
     */
    public static function fixtures(): iterable
    {
        foreach (glob(__DIR__.'/../../fixtures/game/run-*.json') ?: [] as $file) {
            yield basename($file) => [json_decode((string) file_get_contents($file), true, 512, \JSON_THROW_ON_ERROR)];
        }
    }

    /**
     * @param array<string, mixed> $fixture
     *
     * @dataProvider fixtures
     */
    public function testReplayMatchesTheJavascriptSimulation(array $fixture): void
    {
        $this->assertSame(ClimbSimulation::SIM_VERSION, $fixture['simVersion'], 'Fixture was recorded with another simulation version - regenerate it.');

        $sim = ClimbSimulation::replay($fixture['seed'], $fixture['inputs'], $fixture['endTick']);
        $this->assertNotNull($sim, 'A genuine run must replay as valid');

        $expected = $fixture['expected'];
        $this->assertSame($expected['status'], $sim->status);
        $this->assertSame($expected['tick'], $sim->tick);
        $this->assertSame($expected['height'], $sim->heightMeters());
        $this->assertSame($expected['points'], $sim->points);
        $this->assertSame($expected['stats'], $sim->stats);
        $this->assertSame((float) $expected['peakY'], $sim->peakY);
        $this->assertSame((float) $expected['camFocus'], $sim->camFocus);
        $this->assertSame((float) $expected['player']['x'], $sim->player['x']);
        $this->assertSame((float) $expected['player']['y'], $sim->player['y']);
        $this->assertSame((float) $expected['player']['stamina'], $sim->player['stamina']);
        $this->assertSame($expected['ledges'], \count($sim->ledges));
        $this->assertSame($expected['rocks'], \count($sim->rocks));
        $this->assertSame($expected['pickups'], \count($sim->pickups));
    }

    /**
     * @param array<string, mixed> $fixture
     *
     * @dataProvider fixtures
     */
    public function testTamperedInputsAreRejectedOrChangeTheOutcome(array $fixture): void
    {
        $inputs = $fixture['inputs'];
        // Shift every input one tick later: either the replay breaks, or it's a different run.
        foreach ($inputs as $i => $input) {
            $inputs[$i][1] = $input[1] + 1;
        }
        $sim = ClimbSimulation::replay($fixture['seed'], $inputs, $fixture['endTick'] + 1);

        $this->assertTrue(null === $sim || $sim->tick !== $fixture['expected']['tick'] || $sim->player['y'] !== (float) $fixture['expected']['player']['y']);
    }

    public function testRunThatNeverEndsIsRejected(): void
    {
        // Standing still on the ground for a few seconds never ends the run.
        $this->assertNull(ClimbSimulation::replay(7, [], 600));
    }

    public function testOutOfOrderInputsAreRejected(): void
    {
        $this->assertNull(ClimbSimulation::replay(7, [['c', 50], ['r', 40, 0]], 10000));
    }

    public function testRandomGeneratorMatchesJavascriptMulberry32(): void
    {
        // First values of mulberry32(42) as produced by sim.js's createRng(42).
        $rng = new Mulberry32(42);
        $this->assertSame(0.6011037519201636, $rng->next());
        $this->assertSame(0.44829055899754167, $rng->next());
        $this->assertSame(0.8524657934904099, $rng->next());
    }

    public function testDailySeedMatchesJavascript(): void
    {
        $this->assertSame(1789350723, ClimbSimulation::dailySeed('2026-10-23'));
    }
}
