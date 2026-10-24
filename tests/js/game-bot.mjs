// A simple bot that plays Al Filo through the deterministic simulation: on each ledge it
// searches charge time x aim for a jump that lands on the next ledge up, then records the
// inputs exactly like the browser does. Used to generate the PHP parity fixtures and to
// smoke-test the simulation from the command line.
import * as S from '../../public/js/game/sim.js';

// Ballistic prediction with the exact same integration as the simulation (minus rocks).
function landsOn(sim, target, holdTicks, aimMilli) {
    const p = sim.player;
    const aim = aimMilli / 1000;
    const res = S.calcJumpVelocities(S.chargePower(holdTicks), aim, p.stamina);
    let x = p.x;
    let y = p.y;
    let vx = res.vx;
    let vy = res.vy;
    for (let i = 0; i < 400; i++) {
        const prevBottom = y + S.PLAYER_RADIUS;
        vy += S.GRAVITY * S.DT;
        x += vx * S.DT;
        y += vy * S.DT;
        if (x < S.PLAYER_RADIUS + 2 || x > S.WORLD_W - S.PLAYER_RADIUS - 2) {
            return false;
        }
        if (vy > 0) {
            const bottom = y + S.PLAYER_RADIUS;
            for (const l of sim.ledges) {
                if (Math.abs(x - l.x) <= l.width / 2 && prevBottom <= l.y && bottom >= l.y) {
                    return l === target ? Math.abs(x - l.x) : false;
                }
            }
        }
    }
    return false;
}

function planJump(sim) {
    const p = sim.player;
    const above = sim.ledges.filter((l) => l.y < p.y + S.PLAYER_RADIUS - 5).sort((a, b) => b.y - a.y);
    for (const target of above.slice(0, 2)) {
        let best = null;
        for (let hold = 1; hold <= S.MAX_CHARGE_TICKS; hold += 1) {
            for (let aim = -1000; aim <= 1000; aim += 50) {
                const off = landsOn(sim, target, hold, aim);
                if (off !== false && (best === null || off < best.off)) {
                    best = { hold, aim, off };
                }
            }
        }
        if (best) {
            return best;
        }
    }
    return null;
}

export function playBot(seed, maxTicks = 20 * 60 * S.TICK_RATE) {
    const sim = S.createSim(seed);
    const inputs = [];
    let plan = null;
    let releaseAt = -1;
    while (sim.status === 'playing' && sim.tick < maxTicks) {
        if (sim.player.onLedge && !sim.charging && sim.player.stamina > 70) {
            plan = planJump(sim);
            if (!plan) {
                plan = { hold: 40, aim: sim.player.x < S.WORLD_W / 2 ? 400 : -400 };
            }
            if (S.applyInput(sim, ['c', sim.tick])) {
                inputs.push(['c', sim.tick]);
                releaseAt = sim.tick + plan.hold;
            }
        } else if (sim.charging && sim.tick >= releaseAt) {
            if (S.applyInput(sim, ['r', sim.tick, plan.aim])) {
                inputs.push(['r', sim.tick, plan.aim]);
            }
        }
        S.step(sim);
        sim.events.length = 0;
    }
    return { sim, inputs };
}

export function snapshot(sim) {
    return {
        status: sim.status,
        tick: sim.tick,
        height: S.heightMeters(sim),
        points: sim.points,
        stats: sim.stats,
        player: { x: sim.player.x, y: sim.player.y, vx: sim.player.vx, vy: sim.player.vy, stamina: sim.player.stamina },
        peakY: sim.peakY,
        camFocus: sim.camFocus,
        ledges: sim.ledges.length,
        rocks: sim.rocks.length,
        pickups: sim.pickups.length,
    };
}

if (import.meta.url === `file://${process.argv[1]}`) {
    const seed = Number(process.argv[2] || 12345);
    const t0 = Date.now();
    const { sim, inputs } = playBot(seed);
    console.log(JSON.stringify(snapshot(sim)), 'inputs:', inputs.length, 'ms:', Date.now() - t0);
    const r = S.replay(seed, inputs, sim.tick);
    console.log('replay valid:', r.valid, 'same height:', S.heightMeters(r.sim) === S.heightMeters(sim), 'same y:', r.sim.player.y === sim.player.y);
}
