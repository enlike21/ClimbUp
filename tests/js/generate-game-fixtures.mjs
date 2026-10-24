// Records a few bot runs with the JS simulation and writes them as fixtures for
// tests/Service/Game/ClimbSimulationTest.php, which replays them with the PHP port and
// expects bit-identical results. Re-run after any change to public/js/game/sim.js:
//
//   node tests/js/generate-game-fixtures.mjs
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as S from '../../public/js/game/sim.js';
import { playBot, snapshot } from './game-bot.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = join(here, '..', 'fixtures', 'game');
mkdirSync(outDir, { recursive: true });

const seeds = [1, 42, 20261023, S.dailySeed('2026-10-23')];
for (const seed of seeds) {
    const { sim, inputs } = playBot(seed);
    const fixture = {
        simVersion: S.SIM_VERSION,
        seed,
        dailySeedCheck: { day: '2026-10-23', seed: S.dailySeed('2026-10-23') },
        inputs,
        endTick: sim.tick,
        expected: snapshot(sim),
        achievements: S.achievementsForRun(S.runResult(sim, false)),
    };
    const file = join(outDir, `run-${seed}.json`);
    writeFileSync(file, JSON.stringify(fixture) + '\n');
    console.log(`${file}: ${fixture.expected.status} at ${fixture.expected.height} m, ${inputs.length} inputs, ${sim.tick} ticks`);
}
