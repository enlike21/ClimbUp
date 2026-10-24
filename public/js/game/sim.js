// ============================================
// AL FILO - DETERMINISTIC SIMULATION
// Everything that decides the outcome of a run lives here, and nothing else: no DOM, no
// Math.random, no wall-clock time, no Math.sin. The world advances in fixed ticks, every
// random number comes from a seeded generator, and the only outside input is a short list of
// [type, tick, aim] events. Same seed + same inputs = bit-for-bit the same run, which is what
// lets the server (src/Game/ClimbSimulator.php, a line-by-line port of this file) replay a
// submitted run and check the height instead of trusting the browser.
//
// If you change anything in here, change ClimbSimulator.php the same way, bump SIM_VERSION,
// and regenerate the parity fixtures (tests/js/generate-game-fixtures.mjs).
// ============================================

export const SIM_VERSION = 1;

export const TICK_RATE = 120;
export const DT = 1 / TICK_RATE;

// Fixed logical world, the same on every screen (like Jump King's fixed resolution): the
// renderer scales it to fit, so a phone and a wide monitor play the exact same mountain.
export const WORLD_W = 400;
export const VIEW_H = 520;

export const PIXELS_PER_METER = 26;
export const GRAVITY = 1500;
export const MAX_CHARGE_TICKS = 78; // 650 ms
export const MIN_JUMP_VY = 480;
export const MAX_JUMP_VY = 980;
export const MAX_JUMP_VX = 360;
export const MIN_POWER_FLOOR = 0.22; // never charge below this, so you can always at least hop
export const JUMP_COST_BASE = 8;
export const JUMP_COST_EXTRA = 14;

export const STAMINA_REGEN_PER_SEC = 22; // passive regen while resting on a ledge
export const STAMINA_PRECISION_BONUS = 10; // instant bonus for a centred landing
export const STAMINA_COMBO_BONUS = 2; // extra instant bonus per combo level, capped below
export const STAMINA_PICKUP_BONUS = 18;
export const MAX_CONCURRENT_PICKUPS = 2;

export const PLAYER_RADIUS = 16;
export const CAMERA_MARGIN_METERS = 11; // meters of "forgiveness" below your peak before death
export const CAMERA_TOP_FRACTION = 0.44; // where the player sits in the view, from the top
export const CAMERA_SMOOTH_SPEED = 10;
export const FALL_MARGIN = CAMERA_MARGIN_METERS * PIXELS_PER_METER + VIEW_H * 0.5;

export const COMBO_WINDOW_TICKS = 180; // 1.5 s
export const COMBO_MULTIPLIER_CAP = 5;
export const BASE_LANDING_POINTS = 10;
export const PRECISION_OFFCENTRE_RATIO = 0.22;
export const SUMMIT_METERS = 1200;

export const PICKUP_BOB_PERIOD = 316; // ticks, ~2.6 s
export const MAX_TICKS = 45 * 60 * TICK_RATE; // runs longer than 45 min aren't accepted

// The named sections of the climb. `color` is the rock colour, `cold` (0-1) how icy it is.
export const ZONES = [
    { name: 'Campamento Base', minM: 0, color: [169, 129, 95], cold: 0.05 },
    { name: 'Mont Blanc', minM: 150, color: [176, 178, 188], cold: 0.6 },
    { name: 'Cervino', minM: 320, color: [90, 84, 92], cold: 0.35 },
    { name: 'Aconcagua', minM: 500, color: [158, 97, 68], cold: 0.2 },
    { name: 'Denali', minM: 700, color: [128, 138, 152], cold: 0.75 },
    { name: 'K2', minM: 900, color: [68, 70, 84], cold: 0.55 },
    { name: 'Everest', minM: 1100, color: [214, 224, 236], cold: 0.95 },
    { name: 'Más allá de la cumbre', minM: 1400, color: [198, 168, 196], cold: 0.5 },
];

export const MOUNTAIN_TRANSITION_METERS = 60;

// ============================================
// NUMBERS
// ============================================
export function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

export function lerp(a, b, f) {
    return a + (b - a) * f;
}

// mulberry32 - tiny, fast, and only uses 32-bit integer operations, so the PHP port produces
// exactly the same sequence.
export function createRng(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function rand(rng, min, max) {
    return min + rng() * (max - min);
}

// FNV-1a over a string - the daily challenge seed for a 'YYYY-MM-DD' date.
export function hashString(str) {
    let h = 0x811C9DC5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h >>> 0;
}

export function dailySeed(day) {
    return hashString('al-filo:' + day);
}

export function metersFromY(y) {
    return Math.max(0, Math.floor(-y / PIXELS_PER_METER));
}

export function zoneIndexForMeters(meters) {
    let idx = 0;
    for (let i = 0; i < ZONES.length; i++) {
        if (meters >= ZONES[i].minM) {
            idx = i;
        } else {
            break;
        }
    }
    return idx;
}

// The rock colour/coldness at a given height: the current zone's theme, blending into the
// next zone's during the final stretch so the transition finishes exactly at the boundary.
export function zoneVisual(meters) {
    const idx = zoneIndexForMeters(meters);
    const zone = ZONES[idx];
    const next = ZONES[idx + 1];
    if (!next) {
        return { color: zone.color, cold: zone.cold };
    }
    const transitionStart = next.minM - MOUNTAIN_TRANSITION_METERS;
    if (meters < transitionStart) {
        return { color: zone.color, cold: zone.cold };
    }
    const t = clamp((meters - transitionStart) / MOUNTAIN_TRANSITION_METERS, 0, 1);
    return {
        color: [lerp(zone.color[0], next.color[0], t), lerp(zone.color[1], next.color[1], t), lerp(zone.color[2], next.color[2], t)],
        cold: lerp(zone.cold, next.cold, t),
    };
}

// Triangle wave in [-1, 1] - the pickups' bob, used for both the collision and the drawing.
export function pickupBob(tick, phase) {
    const p = (tick + phase) % PICKUP_BOB_PERIOD;
    const half = PICKUP_BOB_PERIOD / 2;
    return p < half ? (p / half) * 2 - 1 : 1 - ((p - half) / half) * 2;
}

// ============================================
// JUMP PHYSICS (shared by the real jump AND the trajectory preview)
// ============================================
export function chargePower(ticksHeld) {
    return Math.max(MIN_POWER_FLOOR, clamp(ticksHeld / MAX_CHARGE_TICKS, 0, 1));
}

export function calcJumpVelocities(power, aimDir, stamina) {
    const cost = JUMP_COST_BASE + JUMP_COST_EXTRA * power;
    const staminaRatio = clamp(stamina / cost, 0, 1);
    const effPower = Math.max(MIN_POWER_FLOOR * 0.55, power * Math.max(staminaRatio, 0.35));
    return {
        vx: aimDir * MAX_JUMP_VX * (0.5 + 0.5 * effPower),
        vy: -(MIN_JUMP_VY + (MAX_JUMP_VY - MIN_JUMP_VY) * effPower),
        cost: Math.min(cost, stamina),
    };
}

// ============================================
// WORLD
// ============================================
function makeLedge(sim, x, y, width) {
    const meters = metersFromY(y);
    const visual = zoneVisual(meters);
    sim.ledgeCounter++;
    return {
        id: sim.ledgeCounter,
        x: x,
        y: y,
        width: width,
        color: visual.color,
        cold: visual.cold,
        hasBolt: false,
        boltDx: 0,
        isGround: false,
        isSummit: false,
    };
}

function pushNextLedge(sim) {
    const prev = sim.ledges[sim.ledges.length - 1];
    if (prev.isSummit) {
        return;
    }
    const rng = sim.levelRng;
    const metersHere = metersFromY(prev.y);

    if (metersHere >= SUMMIT_METERS) {
        // The peak itself: one final, distinct platform.
        const summit = makeLedge(sim, WORLD_W / 2, prev.y - rand(rng, 70, 100), 90);
        summit.isSummit = true;
        sim.ledges.push(summit);
        return;
    }

    const progress = clamp(metersHere / 260, 0, 1); // difficulty ramp - gaps/widths/offsets only

    const gap = rand(rng, 70, 105) + progress * rand(rng, 20, 95);
    let width = clamp(rand(rng, 70, 110) - progress * 35, 42, 110);
    let maxOffset = 60 + progress * 170;

    // In the final stretch before the summit, narrow and centre the route.
    const summitPull = clamp((metersHere - (SUMMIT_METERS - 220)) / 220, 0, 1);
    width = lerp(width, 85, summitPull * 0.4);
    maxOffset = lerp(maxOffset, 50, summitPull);

    const minX = width / 2 + 10;
    const maxX = WORLD_W - width / 2 - 10;
    const centre = WORLD_W / 2;

    let x = prev.x + rand(rng, -maxOffset, maxOffset);
    x = lerp(x, centre, summitPull * 0.5);
    x = clamp(x, minX, maxX);

    const ledge = makeLedge(sim, x, prev.y - gap, width);
    ledge.hasBolt = rng() < 0.4 && width > 55;
    ledge.boltDx = (rng() < 0.5 ? -1 : 1) * (width / 2 - 14);
    sim.ledges.push(ledge);
}

export function viewTop(sim) {
    return sim.camFocus - VIEW_H * CAMERA_TOP_FRACTION;
}

export function viewBottom(sim) {
    return sim.camFocus + VIEW_H * (1 - CAMERA_TOP_FRACTION);
}

export function fallLimitY(sim) {
    return sim.peakY + FALL_MARGIN;
}

function ensureLedgesAhead(sim) {
    const limit = viewTop(sim) - 400;
    let guard = 0;
    while (guard < 200) {
        const top = sim.ledges[sim.ledges.length - 1];
        if (top.isSummit || top.y <= limit) {
            break;
        }
        pushNextLedge(sim);
        guard++;
    }
    // Ledges far below the death line can never be landed on again - drop them, so the
    // landing check (and the server's replay) never has to walk the whole mountain.
    const pruneBelow = fallLimitY(sim) + 400;
    while (sim.ledges.length > 1 && sim.ledges[0].y > pruneBelow) {
        sim.ledges.shift();
    }
}

export function createSim(seed) {
    const sim = {
        seed: seed >>> 0,
        levelRng: createRng(seed),
        eventRng: createRng((seed ^ 0x9E3779B9) >>> 0),
        tick: 0,
        ledgeCounter: 0,
        ledges: [],
        rocks: [],
        pickups: [],
        player: null,
        peakY: 0,
        camFocus: 0,
        prevX: 0,
        prevY: 0,
        prevCam: 0,
        charging: false,
        chargeTick: 0,
        lastRockTick: 4 * TICK_RATE, // no rocks for the first few seconds
        nextPickupTick: 0,
        comboChain: 0,
        lastLandingTick: -1,
        lastLandedLedgeId: 0,
        points: 0,
        status: 'playing', // playing | dead | won
        stats: { jumps: 0, pickups: 0, maxCombo: 0, precise: 0, rocksHit: 0 },
        events: [],
    };

    const ground = makeLedge(sim, WORLD_W / 2, 0, WORLD_W + 40);
    ground.isGround = true;
    sim.ledges.push(ground);

    sim.player = { x: ground.x, y: ground.y - PLAYER_RADIUS, vx: 0, vy: 0, onLedge: true, stamina: 100, facing: 1 };
    sim.peakY = sim.player.y;
    sim.camFocus = sim.player.y;
    sim.prevX = sim.player.x;
    sim.prevY = sim.player.y;
    sim.prevCam = sim.camFocus;
    sim.nextPickupTick = 3 * TICK_RATE + Math.floor(rand(sim.eventRng, 5800, 8800) * TICK_RATE / 1000);

    ensureLedgesAhead(sim);
    return sim;
}

export function heightMeters(sim) {
    return metersFromY(sim.peakY);
}

// ============================================
// INPUT - only ever applied at the start of a tick; returns whether it was accepted, so the
// browser records exactly the inputs the simulation acted on.
// ============================================
export function beginCharge(sim) {
    if (sim.status !== 'playing' || sim.charging || !sim.player.onLedge) {
        return false;
    }
    sim.charging = true;
    sim.chargeTick = sim.tick;
    return true;
}

export function currentChargePower(sim) {
    return chargePower(sim.tick - sim.chargeTick);
}

export function releaseCharge(sim, aimMilli) {
    if (sim.status !== 'playing' || !sim.charging) {
        return false;
    }
    sim.charging = false;
    const p = sim.player;
    if (!p.onLedge) {
        return true; // knocked off mid-charge by a rock - the charge just fizzles
    }
    // The browser already sends a whole number; truncating (not rounding) matches PHP's (int)
    // cast exactly, where Math.round and PHP's round() disagree on negative halves.
    const aim = clamp(Math.trunc(aimMilli), -1000, 1000) / 1000;
    const res = calcJumpVelocities(currentChargePower(sim), aim, p.stamina);
    p.stamina = clamp(p.stamina - res.cost, 0, 100);
    p.vy = res.vy;
    p.vx = res.vx;
    p.onLedge = false;
    if (Math.abs(aim) > 0.1) {
        p.facing = aim > 0 ? 1 : -1;
    }
    sim.stats.jumps++;
    sim.events.push({ type: 'jump' });
    return true;
}

export function applyInput(sim, input) {
    if (input[0] === 'c') {
        return beginCharge(sim);
    }
    if (input[0] === 'r') {
        return releaseCharge(sim, input[2] || 0);
    }
    return false;
}

// ============================================
// STEP
// ============================================
function registerComboLanding(sim, ledge) {
    // Bouncing back onto the same ledge is not progress - it resets the chain.
    const isRepeat = ledge.id === sim.lastLandedLedgeId;
    sim.lastLandedLedgeId = ledge.id;
    if (!isRepeat && sim.lastLandingTick >= 0 && sim.tick - sim.lastLandingTick < COMBO_WINDOW_TICKS) {
        sim.comboChain++;
    } else {
        sim.comboChain = 1;
    }
    sim.lastLandingTick = sim.tick;
    sim.stats.maxCombo = Math.max(sim.stats.maxCombo, sim.comboChain);

    const multiplier = Math.min(sim.comboChain, COMBO_MULTIPLIER_CAP);
    sim.points += BASE_LANDING_POINTS * multiplier;
    if (sim.comboChain < 2) {
        return;
    }
    sim.player.stamina = clamp(sim.player.stamina + STAMINA_COMBO_BONUS * Math.min(sim.comboChain - 1, 4), 0, 100);
    sim.events.push({ type: 'combo', chain: sim.comboChain, multiplier: multiplier });
}

function registerPrecisionLanding(sim, ledge) {
    const offCentre = Math.abs(sim.player.x - ledge.x) / (ledge.width / 2);
    if (offCentre >= PRECISION_OFFCENTRE_RATIO || ledge.width >= 95) {
        return;
    }
    sim.player.stamina = clamp(sim.player.stamina + STAMINA_PRECISION_BONUS, 0, 100);
    sim.stats.precise++;
    sim.events.push({ type: 'precise', bonus: STAMINA_PRECISION_BONUS });
}

function landOn(sim, ledge, impactSpeed) {
    const p = sim.player;
    p.y = ledge.y - PLAYER_RADIUS;
    p.vy = 0;
    p.vx = 0;
    p.onLedge = true;
    sim.events.push({ type: 'land', impact: clamp(impactSpeed / 900, 0, 1), x: p.x, y: p.y + PLAYER_RADIUS });
    if (ledge.isSummit) {
        sim.status = 'won';
        sim.events.push({ type: 'won' });
        return;
    }
    registerComboLanding(sim, ledge);
    registerPrecisionLanding(sim, ledge);
}

// Swept check: did the player's feet cross a ledge's surface this tick?
function checkLedgeLanding(sim, prevBottom) {
    const p = sim.player;
    if (p.vy <= 0) {
        return;
    }
    const newBottom = p.y + PLAYER_RADIUS;
    for (let i = 0; i < sim.ledges.length; i++) {
        const ledge = sim.ledges[i];
        const withinX = Math.abs(p.x - ledge.x) <= ledge.width / 2;
        const crossing = prevBottom <= ledge.y && newBottom >= ledge.y;
        if (withinX && crossing) {
            landOn(sim, ledge, p.vy);
            return;
        }
    }
}

function handleWallBounce(sim) {
    const p = sim.player;
    const minX = PLAYER_RADIUS + 2;
    const maxX = WORLD_W - PLAYER_RADIUS - 2;
    if (p.x >= minX && p.x <= maxX) {
        return;
    }
    p.x = clamp(p.x, minX, maxX);
    const impact = clamp(Math.abs(p.vx) / MAX_JUMP_VX, 0, 1);
    p.vx = -p.vx * 0.55;
    sim.events.push({ type: 'wall', impact: impact, x: p.x, y: p.y });
}

function updateAirborne(sim) {
    const p = sim.player;
    const prevBottom = p.y + PLAYER_RADIUS;
    p.vy += GRAVITY * DT;
    p.x += p.vx * DT;
    p.y += p.vy * DT;
    handleWallBounce(sim);
    checkLedgeLanding(sim, prevBottom);
    sim.peakY = Math.min(sim.peakY, p.y);
}

function maybeSpawnRock(sim) {
    const meters = metersFromY(sim.player.y);
    const progress = clamp(meters / 180, 0, 1);
    const interval = (5200 - progress * 3200) * TICK_RATE / 1000; // more frequent higher up
    if (sim.tick - sim.lastRockTick < interval || meters < 25) {
        return;
    }
    const rng = sim.eventRng;
    sim.lastRockTick = sim.tick;
    sim.rocks.push({
        x: rand(rng, 20, WORLD_W - 20),
        y: viewTop(sim) - 60,
        vy: rand(rng, 140, 220),
        r: rand(rng, 8, 14),
        spin: rand(rng, -3, 3),
        rot: rand(rng, 0, 6.283185307179586),
    });
}

function updateRocks(sim) {
    maybeSpawnRock(sim);
    const p = sim.player;
    const bottom = viewBottom(sim);
    for (let i = sim.rocks.length - 1; i >= 0; i--) {
        const rock = sim.rocks[i];
        rock.y += rock.vy * DT;
        rock.rot += rock.spin * DT;
        if (rock.y > bottom + 200) {
            sim.rocks.splice(i, 1);
            continue;
        }
        const dx = rock.x - p.x;
        const dy = rock.y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < rock.r + PLAYER_RADIUS - 4) {
            sim.rocks.splice(i, 1);
            p.onLedge = false;
            p.vy = Math.min(p.vy, 0) + 180;
            p.vx += dx > 0 ? -140 : 140;
            sim.stats.rocksHit++;
            sim.events.push({ type: 'rock', x: p.x, y: p.y });
        }
    }
}

// Anchored to a real pair of consecutive ledges just above the view, so a pickup is always
// somewhere a jump can actually reach.
function maybeSpawnPickup(sim) {
    if (sim.tick < sim.nextPickupTick || metersFromY(sim.player.y) < 12 || sim.pickups.length >= MAX_CONCURRENT_PICKUPS) {
        return;
    }
    const top = viewTop(sim);
    const bandLow = top + 50;
    const bandHigh = top - 280;
    const candidates = [];
    for (let i = 0; i < sim.ledges.length - 1; i++) {
        const a = sim.ledges[i];
        const b = sim.ledges[i + 1];
        if (a.isSummit || b.isSummit) {
            continue;
        }
        const mid = (a.y + b.y) / 2;
        if (mid <= bandLow && mid >= bandHigh) {
            candidates.push(i);
        }
    }
    if (candidates.length === 0) {
        return;
    }
    const rng = sim.eventRng;
    sim.nextPickupTick = sim.tick + Math.floor(rand(rng, 5800, 8800) * TICK_RATE / 1000);
    const idx = candidates[Math.floor(rand(rng, 0, candidates.length))];
    const a2 = sim.ledges[idx];
    const b2 = sim.ledges[idx + 1];
    const t = rand(rng, 0.35, 0.65);
    sim.pickups.push({
        x: clamp(lerp(a2.x, b2.x, t) + rand(rng, -14, 14), 24, WORLD_W - 24),
        y: lerp(a2.y, b2.y, t) - rand(rng, 10, 30),
        phase: Math.floor(rand(rng, 0, PICKUP_BOB_PERIOD)),
    });
}

function updatePickups(sim) {
    maybeSpawnPickup(sim);
    const p = sim.player;
    const bottom = viewBottom(sim);
    for (let i = sim.pickups.length - 1; i >= 0; i--) {
        const pk = sim.pickups[i];
        if (pk.y > bottom + 200) {
            sim.pickups.splice(i, 1);
            continue;
        }
        const dx = pk.x - p.x;
        const dy = (pk.y + pickupBob(sim.tick, pk.phase) * 6) - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < 20) {
            sim.pickups.splice(i, 1);
            p.stamina = clamp(p.stamina + STAMINA_PICKUP_BONUS, 0, 100);
            sim.stats.pickups++;
            sim.events.push({ type: 'pickup', x: pk.x, y: pk.y });
        }
    }
}

export function step(sim) {
    if (sim.status !== 'playing') {
        return;
    }
    const p = sim.player;
    sim.prevX = p.x;
    sim.prevY = p.y;
    sim.prevCam = sim.camFocus;

    if (p.onLedge) {
        if (!sim.charging && p.stamina < 100) {
            p.stamina = clamp(p.stamina + STAMINA_REGEN_PER_SEC * DT, 0, 100);
        }
    } else {
        updateAirborne(sim);
    }

    if (sim.status === 'playing') {
        sim.camFocus += (p.y - sim.camFocus) * Math.min(1, DT * CAMERA_SMOOTH_SPEED);
        updateRocks(sim);
        updatePickups(sim);
        ensureLedgesAhead(sim);
        if (p.y > fallLimitY(sim)) {
            sim.status = 'dead';
            sim.events.push({ type: 'dead' });
        }
    }
    sim.tick++;
}

// ============================================
// REPLAY - what the server does: run the inputs from a fresh seed until the run ends.
// ============================================
export function replay(seed, inputs, endTick) {
    const sim = createSim(seed);
    let next = 0;
    const limit = Math.min(endTick, MAX_TICKS);
    while (sim.status === 'playing' && sim.tick <= limit) {
        while (next < inputs.length && inputs[next][1] === sim.tick) {
            if (!applyInput(sim, inputs[next])) {
                return { valid: false, sim: sim };
            }
            next++;
        }
        if (next < inputs.length && inputs[next][1] < sim.tick) {
            return { valid: false, sim: sim };
        }
        step(sim);
        sim.events.length = 0;
    }
    return { valid: next === inputs.length && sim.status !== 'playing', sim: sim };
}

// ============================================
// ACHIEVEMENTS - computed from a finished run's stats, identically on the server.
// ============================================
export const ACHIEVEMENTS = [
    { id: 'primeros-pasos', name: 'Primeros pasos', desc: 'Sube 50 m.', minM: 50 },
    { id: 'mont-blanc', name: 'Mont Blanc', desc: 'Llega a Mont Blanc (150 m).', minM: 150 },
    { id: 'cervino', name: 'Cervino', desc: 'Llega al Cervino (320 m).', minM: 320 },
    { id: 'aconcagua', name: 'Aconcagua', desc: 'Llega al Aconcagua (500 m).', minM: 500 },
    { id: 'denali', name: 'Denali', desc: 'Llega al Denali (700 m).', minM: 700 },
    { id: 'k2', name: 'K2', desc: 'Llega al K2 (900 m).', minM: 900 },
    { id: 'everest', name: 'Everest', desc: 'Llega al Everest (1100 m).', minM: 1100 },
    { id: 'cumbre', name: 'Cumbre', desc: 'Haz cumbre a 1200 m.', won: true },
    { id: 'combo-7', name: 'A tope', desc: 'Encadena un combo de x7.', maxCombo: 7 },
    { id: 'preciso-10', name: 'Cirujano', desc: '10 aterrizajes precisos en una partida.', precise: 10 },
    { id: 'clips-5', name: 'Coleccionista', desc: 'Coge 5 cintas exprés en una partida.', pickups: 5 },
    { id: 'purista', name: 'Purista', desc: 'Haz cumbre sin coger ninguna cinta.', won: true, noPickups: true },
    { id: 'diario', name: 'Reto diario', desc: 'Termina un reto diario.', daily: true },
];

export function achievementsForRun(result) {
    const out = [];
    for (let i = 0; i < ACHIEVEMENTS.length; i++) {
        const a = ACHIEVEMENTS[i];
        let ok = true;
        if (a.minM !== undefined && result.height < a.minM) { ok = false; }
        if (a.won && !result.won) { ok = false; }
        if (a.maxCombo !== undefined && result.maxCombo < a.maxCombo) { ok = false; }
        if (a.precise !== undefined && result.precise < a.precise) { ok = false; }
        if (a.pickups !== undefined && result.pickups < a.pickups) { ok = false; }
        if (a.noPickups && result.pickups > 0) { ok = false; }
        if (a.daily && !result.daily) { ok = false; }
        if (ok) {
            out.push(a.id);
        }
    }
    return out;
}

export function runResult(sim, daily) {
    return {
        height: heightMeters(sim),
        won: sim.status === 'won',
        maxCombo: sim.stats.maxCombo,
        precise: sim.stats.precise,
        pickups: sim.stats.pickups,
        daily: !!daily,
    };
}

// Climber looks, each unlocked by an achievement (null = always available).
export const SKINS = [
    { id: 'clasico', name: 'Clásico', unlock: null },
    { id: 'glaciar', name: 'Glaciar', unlock: 'denali' },
    { id: 'turbo', name: 'Turbo', unlock: 'combo-7' },
    { id: 'diario', name: 'Madrugador', unlock: 'diario' },
    { id: 'nocturno', name: 'Nocturno', unlock: 'everest' },
    { id: 'cumbre', name: 'Cumbre', unlock: 'cumbre' },
];
