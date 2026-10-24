// ============================================
// AL FILO - GAME SHELL
// Wires the deterministic simulation (sim.js), the renderer (render.js) and audio (audio.js)
// to the page: fixed-timestep loop, input recording, pause, effects, HUD, overlays, the
// daily challenge and its ghost, tutorial, achievements, skins, sharing and sending finished
// runs to the server (which replays them before saving anything).
//
// All game modules are imported with the same ?v= suffix: bump it everywhere when any of
// them changes, so browsers never mix a cached old module with a new one.
// ============================================
import * as S from './sim.js?v=9';
import * as R from './render.js?v=9';
import * as A from './audio.js?v=9';

const $ = (id) => document.getElementById(id);

const canvas = $('gameCanvas');
if (canvas) {
    boot();
}

function boot() {
    const CONFIG = Object.assign({ isLoggedIn: false, achievements: [], skin: 'clasico' }, window.GAME_CONFIG || {});
    const SHARE_URL = window.location.origin + '/juego';

    // ============================================
    // DOM
    // ============================================
    const holder = canvas.parentElement;
    const el = {
        startOverlay: $('gameStartOverlay'),
        overOverlay: $('gameOverOverlay'),
        pauseOverlay: $('gamePauseOverlay'),
        startFree: $('gameStartBtn'),
        startDaily: $('gameDailyBtn'),
        dailyBest: $('gameDailyBest'),
        retry: $('gameRetryBtn'),
        share: $('gameShareBtn'),
        menu: $('gameMenuBtn'),
        resume: $('gameResumeBtn'),
        restart: $('gameRestartBtn'),
        quit: $('gameQuitBtn'),
        pauseBtn: $('gamePauseBtn'),
        soundBtn: $('gameSoundBtn'),
        musicVol: $('gameMusicVolume'),
        sfxVol: $('gameSfxVolume'),
        motion: $('gameReducedMotion'),
        height: $('gameHeight'),
        record: $('gameRecord'),
        recordLabel: $('gameRecordLabel'),
        stamina: $('gameStaminaFill'),
        power: $('gamePowerBar'),
        powerFill: $('gamePowerFill'),
        modeTag: $('gameModeTag'),
        overHeight: $('gameOverHeight'),
        overRecord: $('gameOverRecordMsg'),
        overRank: $('gameOverRankMsg'),
        overTitle: $('gameOverTitle'),
        overIcon: $('gameOverIcon'),
        overAchievements: $('gameOverAchievements'),
        savePrompt: $('gameSavePrompt'),
        startSprite: $('gameStartSprite'),
        tutorial: $('gameTutorial'),
        toast: $('gameToast'),
        leaderAll: $('gameLeaderboardList'),
        leaderDaily: $('gameDailyLeaderboardList'),
        leaderTabs: document.querySelectorAll('[data-leaderboard-tab]'),
        heroRecord: $('gameHeroRecord'),
        route: $('gameRoute'),
        routeIntro: $('gameRouteIntro'),
        skins: $('gameSkins'),
        achievements: $('gameAchievements'),
        achievementsCount: $('gameAchievementsCount'),
    };
    const staminaBar = el.stamina ? el.stamina.parentElement : null;

    // ============================================
    // STORAGE
    // ============================================
    function readJson(key, fallback) {
        try {
            const v = JSON.parse(window.localStorage.getItem(key));
            return v === null || v === undefined ? fallback : v;
        } catch (e) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        try {
            window.localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            // storage blocked - progress just lasts this visit
        }
    }

    const KEYS = {
        best: 'climbup_game_best_height_m',
        daily: 'climbup_game_daily_best',
        achievements: 'climbup_game_achievements',
        skin: 'climbup_game_skin',
        tutorial: 'climbup_game_tutorial_done',
    };

    let bestHeight = parseInt(readJson(KEYS.best, 0), 10) || 0;
    let dailyBest = readJson(KEYS.daily, null); // { day, height, seed, inputs, endTick, version }
    if (!dailyBest || dailyBest.day !== CONFIG.dailyDay || dailyBest.version !== S.SIM_VERSION) {
        dailyBest = null;
    }
    // Logged-in players' achievements and skin live on the server; guests keep them locally.
    let achievements = CONFIG.isLoggedIn
        ? CONFIG.achievements.slice()
        : readJson(KEYS.achievements, []);
    let skin = CONFIG.isLoggedIn ? CONFIG.skin : readJson(KEYS.skin, 'clasico');
    if (!isSkinUnlocked(skin)) {
        skin = 'clasico';
    }

    function todayDay() {
        if (CONFIG.dailyDay) {
            return CONFIG.dailyDay;
        }
        const d = new Date();
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }

    // ============================================
    // STATE
    // ============================================
    let state = 'idle'; // idle | playing | paused | dying | gameover
    let run = null;
    let idleSim = S.createSim(1);
    let acc = 0;
    let lastFrame = performance.now();
    let pending = []; // inputs waiting for the next tick
    let fx = newFx();
    let keyLeft = false;
    let keyRight = false;
    let keyAim = 0;
    let pointerAim = 0;
    let pointerStartX = null;
    let spaceHeld = false;
    let pointerHeld = false;
    let tutorialStep = readJson(KEYS.tutorial, false) ? -1 : 0;

    function newFx() {
        return { particles: [], popups: [], banner: null, shake: 0, squash: 1, staminaTimer: null };
    }

    function reducedMotion() {
        const s = A.getSettings().reducedMotion;
        if (s === true || s === false) {
            return s;
        }
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    // ============================================
    // SIZE
    // ============================================
    function resize() {
        const rect = holder.getBoundingClientRect();
        R.resize(rect.width, rect.height, Math.max(1, window.devicePixelRatio || 1));
        if (state === 'paused' || state === 'gameover') {
            draw(1);
        }
    }

    // ============================================
    // RUNS
    // ============================================
    function randomSeed() {
        if (window.crypto && window.crypto.getRandomValues) {
            return window.crypto.getRandomValues(new Uint32Array(1))[0];
        }
        return Math.floor(Math.random() * 4294967296);
    }

    function startRun(mode) {
        A.ensureAudio();
        A.sfx.ui();
        const day = todayDay();
        const seed = mode === 'daily' ? S.dailySeed(day) : randomSeed();
        run = {
            mode: mode,
            day: mode === 'daily' ? day : null,
            seed: seed,
            sim: S.createSim(seed),
            inputs: [],
            ghost: null,
            ghostInputs: null,
            ghostNext: 0,
            zone: -1,
            milestone: 0,
            chargeFullPlayed: false,
            dying: null,
        };
        if (mode === 'daily' && dailyBest && dailyBest.inputs) {
            run.ghost = S.createSim(seed);
            run.ghostInputs = dailyBest.inputs;
        }
        pending = [];
        acc = 0;
        fx = newFx();
        keyAim = 0;
        pointerAim = 0;
        lastFrame = performance.now();
        state = 'playing';
        hide(el.startOverlay);
        hide(el.overOverlay);
        hide(el.pauseOverlay);
        el.power.classList.remove('is-visible');
        el.overRank.classList.add('game-overlay-hidden');
        el.savePrompt.classList.add('game-overlay-hidden');
        el.overOverlay.classList.remove('is-win');
        if (el.modeTag) {
            el.modeTag.textContent = mode === 'daily' ? 'Reto diario' : 'Escalada libre';
        }
        if (el.recordLabel) {
            el.recordLabel.textContent = mode === 'daily' ? 'Hoy' : 'Récord';
        }
        A.stopMusic();
        A.startMusic(0);
        updateTutorial();
        updateHud(true);
    }

    function show(node) {
        if (node) {
            node.classList.remove('game-overlay-hidden');
        }
    }

    function hide(node) {
        if (node) {
            node.classList.add('game-overlay-hidden');
        }
    }

    // ============================================
    // PAUSE
    // ============================================
    let pauseReturnFocus = null;

    function pause() {
        if (state !== 'playing') {
            return;
        }
        pauseReturnFocus = document.activeElement;
        if (el.pauseOverlay && el.pauseOverlay.contains(pauseReturnFocus)) {
            pauseReturnFocus = null;
        }
        state = 'paused';
        A.stopMusic();
        el.power.classList.remove('is-visible');
        syncSettingsUi();
        show(el.pauseOverlay);
        draw(1);
        if (el.resume) {
            el.resume.focus({ preventScroll: true });
        }
    }

    function resume() {
        if (state !== 'paused') {
            return;
        }
        A.ensureAudio();
        hide(el.pauseOverlay);
        state = 'playing';
        lastFrame = performance.now();
        acc = 0;
        // A charge whose button was let go during the pause is released now.
        if (run.sim.charging && !spaceHeld && !pointerHeld) {
            queueRelease();
        }
        A.resumeMusic();
        const returnTarget = pauseReturnFocus;
        pauseReturnFocus = null;
        if (returnTarget && returnTarget.isConnected && !el.pauseOverlay.contains(returnTarget) && typeof returnTarget.focus === 'function') {
            returnTarget.focus({ preventScroll: true });
        } else {
            canvas.focus({ preventScroll: true });
        }
    }

    if (el.pauseOverlay) {
        el.pauseOverlay.addEventListener('keydown', (e) => {
            if (e.key !== 'Tab') {
                return;
            }
            const focusable = Array.from(el.pauseOverlay.querySelectorAll(
                'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
            )).filter((node) => !node.hasAttribute('hidden') && node.getAttribute('aria-hidden') !== 'true');
            if (focusable.length === 0) {
                e.preventDefault();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey && (document.activeElement === first || !el.pauseOverlay.contains(document.activeElement))) {
                e.preventDefault();
                last.focus({ preventScroll: true });
            } else if (!e.shiftKey && (document.activeElement === last || !el.pauseOverlay.contains(document.activeElement))) {
                e.preventDefault();
                first.focus({ preventScroll: true });
            }
        });
    }

    function quitToTitle() {
        hide(el.pauseOverlay);
        hide(el.overOverlay);
        A.stopMusic();
        state = 'idle';
        run = null;
        show(el.startOverlay);
        refreshStartOverlay();
    }

    // ============================================
    // INPUT - recorded as [type, tick, aim] at the tick the simulation applies it.
    // ============================================
    function currentAim() {
        return Math.abs(keyAim) > 0.03 ? keyAim : pointerAim;
    }

    function queueCharge() {
        if (state === 'playing') {
            pending.push({ type: 'c' });
        }
    }

    function queueRelease() {
        if (state === 'playing') {
            pending.push({ type: 'r', aim: Math.round(clampAim(currentAim()) * 1000) });
        }
    }

    function clampAim(v) {
        return Math.max(-1, Math.min(1, v));
    }

    function applyPending() {
        const sim = run.sim;
        while (pending.length) {
            const act = pending.shift();
            if (act.type === 'c') {
                if (S.beginCharge(sim)) {
                    run.inputs.push(['c', sim.tick]);
                    run.chargeFullPlayed = false;
                    if (!keyLeft && !keyRight) {
                        pointerAim = 0;
                    }
                    el.power.classList.add('is-visible');
                    advanceTutorial(0);
                }
            } else if (S.releaseCharge(sim, act.aim)) {
                run.inputs.push(['r', sim.tick, act.aim]);
                el.power.classList.remove('is-visible');
            }
        }
    }

    // Arrow keys ramp in instead of snapping, so a tap nudges and a hold commits.
    function updateKeyboardAim(dt) {
        const target = keyLeft ? -0.65 : (keyRight ? 0.65 : 0);
        keyAim += (target - keyAim) * Math.min(1, dt * 5);
        if (!keyLeft && !keyRight && Math.abs(keyAim) < 0.01) {
            keyAim = 0;
        }
    }

    canvas.addEventListener('pointerdown', (e) => {
        if (state !== 'playing') {
            return;
        }
        A.ensureAudio();
        pointerHeld = true;
        pointerStartX = e.clientX;
        queueCharge();
    });
    window.addEventListener('pointermove', (e) => {
        if (pointerHeld && pointerStartX !== null) {
            pointerAim = clampAim((e.clientX - pointerStartX) / 85);
        }
    });
    window.addEventListener('pointerup', () => {
        if (pointerHeld) {
            pointerHeld = false;
            queueRelease();
        }
    });

    window.addEventListener('keydown', (e) => {
        const typing = e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) && e.target.type !== 'range' && e.target.type !== 'checkbox';
        if (typing) {
            return;
        }
        if (e.code === 'Escape' || e.code === 'KeyP') {
            if (state === 'playing') {
                e.preventDefault();
                pause();
            } else if (state === 'paused') {
                e.preventDefault();
                resume();
            }
            return;
        }
        if (e.code === 'KeyM') {
            A.ensureAudio();
            toggleMute();
            return;
        }
        if (e.code === 'Space') {
            const onButton = e.target && e.target.tagName === 'BUTTON';
            if (state === 'playing') {
                e.preventDefault();
                if (!e.repeat && !spaceHeld) {
                    spaceHeld = true;
                    queueCharge();
                }
            } else if ((state === 'idle' || state === 'gameover') && !onButton) {
                e.preventDefault();
                startRun(run ? run.mode : 'free');
            }
        } else if (e.code === 'KeyR' && state === 'gameover') {
            e.preventDefault();
            startRun(run ? run.mode : 'free');
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            keyLeft = true;
            keyRight = false;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            keyRight = true;
            keyLeft = false;
        }
    });
    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            if (spaceHeld) {
                spaceHeld = false;
                if (state === 'playing') {
                    e.preventDefault();
                    queueRelease();
                }
            }
        } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
            keyLeft = false;
        } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
            keyRight = false;
        }
    });

    // Leaving the tab or window pauses the climb instead of freezing it mid-jump.
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            pause();
        }
    });
    window.addEventListener('blur', pause);

    // ============================================
    // EFFECTS (driven by the simulation's events)
    // ============================================
    function spawnPuff(x, y, intensity, color, sideways) {
        if (reducedMotion()) {
            intensity *= 0.5;
        }
        const count = Math.round(6 + intensity * 10);
        for (let i = 0; i < count; i++) {
            fx.particles.push({
                x: x,
                y: y,
                vx: (Math.random() * 120 - 60) * (1 + intensity) * (sideways ? 2.2 : 1),
                vy: sideways ? -Math.random() * 40 : (Math.random() * -80 - 10) * (1 + intensity * 0.6),
                life: 0.25 + Math.random() * 0.3,
                age: 0,
                r: 2.5 + Math.random() * 2,
                color: color || 'rgba(255,255,255,ALPHA)',
            });
        }
    }

    function popup(x, y, text, color) {
        fx.popups.push({ x: x, y: y, text: text, age: 0, life: 1.3, color: color || '#f2c25a' });
    }

    function shake(t, mag) {
        fx.shake = Math.max(fx.shake, mag);
        fx.shakeTime = Math.max(fx.shakeTime || 0, t);
    }

    function celebrateStamina() {
        if (!el.stamina) {
            return;
        }
        el.stamina.classList.remove('is-boosted');
        void el.stamina.offsetWidth; // restart the CSS animation even if it's mid-play
        el.stamina.classList.add('is-boosted');
        clearTimeout(fx.staminaTimer);
        fx.staminaTimer = setTimeout(() => el.stamina.classList.remove('is-boosted'), 450);
    }

    function handleEvents(sim) {
        const p = sim.player;
        for (let i = 0; i < sim.events.length; i++) {
            const ev = sim.events[i];
            switch (ev.type) {
            case 'jump':
                fx.squash = 1.32;
                A.sfx.jump();
                break;
            case 'land':
                fx.squash = Math.max(0.5, Math.min(0.78, 0.72 - ev.impact * 0.18));
                spawnPuff(ev.x, ev.y, ev.impact);
                if (ev.impact > 0.5) {
                    spawnPuff(ev.x, ev.y, ev.impact * 0.6, 'rgba(176,150,120,ALPHA)', true); // dust
                }
                A.sfx.land(ev.impact);
                A.vibrate(ev.impact > 0.55 ? 25 : 12);
                if (ev.impact > 0.4) {
                    shake(0.08 + ev.impact * 0.1, 2 + ev.impact * 7);
                }
                advanceTutorial(1);
                break;
            case 'combo': {
                let text = 'Combo x' + ev.multiplier;
                let color = '#f2c25a';
                if (ev.chain >= 7) {
                    text = '¡A TOPE! x' + ev.multiplier;
                    color = '#ff6b4a';
                    A.vibrate([25, 35, 25, 35, 50]);
                } else if (ev.chain >= 4) {
                    text = '¡Encadenado! x' + ev.multiplier;
                    color = '#f59e0b';
                }
                popup(p.x, p.y - 34, text, color);
                A.sfx.combo(ev.chain);
                celebrateStamina();
                break;
            }
            case 'precise':
                popup(p.x, p.y - 18, '¡Preciso! +' + ev.bonus, '#f2c25a');
                A.sfx.precise();
                celebrateStamina();
                break;
            case 'pickup':
                popup(p.x, p.y - 20, '¡Clip! +fuerza', '#2fd6c0');
                spawnPuff(ev.x, ev.y, 0.4, 'rgba(47,214,192,ALPHA)');
                A.sfx.pickup();
                A.vibrate([10, 20, 10]);
                celebrateStamina();
                break;
            case 'rock':
                A.sfx.rock();
                A.vibrate([20, 30, 30]);
                shake(0.22, 9);
                fx.squash = 1.15;
                break;
            case 'wall':
                fx.squash = 1.2 + ev.impact * 0.15;
                spawnPuff(ev.x, ev.y, ev.impact * 0.5);
                A.sfx.wall();
                if (ev.impact > 0.35) {
                    shake(0.05 + ev.impact * 0.08, 2 + ev.impact * 5);
                }
                break;
            default:
                break;
            }
        }
        sim.events.length = 0;
    }

    function updateFx(dt) {
        for (let i = fx.particles.length - 1; i >= 0; i--) {
            const pt = fx.particles[i];
            pt.age += dt;
            pt.x += pt.vx * dt;
            pt.y += pt.vy * dt;
            pt.vy += 220 * dt;
            if (pt.age >= pt.life) {
                fx.particles.splice(i, 1);
            }
        }
        for (let u = fx.popups.length - 1; u >= 0; u--) {
            const up = fx.popups[u];
            up.age += dt;
            up.y -= 26 * dt;
            if (up.age >= up.life) {
                fx.popups.splice(u, 1);
            }
        }
        if (fx.banner) {
            fx.banner.age += dt;
            if (fx.banner.age >= fx.banner.life) {
                fx.banner = null;
            }
        }
        fx.shakeTime = Math.max(0, (fx.shakeTime || 0) - dt);
        if (fx.shakeTime <= 0) {
            fx.shake = 0;
        }
        const charging = run && run.sim.charging && run.sim.player.onLedge;
        const target = charging ? 1 - S.currentChargePower(run.sim) * 0.32 : 1;
        fx.squash += (target - fx.squash) * Math.min(1, dt * 10);
    }

    // Zones and milestones are derived from the peak height, not simulated.
    function checkProgress() {
        const meters = S.heightMeters(run.sim);
        const zone = S.zoneIndexForMeters(meters);
        if (zone !== run.zone) {
            run.zone = zone;
            fx.banner = { text: S.ZONES[zone].name, age: 0, life: 2.6 };
            A.setMusicZone(zone);
            if (meters > 0) {
                A.sfx.zone();
                A.vibrate([20, 60, 20]);
            }
        }
        const milestone = Math.floor(meters / 50) * 50;
        if (milestone > run.milestone && milestone > 0) {
            run.milestone = milestone;
            popup(run.sim.player.x, run.sim.peakY - 30, milestone + ' m', '#f2c25a');
            if (S.zoneIndexForMeters(milestone) === S.zoneIndexForMeters(milestone - 1)) {
                A.sfx.milestone();
            }
        }
    }

    // ============================================
    // LOOP
    // ============================================
    function tick() {
        const sim = run.sim;
        applyPending();

        if (run.ghost && run.ghost.status === 'playing') {
            const g = run.ghost;
            while (run.ghostNext < run.ghostInputs.length && run.ghostInputs[run.ghostNext][1] === g.tick) {
                S.applyInput(g, run.ghostInputs[run.ghostNext]);
                run.ghostNext++;
            }
            S.step(g);
            g.events.length = 0;
        }

        S.step(sim);
        handleEvents(sim);
        checkProgress();

        if (sim.charging && sim.tick - sim.chargeTick >= S.MAX_CHARGE_TICKS && !run.chargeFullPlayed) {
            run.chargeFullPlayed = true;
            A.sfx.chargeFull();
        }

        if (sim.status === 'won') {
            finishRun();
        } else if (sim.status === 'dead') {
            startDying();
        }
    }

    // The fall before the game-over screen: the climber keeps dropping, flailing, as the
    // screen dithers to dark, instead of the overlay cutting in on a frozen frame.
    function startDying() {
        state = 'dying';
        const p = run.sim.player;
        run.dying = { x: p.x, y: p.y, vy: Math.max(p.vy, 300), vx: p.vx * 0.5, focus: run.sim.camFocus, t: 0, fade: 0 };
        el.power.classList.remove('is-visible');
        A.stopMusic();
        A.sfx.fall();
        A.vibrate([40, 50, 70]);
        shake(0.35, 12);
    }

    function updateDying(dt) {
        const d = run.dying;
        d.t += dt;
        d.vy += S.GRAVITY * dt;
        d.y += d.vy * dt;
        d.x += d.vx * dt;
        d.focus += (d.y - 120 - d.focus) * Math.min(1, dt * 3);
        d.fade = Math.min(1, Math.max(0, (d.t - 0.25) / 0.75));
        if (d.t >= 1.1) {
            finishRun();
        }
    }

    function draw(alpha) {
        if (!run) {
            return;
        }
        const sim = run.sim;
        R.renderGame({
            sim: sim,
            alpha: alpha,
            now: performance.now(),
            skin: skin,
            charging: sim.charging,
            aimMilli: Math.round(clampAim(currentAim()) * 1000),
            ticksHeld: sim.charging ? sim.tick - sim.chargeTick : 0,
            squash: fx.squash,
            shake: fx.shake,
            particles: fx.particles,
            popups: fx.popups,
            banner: fx.banner,
            ghost: run.ghost,
            reducedMotion: reducedMotion(),
            dying: state === 'dying' || (state === 'gameover' && run.dying) ? run.dying : null,
        });
    }

    function frame(now) {
        requestAnimationFrame(frame);
        const dt = Math.min(0.25, (now - lastFrame) / 1000);
        lastFrame = now;

        if (state === 'idle') {
            R.renderIdle(now, skin, idleSim);
            return;
        }
        if (state === 'playing') {
            updateKeyboardAim(dt);
            acc += dt;
            let steps = 0;
            while (acc >= S.DT && steps < 40 && state === 'playing') {
                tick();
                acc -= S.DT;
                steps++;
            }
            if (steps >= 40) {
                acc = 0; // way behind (slow device) - drop time rather than spiral
            }
            updateFx(dt);
            updatePowerBar();
            updateHud(false);
            draw(state === 'playing' ? Math.min(1, acc / S.DT) : 1);
            return;
        }
        if (state === 'dying') {
            updateDying(dt);
            updateFx(dt);
            if (state === 'dying') {
                draw(1);
            }
        }
    }

    // ============================================
    // HUD
    // ============================================
    let lastHud = { h: null, r: null, s: null };

    function updateHud(force) {
        const sim = run ? run.sim : null;
        const h = sim ? S.metersFromY(sim.player.y) : 0;
        const rec = run && run.mode === 'daily' ? (dailyBest ? dailyBest.height : 0) : bestHeight;
        const st = sim ? Math.max(0, Math.min(100, sim.player.stamina)) : 100;
        if (force || h !== lastHud.h) {
            lastHud.h = h;
            el.height.textContent = h + ' m';
        }
        if (force || rec !== lastHud.r) {
            lastHud.r = rec;
            el.record.textContent = rec + ' m';
        }
        if (force || st !== lastHud.s) {
            lastHud.s = st;
            el.stamina.style.width = st + '%';
            if (staminaBar) {
                staminaBar.classList.toggle('is-low', st < 25);
            }
        }
    }

    function updatePowerBar() {
        const sim = run.sim;
        if (!sim.charging) {
            return;
        }
        const power = S.currentChargePower(sim);
        const staminaMax = Math.max(0, Math.min(1, sim.player.stamina / (S.JUMP_COST_BASE + S.JUMP_COST_EXTRA)));
        const shown = Math.min(power, Math.max(staminaMax, S.MIN_POWER_FLOOR * 0.6));
        el.powerFill.style.height = (shown * 100) + '%';
        el.powerFill.classList.toggle('is-maxed', shown > 0.92);
    }

    // ============================================
    // END OF RUN
    // ============================================
    function finishRun() {
        const sim = run.sim;
        const won = sim.status === 'won';
        const reached = S.heightMeters(sim);
        state = 'gameover';
        el.power.classList.remove('is-visible');
        A.stopMusic();
        A.playJingle(won);
        if (won) {
            A.vibrate([30, 60, 30, 60, 90]);
            spawnPuff(sim.player.x, sim.player.y, 1.5, 'rgba(242,194,90,ALPHA)');
        }
        draw(1);

        const isDaily = run.mode === 'daily';
        const previousBest = isDaily ? (dailyBest ? dailyBest.height : 0) : bestHeight;
        const isNewRecord = reached > previousBest;

        if (reached > bestHeight) {
            bestHeight = reached;
            writeJson(KEYS.best, bestHeight);
        }
        if (isDaily && isNewRecord) {
            dailyBest = { day: run.day, height: reached, seed: run.seed, inputs: run.inputs, endTick: sim.tick, version: S.SIM_VERSION };
            writeJson(KEYS.daily, dailyBest);
        }

        el.overHeight.textContent = reached + ' m';
        el.overTitle.textContent = won ? '¡Cumbre conquistada!' : (isNewRecord ? '¡Nuevo récord!' : 'Te has caído');
        if (isDaily) {
            el.overRecord.textContent = isNewRecord
                ? '¡Tu mejor marca de hoy! Tu fantasma te acompañará en el próximo intento.'
                : 'Tu mejor marca de hoy sigue siendo ' + previousBest + ' m.';
        } else {
            el.overRecord.textContent = won
                ? (isNewRecord ? '¡Nuevo récord! Has llegado a la cima de la montaña.' : 'Has llegado a la cima de la montaña.')
                : (isNewRecord ? '¡Has superado tu mejor marca!' : 'Tu récord sigue siendo ' + bestHeight + ' m.');
        }
        el.overOverlay.classList.toggle('is-win', won);
        R.drawFrameInto(el.overIcon, skin, won ? 'jump' : 'fall', 3);
        el.overAchievements.innerHTML = '';
        hide(el.overAchievements);

        const result = S.runResult(sim, isDaily);
        if (CONFIG.isLoggedIn) {
            submitRun(sim, reached);
        } else {
            unlockAchievements(S.achievementsForRun(result));
            if (reached > 0) {
                show(el.savePrompt);
            }
        }

        updateHud(true);
        renderRoute();
        refreshStartOverlay();
        setTimeout(() => {
            if (state === 'gameover') {
                show(el.overOverlay);
                el.retry.focus({ preventScroll: true });
            }
        }, 260);
    }

    function submitRun(sim, reached) {
        fetch(CONFIG.scoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': CONFIG.csrfToken },
            body: JSON.stringify({
                version: S.SIM_VERSION,
                mode: run.mode,
                seed: run.seed,
                day: run.day,
                inputs: run.inputs,
                endTick: sim.tick,
                height: reached,
            }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (!data || !data.success) {
                    el.overRank.textContent = (data && data.message) || 'No se ha podido guardar la partida.';
                    show(el.overRank);
                    return;
                }
                const daily = data.daily;
                el.overRank.textContent = daily
                    ? 'Reto de hoy: puesto #' + daily.rank + (daily.isNewRecord ? ' (¡nueva marca!)' : '') + '.'
                    : (data.isNewRecord ? '🏆 ¡Guardado! Puesto #' + data.rank + ' en la clasificación.' : 'Tu mejor marca sigue en el puesto #' + data.rank + '.');
                show(el.overRank);
                updateLeaderboard(el.leaderAll, data.top);
                if (daily) {
                    updateLeaderboard(el.leaderDaily, daily.top);
                }
                achievements = data.achievements || achievements;
                announceAchievements(data.newAchievements || []);
                renderAchievements();
                renderSkins();
            })
            .catch(() => {
                // Offline or the request failed - the local record is already saved.
            });
    }

    // ============================================
    // ACHIEVEMENTS + SKINS
    // ============================================
    function achievementById(id) {
        return S.ACHIEVEMENTS.find((a) => a.id === id);
    }

    function unlockAchievements(ids) {
        const fresh = ids.filter((id) => achievements.indexOf(id) === -1);
        if (!fresh.length) {
            return;
        }
        achievements = achievements.concat(fresh);
        writeJson(KEYS.achievements, achievements);
        announceAchievements(fresh);
        renderAchievements();
        renderSkins();
    }

    function announceAchievements(ids) {
        if (!ids.length) {
            return;
        }
        A.sfx.achievement();
        el.overAchievements.innerHTML = ids.map((id) => {
            const a = achievementById(id);
            return a ? '<li><i class="fas fa-medal"></i> ' + escapeHtml(a.name) + '</li>' : '';
        }).join('');
        show(el.overAchievements);
        const unlockedSkins = S.SKINS.filter((s) => s.unlock && ids.indexOf(s.unlock) !== -1);
        let text = ids.length === 1 ? 'Logro desbloqueado: ' + achievementById(ids[0]).name : ids.length + ' logros nuevos';
        if (unlockedSkins.length) {
            text += ' · Nuevo aspecto: ' + unlockedSkins.map((s) => s.name).join(', ');
        }
        toast(text);
    }

    let toastTimer = null;
    function toast(text) {
        if (!el.toast) {
            return;
        }
        el.toast.textContent = text;
        el.toast.classList.add('is-visible');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.toast.classList.remove('is-visible'), 3800);
    }

    function isSkinUnlocked(id) {
        const def = S.SKINS.find((s) => s.id === id);
        return !!def && (def.unlock === null || achievements.indexOf(def.unlock) !== -1);
    }

    function renderAchievements() {
        if (!el.achievements) {
            return;
        }
        el.achievements.innerHTML = S.ACHIEVEMENTS.map((a) => {
            const got = achievements.indexOf(a.id) !== -1;
            return '<li class="game-achievement' + (got ? ' is-unlocked' : '') + '" title="' + escapeHtml(a.desc) + '">'
                + '<span class="game-achievement-icon" aria-hidden="true"><i class="fas ' + (got ? 'fa-medal' : 'fa-lock') + '"></i></span>'
                + '<span class="game-achievement-text"><strong>' + escapeHtml(a.name) + '</strong><span>' + escapeHtml(a.desc) + '</span></span>'
                + '</li>';
        }).join('');
        if (el.achievementsCount) {
            el.achievementsCount.textContent = achievements.length + '/' + S.ACHIEVEMENTS.length;
        }
    }

    function renderSkins() {
        if (!el.skins) {
            return;
        }
        el.skins.innerHTML = '';
        S.SKINS.forEach((s) => {
            const unlocked = isSkinUnlocked(s.id);
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'game-skin' + (s.id === skin ? ' is-selected' : '') + (unlocked ? '' : ' is-locked');
            btn.setAttribute('aria-pressed', s.id === skin ? 'true' : 'false');
            const need = s.unlock ? achievementById(s.unlock) : null;
            btn.title = unlocked ? s.name : 'Bloqueado: ' + (need ? need.desc : '');
            btn.disabled = !unlocked;
            const c = document.createElement('canvas');
            c.className = 'game-skin-sprite';
            R.drawFrameInto(c, s.id, 'idle', 2);
            btn.appendChild(c);
            const label = document.createElement('span');
            label.className = 'game-skin-name';
            label.textContent = unlocked ? s.name : '?';
            btn.appendChild(label);
            if (!unlocked) {
                const lock = document.createElement('i');
                lock.className = 'fas fa-lock game-skin-lock';
                btn.appendChild(lock);
            }
            btn.addEventListener('click', () => chooseSkin(s.id));
            el.skins.appendChild(btn);
        });
    }

    function chooseSkin(id) {
        if (!isSkinUnlocked(id) || id === skin) {
            return;
        }
        A.ensureAudio();
        A.sfx.ui();
        skin = id;
        writeJson(KEYS.skin, skin);
        renderSkins();
        refreshStartOverlay();
        renderRoute();
        if (CONFIG.isLoggedIn && CONFIG.skinUrl) {
            fetch(CONFIG.skinUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': CONFIG.csrfToken },
                body: JSON.stringify({ skin: id }),
            }).catch(() => {});
        }
    }

    // ============================================
    // TUTORIAL - three short prompts on the very first run.
    // ============================================
    const TUTORIAL = [
        'Mantén pulsado (espacio o el dedo en la pantalla) para cargar el salto.',
        'Mueve a izquierda o derecha para apuntar y suelta para saltar a la repisa de arriba.',
        '¡Así se hace! Sube de repisa en repisa. Si caes demasiado, se acaba la escalada.',
    ];

    function updateTutorial() {
        if (!el.tutorial) {
            return;
        }
        if (tutorialStep < 0 || tutorialStep >= TUTORIAL.length || !run) {
            hide(el.tutorial);
            return;
        }
        el.tutorial.textContent = TUTORIAL[tutorialStep];
        show(el.tutorial);
    }

    // `from`: 0 = started charging, 1 = landed on a ledge above the ground.
    function advanceTutorial(from) {
        if (tutorialStep < 0) {
            return;
        }
        if (from === 0 && tutorialStep === 0) {
            tutorialStep = 1;
        } else if (from === 1 && tutorialStep === 1 && S.heightMeters(run.sim) > 1) {
            tutorialStep = 2;
            writeJson(KEYS.tutorial, true);
            setTimeout(() => {
                tutorialStep = -1;
                updateTutorial();
            }, 3500);
        }
        updateTutorial();
    }

    // ============================================
    // SHARE - a pixel-art result card (image) when the device can share files, text otherwise.
    // ============================================
    function share() {
        if (!run) {
            return;
        }
        const sim = run.sim;
        const reached = S.heightMeters(sim);
        const text = 'He llegado a ' + reached + ' m escalando "Al Filo" en ClimbUp 🧗 ¿Superas mi récord? ' + SHARE_URL;
        const card = R.makeShareCard({
            height: reached,
            zoneIndex: S.zoneIndexForMeters(reached),
            won: sim.status === 'won',
            mode: run.mode,
            day: run.day,
            skin: skin,
        });
        card.toBlob((blob) => {
            const file = blob ? new File([blob], 'al-filo-' + reached + 'm.png', { type: 'image/png' }) : null;
            if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
                navigator.share({ files: [file], text: text }).catch(() => {});
                return;
            }
            if (navigator.share) {
                navigator.share({ text: text, url: SHARE_URL }).catch(() => {});
                return;
            }
            if (blob) {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'al-filo-' + reached + 'm.png';
                a.click();
                setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            }
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => toast('Imagen descargada y texto copiado'));
            }
        }, 'image/png');
    }

    // ============================================
    // SOUND + SETTINGS
    // ============================================
    function toggleMute() {
        A.updateSettings({ muted: !A.getSettings().muted });
        if (!A.getSettings().muted && state === 'playing') {
            A.startMusic(run ? Math.max(0, run.zone) : 0);
        }
        syncSettingsUi();
    }

    function syncSettingsUi() {
        const s = A.getSettings();
        if (el.soundBtn) {
            el.soundBtn.classList.toggle('is-muted', s.muted);
            el.soundBtn.setAttribute('aria-pressed', s.muted ? 'true' : 'false');
            el.soundBtn.setAttribute('aria-label', s.muted ? 'Activar sonido' : 'Silenciar sonido');
            el.soundBtn.innerHTML = s.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-music"></i>';
        }
        if (el.musicVol) {
            el.musicVol.value = Math.round(s.music * 100);
        }
        if (el.sfxVol) {
            el.sfxVol.value = Math.round(s.sfx * 100);
        }
        if (el.motion) {
            el.motion.checked = reducedMotion();
        }
    }

    // ============================================
    // PAGE: leaderboards, route, start overlay
    // ============================================
    function escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = String(str == null ? '' : str);
        return div.innerHTML;
    }

    function updateLeaderboard(list, top) {
        if (!list || !top || !top.length) {
            return;
        }
        list.innerHTML = top.map((row, i) => {
            const isMe = CONFIG.currentUserId && row.userId === CONFIG.currentUserId;
            return '<li' + (isMe ? ' class="is-me"' : '') + '>'
                + '<span class="game-leaderboard-rank">' + (i + 1) + '</span>'
                + '<a href="/escalador/' + row.userId + '" class="game-leaderboard-name">' + escapeHtml(row.name) + '</a>'
                + (isMe ? '<span class="game-leaderboard-me">Tú</span>' : '')
                + '<span class="game-leaderboard-height">' + row.height + ' m</span>'
                + '</li>';
        }).join('');
    }

    function setupLeaderboardTabs() {
        el.leaderTabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                const which = tab.getAttribute('data-leaderboard-tab');
                el.leaderTabs.forEach((t) => {
                    const on = t === tab;
                    t.classList.toggle('is-active', on);
                    t.setAttribute('aria-selected', on ? 'true' : 'false');
                });
                document.querySelectorAll('[data-leaderboard-panel]').forEach((panel) => {
                    panel.hidden = panel.getAttribute('data-leaderboard-panel') !== which;
                });
            });
        });
    }

    // The zones as an ascending staircase, with the climber on the highest one reached.
    function renderRoute() {
        if (el.heroRecord) {
            el.heroRecord.textContent = bestHeight + ' m';
        }
        if (!el.route) {
            return;
        }
        const stops = S.ZONES.filter((z) => z.minM < S.SUMMIT_METERS).map((z) => ({ name: z.name, minM: z.minM, color: z.color, cold: z.cold }));
        stops.push({ name: 'Cumbre', minM: S.SUMMIT_METERS, color: [242, 194, 90], cold: 1, summit: true });

        let currentIdx = -1;
        stops.forEach((st, k) => {
            if (bestHeight >= st.minM) {
                currentIdx = k;
            }
        });
        el.route.innerHTML = stops.map((st, j) => {
            const rock = R.makeRamp(st.color);
            const cap = st.summit ? 'transparent' : (st.cold > 0.6 ? '#ecf4ff' : (st.cold < 0.3 ? '#62a644' : R.rgb(rock[4])));
            const cls = 'game-route-stop' + (j <= currentIdx ? ' is-reached' : '') + (j === currentIdx ? ' is-current' : '') + (st.summit ? ' is-summit' : '');
            return '<li class="' + cls + '" style="--step:' + j + ';--rock:' + R.rgb(rock[2]) + ';--rock-lo:' + R.rgb(rock[1]) + ';--rock-hi:' + R.rgb(rock[3]) + ';--cap:' + cap + '">'
                + '<span class="game-route-block" aria-hidden="true">' + (st.summit ? '<i class="fas fa-flag"></i>' : '') + '</span>'
                + '<span class="game-route-name">' + escapeHtml(st.name) + '</span>'
                + '<span class="game-route-height">' + st.minM + ' m</span>'
                + '</li>';
        }).join('');

        const current = el.route.querySelector('.is-current .game-route-block');
        if (current) {
            const marker = document.createElement('canvas');
            marker.className = 'game-route-climber';
            marker.setAttribute('aria-hidden', 'true');
            R.drawFrameInto(marker, skin, 'idle', 2);
            current.appendChild(marker);
        }

        if (el.routeIntro) {
            if (bestHeight >= S.SUMMIT_METERS) {
                el.routeIntro.textContent = '¡Has hecho cumbre! Ya solo queda mejorar tu marca.';
            } else if (bestHeight > 0 && currentIdx >= 0) {
                el.routeIntro.textContent = 'Tu récord: ' + bestHeight + ' m, ya has llegado a ' + stops[currentIdx].name + '. Siguiente parada: '
                    + stops[currentIdx + 1].name + ' (' + stops[currentIdx + 1].minM + ' m).';
            } else {
                el.routeIntro.textContent = 'De la tienda de campaña al techo del mundo. ¿Hasta dónde llegas?';
            }
        }
    }

    function refreshStartOverlay() {
        R.drawFrameInto(el.startSprite, skin, 'idle', 3);
        if (el.dailyBest) {
            el.dailyBest.textContent = dailyBest ? 'Tu mejor hoy: ' + dailyBest.height + ' m' : 'La misma montaña para todos, hoy';
        }
    }

    // ============================================
    // WIRING
    // ============================================
    el.startFree.addEventListener('click', () => startRun('free'));
    if (el.startDaily) {
        el.startDaily.addEventListener('click', () => startRun('daily'));
    }
    el.retry.addEventListener('click', () => startRun(run ? run.mode : 'free'));
    if (el.menu) {
        el.menu.addEventListener('click', quitToTitle);
    }
    el.share.addEventListener('click', share);
    if (el.pauseBtn) {
        el.pauseBtn.addEventListener('click', () => {
            if (state === 'playing') {
                pause();
            } else if (state === 'paused') {
                resume();
            }
            el.pauseBtn.blur();
        });
    }
    if (el.resume) {
        el.resume.addEventListener('click', resume);
    }
    if (el.restart) {
        el.restart.addEventListener('click', () => startRun(run ? run.mode : 'free'));
    }
    if (el.quit) {
        el.quit.addEventListener('click', quitToTitle);
    }
    if (el.soundBtn) {
        el.soundBtn.addEventListener('click', () => {
            A.ensureAudio();
            toggleMute();
            el.soundBtn.blur(); // so Space keeps meaning "jump"
        });
    }
    if (el.musicVol) {
        el.musicVol.addEventListener('input', () => {
            A.ensureAudio();
            A.updateSettings({ music: el.musicVol.value / 100, muted: false });
            syncSettingsUi();
        });
    }
    if (el.sfxVol) {
        el.sfxVol.addEventListener('input', () => {
            A.ensureAudio();
            A.updateSettings({ sfx: el.sfxVol.value / 100, muted: false });
            A.sfx.ui();
            syncSettingsUi();
        });
    }
    if (el.motion) {
        el.motion.addEventListener('change', () => {
            A.updateSettings({ reducedMotion: el.motion.checked });
            document.documentElement.classList.toggle('game-reduced-motion', el.motion.checked);
        });
    }
    document.documentElement.classList.toggle('game-reduced-motion', reducedMotion());

    window.addEventListener('resize', resize);
    setupLeaderboardTabs();

    R.initRenderer(canvas);
    resize();
    syncSettingsUi();
    refreshStartOverlay();
    renderRoute();
    renderAchievements();
    renderSkins();
    requestAnimationFrame(frame);

    // Test hook for the end-to-end suite (cypress/e2e/game.cy.js) - read-only state.
    window.__alFilo = {
        get state() {
            return state;
        },
        get height() {
            return run ? S.heightMeters(run.sim) : 0;
        },
        get tick() {
            return run ? run.sim.tick : 0;
        },
    };
}
