// ============================================
// AL FILO - RENDERER
// Draws the simulation (sim.js) as pixel art. Everything is drawn onto `pixelCanvas`, a tiny
// offscreen buffer with one pixel per "art pixel", via the module-level `ctx`, in whole art
// pixels with real pixel-map sprites and textures. That buffer is then blown up onto the
// on-screen canvas with smoothing off, which is what gives the chunky Jump King look.
//
// The world is a fixed WORLD_W logical px wide (see sim.js); each art pixel is ART logical
// px. The view is scaled to fit the canvas, and any extra width on either side is drawn as
// solid cliff, so every screen shape plays the same mountain.
// ============================================
import {
    WORLD_W, VIEW_H, DT, GRAVITY, PLAYER_RADIUS, CAMERA_TOP_FRACTION, MAX_CHARGE_TICKS,
    ZONES, clamp, lerp, metersFromY, zoneVisual, heightMeters, fallLimitY, pickupBob,
    calcJumpVelocities, chargePower,
} from './sim.js?v=8';

export const ART = 2; // logical px per art pixel
const WORLD_ART_W = WORLD_W / ART;

let realCanvas = null;
let realCtx = null;
const pixelCanvas = document.createElement('canvas');
const pixelCtx = pixelCanvas.getContext('2d');
let ctx = pixelCtx;

const view = {
    cssW: 0, cssH: 0, dpr: 1,
    devPerArt: 2, aw: 1, ah: 1,
    logicalW: WORLD_W, logicalH: VIEW_H,
    offsetX: 0, padArt: 0, cssPerLogical: 1,
};

// Cheap deterministic pseudo-random from a number seed - same input, same output, so
// texture details never jitter from frame to frame. (Visual only - never used by sim.js.)
function hash01(n) {
    const x = Math.sin(n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
}

const stars = (function () {
    const list = [];
    for (let i = 0; i < 70; i++) {
        list.push({ x: Math.random(), y: -9000 + Math.random() * 9400, r: 0.6 + Math.random() * 1.2, tw: Math.random() * Math.PI * 2 });
    }
    return list;
})();

export function initRenderer(canvas) {
    realCanvas = canvas;
    realCtx = canvas.getContext('2d');
}

export function getView() {
    return view;
}

// Fit the fixed world into the canvas. Art pixels are a whole number of device pixels where
// that costs little (perfectly even pixels); otherwise a fractional size, so low-DPI screens
// don't end up with a tiny playfield.
export function resize(cssW, cssH, dpr) {
    view.cssW = cssW;
    view.cssH = cssH;
    view.dpr = dpr;
    const devW = Math.max(1, Math.round(cssW * dpr));
    const devH = Math.max(1, Math.round(cssH * dpr));
    realCanvas.width = devW;
    realCanvas.height = devH;
    realCanvas.style.width = cssW + 'px';
    realCanvas.style.height = cssH + 'px';

    const scale = Math.min(cssW / WORLD_W, cssH / VIEW_H);
    const ideal = Math.max(0.5, ART * scale * dpr);
    const whole = Math.floor(ideal);
    view.devPerArt = whole >= 1 && whole >= ideal * 0.85 ? whole : ideal;
    view.aw = Math.max(1, Math.ceil(devW / view.devPerArt));
    view.ah = Math.max(1, Math.ceil(devH / view.devPerArt));
    view.logicalW = view.aw * ART;
    view.logicalH = view.ah * ART;
    view.offsetX = Math.round((view.logicalW - WORLD_W) / 2 / ART) * ART;
    view.padArt = Math.ceil(Math.max(view.offsetX, view.logicalW - view.offsetX - WORLD_W) / ART) + 2;
    view.cssPerLogical = view.devPerArt / ART / dpr;

    pixelCanvas.width = view.aw;
    pixelCanvas.height = view.ah;
    pixelCtx.setTransform(1 / ART, 0, 0, 1 / ART, 0, 0);
    pixelCtx.imageSmoothingEnabled = false; // resizing resets context state
}

// World (logical) coordinates -> CSS px on the canvas, for the crisp text overlays.
function toCss(worldX, worldY, camTop, shakeX, shakeY) {
    return {
        x: (worldX + view.offsetX + shakeX) * view.cssPerLogical,
        y: (worldY - camTop + shakeY) * view.cssPerLogical,
    };
}

// ============================================
// PIXEL-ART TOOLKIT
// Everything from here down draws in whole "art pixels" (ART CSS px each): every
// position is snapped to that grid, and every sprite and texture is a real pixel map built
// at art resolution, never a smooth vector shape shrunk down. That is the difference between
// actual pixel art (Jump King) and anti-aliased mush that only looks low-res.
// ============================================
var OUTLINE_RGB = [27, 20, 32];
var OUTLINE = 'rgb(27,20,32)';

function snap(v) {
    return Math.round(v / ART);
}

function artRect(ax, ay, aw, ah) {
    ctx.fillRect(ax * ART, ay * ART, aw * ART, ah * ART);
}

function rgb(c) {
    return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
}

function rgba(c, a) {
    return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
}

function mix(a, b, t) {
    return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
}

function scaleRgb(c, f) {
    return [Math.min(255, c[0] * f), Math.min(255, c[1] * f), Math.min(255, c[2] * f)];
}

function hexToRgb(hex) {
    return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

// Seeded LCG, for texture generation that comes out identical on every load.
function seededRandom(seed) {
    var s = (seed * 2654435761) >>> 0 || 1;
    return function () {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 4294967296;
    };
}

function makeCanvas(w, h) {
    var c = document.createElement('canvas');
    c.width = Math.max(1, w);
    c.height = Math.max(1, h);
    return c;
}

// Blow an art-res canvas up to CSS-px resolution once, so it can be a repeating pattern in
// the (1/ART-transformed) pixel buffer without the context ever resampling it.
function upscale(src) {
    var c = makeCanvas(src.width * ART, src.height * ART);
    var g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(src, 0, 0, c.width, c.height);
    return c;
}

function drawSprite(sprite, ax, ay, flip) {
    if (flip) {
        ctx.save();
        ctx.translate((ax + sprite.width) * ART, ay * ART);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, 0, 0, sprite.width * ART, sprite.height * ART);
        ctx.restore();
    } else {
        ctx.drawImage(sprite, ax * ART, ay * ART, sprite.width * ART, sprite.height * ART);
    }
}

// Bresenham line, one art pixel at a time - a canvas stroke would anti-alias.
function artLine(x0, y0, x1, y1) {
    var dx = Math.abs(x1 - x0);
    var dy = -Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1;
    var sy = y0 < y1 ? 1 : -1;
    var err = dx + dy;
    for (var guard = 0; guard < 4000; guard++) {
        artRect(x0, y0, 1, 1);
        if (x0 === x1 && y0 === y1) {
            return;
        }
        var e2 = 2 * err;
        if (e2 >= dy) {
            err += dy;
            x0 += sx;
        }
        if (e2 <= dx) {
            err += dx;
            y0 += sy;
        }
    }
}

// A 5-step colour ramp from one base colour, hue-shifted the way pixel artists do it:
// shadows lean cool and purple, highlights lean warm, instead of plain darker/lighter.
function makeRamp(base) {
    return [
        mix(scaleRgb(base, 0.3), [30, 18, 52], 0.5),
        mix(scaleRgb(base, 0.64), [46, 40, 98], 0.22),
        base,
        mix(scaleRgb(base, 1.16), [255, 236, 190], 0.12),
        mix(scaleRgb(base, 1.38), [255, 244, 214], 0.32),
    ];
}

// Any transparent pixel touching a filled one becomes outline - the crisp dark silhouette
// every Jump King sprite has, generated instead of hand-placed so it can never have gaps.
function autoOutline(c, color) {
    var g = c.getContext('2d');
    var img = g.getImageData(0, 0, c.width, c.height);
    var d = img.data;
    var w = c.width;
    var h = c.height;
    var src = new Uint8Array(w * h);
    for (var i = 0; i < w * h; i++) {
        src[i] = d[i * 4 + 3] > 0 ? 1 : 0;
    }
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            var k = y * w + x;
            if (src[k]) {
                continue;
            }
            var touch = (x > 0 && src[k - 1]) || (x < w - 1 && src[k + 1]) ||
                (y > 0 && src[k - w]) || (y < h - 1 && src[k + w]);
            if (touch) {
                d[k * 4] = color[0];
                d[k * 4 + 1] = color[1];
                d[k * 4 + 2] = color[2];
                d[k * 4 + 3] = 255;
            }
        }
    }
    g.putImageData(img, 0, 0);
    return c;
}

// Paint a string-row pixel map ('.' = transparent) into a canvas at an offset.
function paintMap(g, rows, palette, ox, oy, flip) {
    for (var y = 0; y < rows.length; y++) {
        var row = rows[y];
        for (var x = 0; x < row.length; x++) {
            var ch = row.charAt(flip ? row.length - 1 - x : x);
            if (ch === '.' || !palette[ch]) {
                continue;
            }
            g.fillStyle = palette[ch];
            g.fillRect(ox + x, oy + y, 1, 1);
        }
    }
}

function spriteFromMap(rows, palette, outline) {
    var c = makeCanvas(rows[0].length + 2, rows.length + 2);
    paintMap(c.getContext('2d'), rows, palette, 1, 1, false);
    return outline === false ? c : autoOutline(c, OUTLINE_RGB);
}

// ============================================
// CHARACTER SPRITES - built from body-part pixel maps so every pose shares the same head,
// jacket and colours, and the belayer is just the climber's frames with a palette swap.
// ============================================
var PART_HEAD = [
    '...hhrrr...',
    '..hrrrrrrR.',
    '.hrrrrrrrrR',
    'RRRRRRRRRRR',
    'HHsssssssS.',
    'HHsssssesS.',
    '.HssssssSS.',
    '..SSSSSSS..',
];
var PART_TORSO = [
    'wwwwyyyy',
    'wyyyyyyY',
    'yyyyyyYY',
    'yyyyyyYY',
    'bbbgbbbb',
    'bbbbbbbb',
];
var PART_ARM_DOWN = ['wy', 'yY', 'yY', 'YY', 'ss', 'sS'];
var PART_ARM_DOWN_BACK = ['YY', 'YY', 'YY', 'YY', 'SS', 'SS'];
var PART_ARM_UP = ['ss', 'sS', 'yY', 'yY', 'yY', 'yY', 'yY', 'YY', 'YY'];
var PART_ARM_UP_BACK = ['SS', 'SS', 'YY', 'YY', 'YY', 'YY', 'YY', 'YY', 'YY'];
var PART_ARM_OUT = ['..ss', '.ySs', 'yYY.', 'YY..'];
var PART_ARM_OUT_BACK = ['..SS', '.YSS', 'YYY.', 'YY..'];
var PART_LEGS_STAND = [
    'pppppppp.',
    'ppppPppp.',
    'ppp..ppp.',
    'ppP..ppP.',
    'ppP..ppP.',
    'PPP..PPP.',
    'tttT.tttT',
    'TTTT.TTTT',
];
var PART_LEGS_CROUCH = [
    '.pppppppp..',
    'pppP..pppP.',
    'ppP....ppP.',
    'tttT...tttT',
    'TTTT...TTTT',
];
var PART_LEGS_JUMP = [
    'pppppppp.',
    'pppPPppp.',
    '.ppP.ppP.',
    '.PPP.PPP.',
    '.tttTtttT',
    '.TTTTTTTT',
];
var PART_LEGS_FALL = [
    '..pppppppp.',
    '.pppP..pppP',
    '.ppP....ppP',
    'ttT.....ttT',
    'TTT.....TTT',
];

// [part, x, y, flip] layers, back to front, on a 22x26 canvas whose bottom row (the outline
// under the shoes) sits on the surface. `harness` is the rope tie-in row on that canvas.
var FRAME_W = 22;
var FRAME_H = 26;
var FRAME_LAYOUTS = {
    idle: { harness: 15, layers: [[PART_ARM_DOWN_BACK, 5, 11], [PART_LEGS_STAND, 7, 17], [PART_TORSO, 7, 11], [PART_HEAD, 5, 3], [PART_ARM_DOWN, 15, 11]] },
    crouch: { harness: 18, layers: [[PART_ARM_DOWN_BACK, 5, 14], [PART_LEGS_CROUCH, 6, 20], [PART_TORSO, 7, 14], [PART_HEAD, 5, 6], [PART_ARM_DOWN, 15, 15]] },
    jump: { harness: 15, layers: [[PART_ARM_UP_BACK, 5, 2], [PART_LEGS_JUMP, 7, 17], [PART_TORSO, 7, 11], [PART_HEAD, 5, 3], [PART_ARM_UP, 15, 2]] },
    fall: { harness: 15, layers: [[PART_ARM_OUT_BACK, 3, 8, true], [PART_LEGS_FALL, 6, 17], [PART_TORSO, 7, 11], [PART_HEAD, 5, 3], [PART_ARM_OUT, 15, 8]] },
};

var CLIMBER_PALETTE = {
    h: '#ff9b76', r: '#e2493b', R: '#a3302a', H: '#5a3424',
    s: '#f5c8a0', S: '#cf916d', e: '#20162a',
    w: '#ffe394', y: '#eab54a', Y: '#a9781f',
    b: '#2a2735', g: '#cfd5df',
    p: '#4c566c', P: '#2f3546',
    t: '#2fd6c0', T: '#148a7d',
};
var BELAYER_PALETTE = {
    h: '#a07a56', r: '#7a5a3e', R: '#4f3a28', H: '#2e2420',
    s: '#f0bf96', S: '#c48862', e: '#20162a',
    w: '#a6d0ff', y: '#4f93e0', Y: '#2f62a8',
    b: '#2a2735', g: '#cfd5df',
    p: '#5d636e', P: '#3b4049',
    t: '#9aa0aa', T: '#646a74',
};

function buildFrames(palette) {
    var frames = {};
    for (var name in FRAME_LAYOUTS) {
        if (!Object.prototype.hasOwnProperty.call(FRAME_LAYOUTS, name)) {
            continue;
        }
        var layout = FRAME_LAYOUTS[name];
        var c = makeCanvas(FRAME_W, FRAME_H);
        var g = c.getContext('2d');
        for (var i = 0; i < layout.layers.length; i++) {
            var L = layout.layers[i];
            paintMap(g, L[0], palette, L[1], L[2], !!L[3]);
        }
        autoOutline(c, OUTLINE_RGB);
        frames[name] = { canvas: c, harness: layout.harness };
    }
    return frames;
}

var BELAYER_FRAMES = buildFrames(BELAYER_PALETTE);

// Small props, hand-drawn as maps.
var QUICKDRAW_SPRITE = spriteFromMap([
    '.ggg.',
    'g...g',
    'g...G',
    '.GgG.',
    '..qQ.',
    '..qQ.',
    '..qQ.',
    '..qQ.',
    '.ggg.',
    'g...g',
    'G...G',
    '.GGG.',
], { g: '#e6ebf2', G: '#8d96a8', q: '#2DD4BF', Q: '#168f81' });

var BOLT_SPRITE = spriteFromMap(['.g.', 'gGg', 'g.g', '.G.'], { g: '#d5dae2', G: '#7d8494' });

var FLAG_FRAMES = [
    spriteFromMap(['oyyyyy..', 'oyyyyyyy', 'oyyyyyY.', 'oYYYY...', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......'],
        { o: '#9aa0aa', y: '#f2c25a', Y: '#b98a2a' }),
    spriteFromMap(['oyyyy...', 'oyyyyyy.', 'oyyyyyyY', 'oYYYYY..', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......', 'o.......'],
        { o: '#9aa0aa', y: '#f2c25a', Y: '#b98a2a' }),
];

var FIRE_PALETTE = { Y: '#fff2a8', O: '#ffa53a', R: '#e2493b' };
var FIRE_FRAMES = [
    spriteFromMap(['..Y..', '.YO..', '.OYO.', 'OYYOR', 'ROYOR', '.RRR.'], FIRE_PALETTE, false),
    spriteFromMap(['...Y.', '..OY.', '.OYO.', 'ROYYO', 'ROYOR', '.RRR.'], FIRE_PALETTE, false),
    spriteFromMap(['.Y...', '.OY..', '.OYO.', 'OYYOR', 'RYOOR', '.RRR.'], FIRE_PALETTE, false),
];
var LOGS_SPRITE = spriteFromMap(['LL...lL', '.lLLLl.', 'lL...LL'], { L: '#8a5a34', l: '#5e3c22' });

// A-frame tent, generated row by row: lit left half, shaded right half, dark door.
var TENT_SPRITE = (function () {
    var h = 12;
    var c = makeCanvas(h * 2 + 2, h + 2);
    var g = c.getContext('2d');
    for (var y = 0; y < h; y++) {
        var half = y + 1;
        for (var x = -half; x < half; x++) {
            var col = x < 0 ? '#ee7a44' : '#b8502f';
            if (y >= h - 6 && Math.abs(x + 0.5) < (y - (h - 7)) * 0.55) {
                col = '#3a1f24';
            }
            if (y === 0 || (x === -half && y % 3 === 0)) {
                col = '#ffa36a';
            }
            g.fillStyle = col;
            g.fillRect(h + 1 + x, y + 1, 1, 1);
        }
    }
    return autoOutline(c, OUTLINE_RGB);
})();

// Round boulders, shaded per pixel from a top-left light, one per art diameter.
var BOULDER_SPRITES = {};
function boulderSprite(d) {
    if (BOULDER_SPRITES[d]) {
        return BOULDER_SPRITES[d];
    }
    var ramp = makeRamp([126, 118, 128]);
    var c = makeCanvas(d + 2, d + 2);
    var g = c.getContext('2d');
    var r = d / 2;
    var rnd = seededRandom(d * 31);
    for (var y = 0; y < d; y++) {
        for (var x = 0; x < d; x++) {
            var dx = x + 0.5 - r;
            var dy = y + 0.5 - r;
            var wobble = 0.93 + 0.07 * Math.sin(Math.atan2(dy, dx) * 5 + d);
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > r * wobble) {
                continue;
            }
            var light = -(dx + dy) / (r * 1.5) + (1 - dist / r) * 0.4;
            var t = light > 0.45 ? 4 : (light > 0.05 ? 3 : (light > -0.4 ? 2 : 1));
            if (rnd() < 0.06) {
                t = Math.max(1, t - 1);
            }
            g.fillStyle = rgb(ramp[t]);
            g.fillRect(x + 1, y + 1, 1, 1);
        }
    }
    BOULDER_SPRITES[d] = autoOutline(c, OUTLINE_RGB);
    return BOULDER_SPRITES[d];
}

function discSprite(r, fill, rim, spots) {
    var size = r * 2 + 1;
    var c = makeCanvas(size, size);
    var g = c.getContext('2d');
    for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
            var dist = Math.sqrt((x - r) * (x - r) + (y - r) * (y - r));
            if (dist > r + 0.35) {
                continue;
            }
            g.fillStyle = rgb(dist > r - 1.1 ? rim : fill);
            g.fillRect(x, y, 1, 1);
        }
    }
    if (spots) {
        g.fillStyle = rgb(rim);
        for (var i = 0; i < spots.length; i++) {
            g.fillRect(spots[i][0], spots[i][1], spots[i][2], spots[i][2]);
        }
    }
    return c;
}

var SUN_SPRITE = discSprite(9, [255, 244, 200], [255, 204, 120]);
var SUN_HALO = discSprite(14, [255, 220, 150], [255, 220, 150]);
var MOON_SPRITE = discSprite(7, [236, 236, 248], [176, 180, 206], [[4, 4, 2], [9, 7, 3], [5, 10, 2]]);

// ============================================
// TILE TEXTURES - generated stone/dirt tiles, cached per (quantised) colour and used as
// world-anchored repeating patterns, so the rock never swims as the camera scrolls.
// ============================================

// Voronoi stones: each cell is one rock, the borders between cells are dark cracks, and
// each rock is lit from the top-left (bright upper edge, shaded lower edge) like the
// masonry in Jump King's backgrounds.
function makeRockTile(size, cellCount, ramp, seed) {
    var rnd = seededRandom(seed);
    var cells = [];
    for (var i = 0; i < cellCount; i++) {
        cells.push({ x: rnd() * size, y: rnd() * size, tone: rnd() });
    }
    var n = size * size;
    var owner = new Int16Array(n);
    var crack = new Uint8Array(n);
    var lean = new Float32Array(n);
    var half = size / 2;
    for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
            var d1 = 1e9;
            var d2 = 1e9;
            var best = 0;
            var bdx = 0;
            var bdy = 0;
            for (var c = 0; c < cells.length; c++) {
                var dx = x - cells[c].x;
                var dy = y - cells[c].y;
                if (dx > half) { dx -= size; } else if (dx < -half) { dx += size; }
                if (dy > half) { dy -= size; } else if (dy < -half) { dy += size; }
                var d = Math.sqrt(dx * dx + dy * dy);
                if (d < d1) {
                    d2 = d1;
                    d1 = d;
                    best = c;
                    bdx = dx;
                    bdy = dy;
                } else if (d < d2) {
                    d2 = d;
                }
            }
            var k = y * size + x;
            owner[k] = best;
            crack[k] = d2 - d1 < 1.2 ? 1 : 0;
            lean[k] = (bdx + bdy) / (d1 + 2);
        }
    }

    var cv = makeCanvas(size, size);
    var g = cv.getContext('2d');
    var img = g.createImageData(size, size);
    for (var yy = 0; yy < size; yy++) {
        for (var xx = 0; xx < size; xx++) {
            var kk = yy * size + xx;
            var t;
            if (crack[kk]) {
                t = 0;
            } else {
                var tone = cells[owner[kk]].tone;
                t = tone < 0.25 ? 1 : (tone < 0.82 ? 2 : 3);
                var up = crack[((yy - 1 + size) % size) * size + xx];
                var left = crack[yy * size + (xx - 1 + size) % size];
                var down = crack[((yy + 1) % size) * size + xx];
                var right = crack[yy * size + (xx + 1) % size];
                if (up || left) {
                    t = Math.min(4, t + 1);
                } else if (down || right) {
                    t = Math.max(1, t - 1);
                } else if (lean[kk] < -0.75) {
                    t = Math.min(3, t + 1);
                } else if (lean[kk] > 0.8) {
                    t = Math.max(1, t - 1);
                }
                if (rnd() < 0.05) {
                    t = clamp(t + (rnd() < 0.5 ? -1 : 1), 1, 3);
                }
            }
            var col = ramp[t];
            img.data[kk * 4] = col[0];
            img.data[kk * 4 + 1] = col[1];
            img.data[kk * 4 + 2] = col[2];
            img.data[kk * 4 + 3] = 255;
        }
    }
    g.putImageData(img, 0, 0);
    return cv;
}

// Packed earth: clumpy two-tone noise with the odd pebble and root.
function makeDirtTile(size, ramp, seed) {
    var rnd = seededRandom(seed);
    var cv = makeCanvas(size, size);
    var g = cv.getContext('2d');
    for (var y = 0; y < size; y++) {
        for (var x = 0; x < size; x++) {
            var clump = hash01(Math.floor(x / 3) * 7.1 + Math.floor(y / 2) * 3.3 + seed);
            var t = clump > 0.7 ? 1 : 2;
            if (rnd() < 0.08) {
                t = t === 1 ? 2 : 1;
            }
            g.fillStyle = rgb(ramp[t]);
            g.fillRect(x, y, 1, 1);
        }
    }
    for (var p = 0; p < 7; p++) {
        var px = Math.floor(rnd() * (size - 3));
        var py = Math.floor(rnd() * (size - 3));
        g.fillStyle = rgb(ramp[3]);
        g.fillRect(px, py, 2, 1);
        g.fillStyle = rgb(ramp[4]);
        g.fillRect(px, py, 1, 1);
        g.fillStyle = rgb(ramp[0]);
        g.fillRect(px, py + 1, 2, 1);
    }
    return cv;
}

// The background rock is pushed well back - darker, cooler, less saturated - so the
// ledges you actually land on always pop off it, the way Jump King separates its
// foreground blocks from the scenery.
function wallTone(c) {
    var grey = (c[0] + c[1] + c[2]) / 3;
    return mix(scaleRgb(c, 0.4), [grey * 0.3, grey * 0.32, grey * 0.42], 0.5);
}

var tileCache = {};

function tileFor(kind, base) {
    var q = [Math.round(base[0] / 8) * 8, Math.round(base[1] / 8) * 8, Math.round(base[2] / 8) * 8];
    var key = kind + ':' + q.join(',');
    var hit = tileCache[key];
    if (hit) {
        return hit;
    }
    var ramp;
    var tile;
    if (kind === 'wall') {
        ramp = makeRamp(wallTone(q));
        tile = makeRockTile(48, 13, ramp, 7);
    } else if (kind === 'ledge') {
        ramp = makeRamp(scaleRgb(q, 1.12));
        tile = makeRockTile(24, 7, ramp, 3);
    } else {
        ramp = makeRamp(q);
        tile = makeDirtTile(32, ramp, 5);
    }
    hit = { pattern: pixelCtx.createPattern(upscale(tile), 'repeat'), ramp: ramp };
    tileCache[key] = hit;
    return hit;
}

// ============================================
// SKY + DISTANCE (screen space): dithered sky bands, sun/moon, stars, three parallax
// mountain ranges you slowly climb above, drifting clouds.
// ============================================
var SKY_KEYS = [
    { m: 0, top: [62, 104, 170], bottom: [248, 186, 130] },
    { m: 280, top: [56, 116, 198], bottom: [170, 214, 238] },
    { m: 620, top: [44, 50, 124], bottom: [238, 138, 108] },
    { m: 920, top: [22, 20, 58], bottom: [100, 52, 106] },
    { m: 1200, top: [8, 8, 26], bottom: [36, 28, 70] },
];

function skyAt(meters) {
    for (var i = 0; i < SKY_KEYS.length - 1; i++) {
        var a = SKY_KEYS[i];
        var b = SKY_KEYS[i + 1];
        if (meters <= b.m) {
            var t = clamp((meters - a.m) / (b.m - a.m), 0, 1);
            return { top: mix(a.top, b.top, t), bottom: mix(a.bottom, b.bottom, t) };
        }
    }
    var last = SKY_KEYS[SKY_KEYS.length - 1];
    return { top: last.top, bottom: last.bottom };
}

var MOUNTAIN_LAYERS = [
    { seed: 2.1, anchor: 0.5, height: 0.3, parallax: 0.012, atmos: 0.72, freq: 0.045 },
    { seed: 5.7, anchor: 0.64, height: 0.27, parallax: 0.022, atmos: 0.48, freq: 0.06 },
    { seed: 9.3, anchor: 0.8, height: 0.24, parallax: 0.038, atmos: 0.24, freq: 0.08 },
];

var distanceCache = { key: '', sky: null, mountains: [], clouds: [] };

function buildMountainLayer(aw, ah, layer, sky) {
    var peakH = Math.round(ah * layer.height);
    var lh = peakH + ah;
    var c = makeCanvas(aw, lh);
    var g = c.getContext('2d');
    var base = mix([64, 70, 108], sky.bottom, layer.atmos);
    var lit = mix(scaleRgb(base, 1.25), sky.bottom, 0.25);
    var snowLit = mix([240, 244, 255], sky.bottom, layer.atmos * 0.6);
    var snowShade = mix([170, 182, 220], sky.bottom, layer.atmos * 0.6);
    var tops = [];
    for (var x = 0; x <= aw; x++) {
        var v = 0.66 * (1 - Math.abs(Math.sin(x * layer.freq + layer.seed))) +
            0.26 * (1 - Math.abs(Math.sin(x * layer.freq * 2.3 + layer.seed * 2))) +
            0.08 * Math.sin(x * layer.freq * 5.1 + layer.seed);
        tops.push(Math.round((1 - v) * peakH));
    }
    var snowLine = Math.round(peakH * 0.34);
    for (var col = 0; col < aw; col++) {
        var top = tops[col];
        // Lit where the ridge falls away to the right over a few columns (the face turned
        // toward the sun) - comparing single neighbours flickered into vertical stripes.
        var litSide = tops[Math.min(aw, col + 2)] - tops[Math.max(0, col - 2)] >= 0;
        var wob = Math.round(Math.sin(col * 0.31 + layer.seed) * 1.5);
        for (var y = top; y < lh; y++) {
            var snowy = y < snowLine + wob;
            if (snowy) {
                g.fillStyle = rgb(litSide ? snowLit : snowShade);
            } else {
                g.fillStyle = rgb(litSide ? lit : base);
            }
            g.fillRect(col, y, 1, snowy ? 1 : lh - y);
            if (!snowy) {
                break;
            }
        }
    }
    return { canvas: c, peakH: peakH };
}

function buildCloud(seed, lit, shade) {
    var rnd = seededRandom(seed);
    var w = 22 + Math.floor(rnd() * 18);
    var h = 9 + Math.floor(rnd() * 4);
    var c = makeCanvas(w, h);
    var g = c.getContext('2d');
    var blobs = [];
    for (var i = 0; i < 4; i++) {
        blobs.push({ x: w * (0.2 + 0.6 * (i / 3)) + (rnd() - 0.5) * 4, y: h * 0.62, r: h * (0.3 + rnd() * 0.32) });
    }
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            var inside = y >= h - 2 ? (x > 2 && x < w - 3) : false;
            for (var b = 0; b < blobs.length && !inside; b++) {
                var dx = x - blobs[b].x;
                var dy = y - blobs[b].y;
                inside = dx * dx + dy * dy <= blobs[b].r * blobs[b].r;
            }
            if (inside) {
                g.fillStyle = rgb(y > h * 0.62 ? shade : lit);
                g.fillRect(x, y, 1, 1);
            }
        }
    }
    return c;
}

function refreshDistance(aw, ah, meters) {
    var key = aw + 'x' + ah + ':' + Math.round(meters / 5);
    if (distanceCache.key === key) {
        return distanceCache;
    }
    var sky = skyAt(meters);
    var c = makeCanvas(aw, ah);
    var g = c.getContext('2d');
    var bands = 9;
    for (var b = 0; b < bands; b++) {
        var y0 = Math.floor(b * ah / bands);
        var y1 = Math.floor((b + 1) * ah / bands);
        g.fillStyle = rgb(mix(sky.top, sky.bottom, b / (bands - 1)));
        g.fillRect(0, y0, aw, y1 - y0);
        if (b < bands - 1) {
            // Ordered dither into the next band (12% / 25% / 50%) - the classic way to fake a
            // gradient with flat colours instead of letting a smooth blend turn to mud.
            g.fillStyle = rgb(mix(sky.top, sky.bottom, (b + 1) / (bands - 1)));
            for (var x = 0; x < aw; x++) {
                if (x % 8 === 3) { g.fillRect(x, y1 - 3, 1, 1); }
                if (x % 4 === 1) { g.fillRect(x, y1 - 2, 1, 1); }
                if (x % 2 === 0) { g.fillRect(x, y1 - 1, 1, 1); }
            }
        }
    }
    var mountains = [];
    for (var i = 0; i < MOUNTAIN_LAYERS.length; i++) {
        mountains.push(buildMountainLayer(aw, ah, MOUNTAIN_LAYERS[i], sky));
    }
    var nightT = clamp((meters - 700) / 400, 0, 1);
    var cloudLit = mix(mix([255, 255, 255], sky.bottom, 0.25), [70, 70, 110], nightT * 0.7);
    var cloudShade = mix(mix([206, 216, 240], sky.top, 0.3), [44, 44, 80], nightT * 0.7);
    var clouds = [];
    for (var k = 0; k < 5; k++) {
        clouds.push(buildCloud(k * 13 + 1, cloudLit, cloudShade));
    }
    distanceCache = { key: key, sky: c, mountains: mountains, clouds: clouds };
    return distanceCache;
}

function drawDistance(aw, ah, camTopWorldY, meters, now) {
    var d = refreshDistance(aw, ah, meters);
    var P = ART;
    ctx.drawImage(d.sky, 0, 0, aw * P, ah * P);

    var climbArt = Math.max(0, snap(-camTopWorldY));

    var dayT = clamp(1 - meters / 700, 0, 1);
    if (dayT > 0.02) {
        var sunX = Math.round(aw * 0.72);
        var sunY = Math.round(ah * 0.2 + (1 - dayT) * ah * 0.35);
        ctx.globalAlpha = 0.18 * dayT;
        drawSprite(SUN_HALO, sunX - 14, sunY - 14);
        ctx.globalAlpha = dayT;
        drawSprite(SUN_SPRITE, sunX - 9, sunY - 9);
        ctx.globalAlpha = 1;
    }

    var nightT = clamp((meters - 650) / 450, 0, 1);
    if (nightT > 0.02) {
        for (var s = 0; s < stars.length; s++) {
            var star = stars[s];
            var sy = snap(star.y - camTopWorldY * 0.1);
            if (sy < 0 || sy >= ah) {
                continue;
            }
            var sx = Math.floor(star.x * aw);
            var twinkle = 0.5 + 0.5 * Math.sin(now / 600 + star.tw);
            ctx.fillStyle = 'rgba(255,255,240,' + (nightT * (0.35 + 0.65 * twinkle)) + ')';
            artRect(sx, sy, 1, 1);
            if (star.r > 1.5 && twinkle > 0.6) {
                artRect(sx - 1, sy, 3, 1);
                artRect(sx, sy - 1, 1, 3);
            }
        }
        ctx.globalAlpha = nightT;
        drawSprite(MOON_SPRITE, Math.round(aw * 0.24), Math.round(ah * 0.16));
        ctx.globalAlpha = 1;
    }

    for (var i = 0; i < d.mountains.length; i++) {
        var layer = MOUNTAIN_LAYERS[i];
        var m = d.mountains[i];
        var my = Math.round(ah * layer.anchor - m.peakH + climbArt * layer.parallax);
        if (my < ah) {
            ctx.drawImage(m.canvas, 0, my * P, aw * P, m.canvas.height * P);
        }
    }

    // Clouds drift sideways on their own and slide down past you as you climb.
    for (var c = 0; c < d.clouds.length; c++) {
        var cloud = d.clouds[c];
        var span = aw + cloud.width + 20;
        var cx = Math.floor(((hash01(c * 4.7) * span + now / 1000 * (2 + c * 0.9)) % span)) - cloud.width - 10;
        var spanY = ah + 60;
        var cy = Math.floor((hash01(c * 9.1) * spanY + climbArt * (0.08 + c * 0.02)) % spanY) - 30;
        drawSprite(cloud, cx, cy);
    }
}

// ============================================
// CLIFF WALLS (world space) - rock walls up both sides, a gap of open sky between them,
// crag edges that step and slope, grass or snow on every exposed top, vines or icicles
// under every overhang.
// ============================================
var GRASS = [[34, 70, 46], [58, 118, 56], [98, 166, 70], [156, 204, 92]];
var SNOW = [[118, 138, 190], [190, 208, 238], [236, 244, 255], [255, 255, 255]];
// Dimmer versions for the background walls' crag tops, so they never read as a ledge.
var WALL_GRASS = [[22, 44, 36], [34, 70, 46], [52, 96, 54], [70, 116, 62]];
var WALL_SNOW = [[70, 82, 118], [110, 124, 160], [140, 154, 190], [160, 172, 206]];
var FLOWER_COLORS = ['rgb(240,96,96)', 'rgb(250,218,96)', 'rgb(250,250,250)', 'rgb(176,128,232)'];

function edgeNoise(b, side) {
    var s = side * 17.3 + 3.1;
    return clamp(0.5 + 0.3 * Math.sin(b * 0.19 + s) + 0.18 * Math.sin(b * 0.53 + s * 1.9) + (hash01(b * 1.31 + s) - 0.5) * 0.4, 0, 1);
}

// How many art px of rock stick out from that side at this (world art) row: mostly flat
// steps (crags) with the odd slope between them.
function wallEdge(worldArtY, side) {
    var b = worldArtY / 7;
    var b0 = Math.floor(b);
    var v = edgeNoise(b0, side);
    if (hash01(b0 * 3.7 + side * 11) < 0.4) {
        v = lerp(v, edgeNoise(b0 + 1, side), b - b0);
    }
    return Math.round(WORLD_ART_W * (0.07 + 0.25 * v));
}

function climateAt(worldArtY) {
    return zoneVisual(metersFromY(worldArtY * ART)).cold;
}

// Grass / snow / bare-rock cap across an exposed top surface, art coords.
function drawCap(left, top, w, cold, seed, ramp, onWall) {
    var x;
    var hv;
    var grass = onWall ? WALL_GRASS : GRASS;
    var snow = onWall ? WALL_SNOW : SNOW;
    if (cold > 0.6) {
        ctx.fillStyle = rgb(snow[2]);
        artRect(left, top, w, 2);
        ctx.fillStyle = rgb(snow[3]);
        artRect(left + 1, top, Math.max(0, w - 2), 1);
        for (x = 0; x < w; x++) {
            hv = hash01((left + x) * 0.73 + seed);
            if (hv < 0.45) {
                ctx.fillStyle = rgb(snow[1]);
                artRect(left + x, top + 2, 1, 1 + (hv < 0.15 ? 1 : 0));
            }
        }
    } else if (cold < 0.3) {
        ctx.fillStyle = rgb(grass[1]);
        artRect(left, top, w, 2);
        ctx.fillStyle = rgb(grass[2]);
        artRect(left, top, w, 1);
        for (x = 0; x < w; x++) {
            hv = hash01((left + x) * 0.61 + seed);
            if (hv < 0.4) {
                ctx.fillStyle = rgb(grass[hv < 0.12 ? 0 : 1]);
                artRect(left + x, top + 2, 1, hv < 0.2 ? 2 : 1);
            }
            if (hv > 0.7) {
                ctx.fillStyle = rgb(grass[hv > 0.88 ? 3 : 2]);
                artRect(left + x, top - 1, 1, 1);
                if (hv > 0.93) {
                    artRect(left + x, top - 2, 1, 1);
                }
            }
            if (!onWall && hv > 0.375 && hv < 0.4) {
                ctx.fillStyle = FLOWER_COLORS[Math.floor(hash01(left + x + seed) * FLOWER_COLORS.length)];
                artRect(left + x, top - 2, 1, 1);
            }
        }
    } else if (ramp) {
        ctx.fillStyle = rgb(ramp[4]);
        artRect(left, top, w, 1);
        for (x = 0; x < w; x++) {
            if (hash01((left + x) * 0.47 + seed) < 0.12) {
                ctx.fillStyle = 'rgb(176,180,96)';
                artRect(left + x, top + 1, 1, 1);
            }
        }
    }
}

// Vines / roots (warm) or icicles (cold) hanging from an underside, art coords.
function drawDrips(left, bottom, w, cold, seed, onWall) {
    var grass = onWall ? WALL_GRASS : GRASS;
    var snow = onWall ? WALL_SNOW : SNOW;
    for (var x = 0; x < w; x++) {
        var hv = hash01((left + x) * 0.83 + seed);
        if (hv > 0.24) {
            continue;
        }
        var len = 2 + Math.floor(hash01((left + x) * 1.7 + seed) * (cold > 0.6 ? 5 : 8));
        if (cold > 0.6) {
            ctx.fillStyle = rgb(snow[1]);
            artRect(left + x, bottom, 1, len);
            ctx.fillStyle = rgb(snow[3]);
            artRect(left + x, bottom, 1, 1);
        } else if (cold < 0.45) {
            ctx.fillStyle = rgb(grass[1]);
            artRect(left + x, bottom, 1, len);
            ctx.fillStyle = rgb(grass[2]);
            for (var l = 1; l < len; l += 2) {
                artRect(left + x + (l % 4 === 1 ? 1 : -1), bottom + l, 1, 1);
            }
        }
    }
}

// `pad` is how far (art px) the view extends past each side of the fixed-width world: that
// strip is solid rock, so the playfield's edges always read as walls on any screen shape.
function drawCliffWalls(ah, camTopArt, pad) {
    var WA = WORLD_ART_W;
    var rows = ah + 4;
    var L = [];
    var R = [];
    var i;
    for (i = 0; i < rows + 2; i++) {
        L.push(wallEdge(camTopArt - 2 + i, 0));
        R.push(wallEdge(camTopArt - 2 + i, 1));
    }

    ctx.fillStyle = OUTLINE;
    for (i = 1; i <= rows; i++) {
        var wy = camTopArt - 2 + i;
        var lo = Math.max(L[i - 1], L[i], L[i + 1]) + 1;
        var ro = Math.max(R[i - 1], R[i], R[i + 1]) + 1;
        artRect(-pad, wy, lo + pad, 1);
        artRect(WA - ro, wy, ro + pad, 1);
    }

    var CHUNK = 16;
    for (var c0 = 1; c0 <= rows; c0 += CHUNK) {
        var midY = camTopArt - 2 + c0 + CHUNK / 2;
        var tile = tileFor('wall', zoneVisual(metersFromY(midY * ART)).color);
        var cold = climateAt(midY);
        var end = Math.min(rows, c0 + CHUNK - 1);
        ctx.fillStyle = tile.pattern;
        for (i = c0; i <= end; i++) {
            artRect(-pad, camTopArt - 2 + i, L[i] + pad, 1);
            artRect(WA - R[i], camTopArt - 2 + i, R[i] + pad, 1);
        }
        // Rim light down the right wall (it faces the sun), a shaded lip on the left one.
        for (i = c0; i <= end; i++) {
            var y = camTopArt - 2 + i;
            ctx.fillStyle = rgb(tile.ramp[1]);
            artRect(L[i] - 1, y, 1, 1);
            ctx.fillStyle = rgb(tile.ramp[4]);
            artRect(WA - R[i], y, 1, 1);
        }
        for (i = c0; i <= end; i++) {
            var yy = camTopArt - 2 + i;
            if (L[i] > L[i - 1]) {
                drawCap(L[i - 1] - 1, yy, L[i] - L[i - 1] + 1, cold, yy * 0.37, tile.ramp, true);
            }
            if (R[i] > R[i - 1]) {
                drawCap(WA - R[i], yy, R[i] - R[i - 1] + 1, cold, yy * 0.53 + 9, tile.ramp, true);
            }
            if (L[i] > L[i + 1]) {
                drawDrips(L[i + 1], yy + 2, L[i] - L[i + 1], cold, yy * 0.29, true);
            }
            if (R[i] > R[i + 1]) {
                drawDrips(WA - R[i], yy + 2, R[i] - R[i + 1], cold, yy * 0.41 + 5, true);
            }
        }
    }

    drawWallDetails(rows, camTopArt, L, R, pad);
}

// Scattered moss, bushes, snow patches and cracks on the rock itself, placed on a world
// grid so they stay put while the camera moves.
function drawWallDetails(rows, camTopArt, L, R, pad) {
    var WA = WORLD_ART_W;
    var CELL = 12;
    var startY = Math.floor((camTopArt - 2) / CELL) * CELL;
    for (var cy = startY; cy < camTopArt + rows; cy += CELL) {
        var idx = cy - (camTopArt - 2);
        if (idx < 1 || idx > rows) {
            continue;
        }
        var cold = climateAt(cy);
        for (var cx = -Math.ceil(pad / CELL) * CELL; cx < WA + pad; cx += CELL) {
            var hv = hash01(cx * 0.37 + cy * 0.61 + 4.4);
            if (hv > 0.2) {
                continue;
            }
            var x = cx + Math.floor(hash01(cx + cy * 1.3) * 6);
            var inLeft = x + 6 < L[idx] - 1;
            var inRight = x > WA - R[idx] + 1;
            if (!inLeft && !inRight) {
                continue;
            }
            var kind = hash01(cx * 1.9 + cy * 0.7);
            if (kind < 0.4) {
                // crack: dark diagonal with a lit lower lip
                ctx.fillStyle = 'rgba(16,10,24,0.55)';
                artRect(x, cy, 1, 2);
                artRect(x + 1, cy + 2, 1, 2);
                artRect(x + 2, cy + 4, 1, 1);
                ctx.fillStyle = 'rgba(255,240,210,0.14)';
                artRect(x + 1, cy, 1, 2);
                artRect(x + 2, cy + 2, 1, 2);
            } else if (cold > 0.6) {
                ctx.fillStyle = rgb(WALL_SNOW[2]);
                artRect(x, cy, 4, 1);
                artRect(x + 1, cy - 1, 2, 1);
                ctx.fillStyle = rgb(WALL_SNOW[1]);
                artRect(x, cy + 1, 4, 1);
            } else if (cold < 0.35) {
                // tuft / little bush with a flower or two
                ctx.fillStyle = rgb(WALL_GRASS[0]);
                artRect(x, cy + 1, 5, 2);
                ctx.fillStyle = rgb(WALL_GRASS[1]);
                artRect(x + 1, cy, 3, 2);
                ctx.fillStyle = rgb(WALL_GRASS[2]);
                artRect(x + 1, cy, 2, 1);
                if (kind > 0.8) {
                    ctx.fillStyle = FLOWER_COLORS[Math.floor(kind * 40) % FLOWER_COLORS.length];
                    artRect(x + 3, cy, 1, 1);
                }
            } else {
                ctx.fillStyle = 'rgba(176,180,96,0.6)';
                artRect(x, cy, 2, 1);
                artRect(x + 1, cy + 1, 2, 1);
            }
        }
    }
}

// ============================================
// SKINS - palette swaps of the climber, unlocked by achievements (see SKINS in sim.js).
// ============================================
const SKIN_PALETTES = {
    clasico: {},
    glaciar: { h: '#e2f5ff', r: '#4aa8e0', R: '#2a6a9c', w: '#ffffff', y: '#d6eaf8', Y: '#8fb3cc', p: '#3b4a66', P: '#26304a', t: '#9ad8ff', T: '#4a90c0' },
    turbo: { h: '#ffd27a', r: '#ff8c1a', R: '#b85a00', w: '#ff9b8a', y: '#e2493b', Y: '#9c2a22', p: '#2a2a33', P: '#18181f', t: '#ffd23a', T: '#c49a10' },
    diario: { h: '#c8f5b0', r: '#5cbf4a', R: '#2f7a2a', w: '#a8f0e0', y: '#3cc4a8', Y: '#1f7f6c', t: '#f2c25a', T: '#a9781f' },
    nocturno: { h: '#d8c0ff', r: '#7a4ad0', R: '#4a2a8a', w: '#7a7a9a', y: '#3a3a58', Y: '#24243a', p: '#2a2a3a', P: '#18182a', t: '#c8a8ff', T: '#7a4ad0' },
    cumbre: { h: '#fff6c8', r: '#f2c25a', R: '#a9781f', w: '#ffffff', y: '#eef0f6', Y: '#b8bccb', p: '#c9493b', P: '#8a2a22', t: '#f2c25a', T: '#a9781f' },
};
const GHOST_PALETTE = {
    h: '#f0f6ff', r: '#c8d8ff', R: '#9aaee0', H: '#9aaee0', s: '#e8eeff', S: '#b8c6ee', e: '#5a6aa0',
    w: '#f0f6ff', y: '#c8d8ff', Y: '#9aaee0', b: '#7a8ac0', g: '#f0f6ff', p: '#a8b8e8', P: '#8090c8', t: '#e0ecff', T: '#a8b8e8',
};

const skinFrameCache = {};

function framesFor(palette) {
    const frames = buildFrames(palette);
    frames.blink = buildFrames(Object.assign({}, palette, { e: palette.S })).idle;
    return frames;
}

export function skinFrames(skin) {
    if (!skinFrameCache[skin]) {
        skinFrameCache[skin] = skin === 'ghost'
            ? framesFor(GHOST_PALETTE)
            : framesFor(Object.assign({}, CLIMBER_PALETTE, SKIN_PALETTES[skin] || {}));
    }
    return skinFrameCache[skin];
}

// Draw one of the climber's frames, upscaled and crisp, into an HTML canvas (overlays,
// skin picker, route marker).
export function drawFrameInto(el, skin, frameName, scale) {
    if (!el || !el.getContext) {
        return;
    }
    const sprite = skinFrames(skin)[frameName].canvas;
    el.width = sprite.width * scale;
    el.height = sprite.height * scale;
    const g = el.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, el.width, el.height);
    g.drawImage(sprite, 0, 0, el.width, el.height);
}

export { makeRamp, rgb };

// ============================================
// DITHER FADE - 17 ordered-dither levels (4x4 Bayer), so fades to black happen in visible
// pixel steps like an old console instead of a smooth alpha blend.
// ============================================
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const ditherPatterns = [];

function ditherPattern(level, color) {
    const key = level + color;
    if (!ditherPatterns[key]) {
        const c = makeCanvas(4, 4);
        const g = c.getContext('2d');
        g.fillStyle = color;
        for (let i = 0; i < 16; i++) {
            if (BAYER4[i] < level) {
                g.fillRect(i % 4, Math.floor(i / 4), 1, 1);
            }
        }
        ditherPatterns[key] = pixelCtx.createPattern(upscale(c), 'repeat');
    }
    return ditherPatterns[key];
}

function drawDitherFade(amount, color) {
    const level = Math.round(clamp(amount, 0, 1) * 16);
    if (level <= 0) {
        return;
    }
    ctx.fillStyle = level >= 16 ? color : ditherPattern(level, color);
    artRect(0, 0, view.aw, view.ah);
}

// ============================================
// LEDGES + GROUND
// ============================================
const LEDGE_THICKNESS = 10; // art px - visual only, landing still happens on the top surface

function drawLedge(l, now) {
    if (l.isGround) {
        drawGround(l, now);
        return;
    }
    const left = snap(l.x - l.width / 2);
    const right = snap(l.x + l.width / 2);
    const w = right - left;
    const top = snap(l.y);
    const th = LEDGE_THICKNESS;
    const tile = tileFor('ledge', l.color);
    const seed = l.x * 0.13 + l.y * 0.07;

    // Cast shadow on the wall behind, then an outline with the corners knocked off so it
    // reads as a hewn block of rock rather than a box.
    ctx.fillStyle = 'rgba(12,6,24,0.35)';
    artRect(left + 2, top + th + 1, w - 1, 3);
    ctx.fillStyle = OUTLINE;
    artRect(left, top - 1, w, th + 2);
    artRect(left - 1, top, w + 2, th);

    ctx.fillStyle = tile.pattern;
    artRect(left, top, w, th);
    ctx.fillStyle = rgba(tile.ramp[0], 0.45);
    artRect(left, top + th - 2, w, 2);
    ctx.fillStyle = rgba(tile.ramp[0], 0.25);
    artRect(left + w - 2, top, 2, th - 2);

    drawCap(left, top, w, l.cold, seed, tile.ramp);
    drawDrips(left + 1, top + th + 1, w - 2, l.cold, seed + 3);

    if (l.hasBolt) {
        drawSprite(BOLT_SPRITE, snap(l.x + l.boltDx) - 2, top - 8);
    }

    if (l.isSummit) {
        const flag = FLAG_FRAMES[Math.floor(now / 380) % 2];
        drawSprite(flag, snap(l.x) - 1, top - flag.height + 1);
    }
}

// The run starts on real ground at base camp: thick grass sod over earth, a tent and a
// crackling campfire. It runs on past both edges of the world to the edges of the view.
function drawGround(l, now) {
    const pad = view.padArt;
    const left = -pad;
    const w = WORLD_ART_W + pad * 2;
    const top = snap(l.y);
    const dirt = tileFor('dirt', [122, 86, 58]);

    ctx.fillStyle = dirt.pattern;
    artRect(left, top, w, 200);
    ctx.fillStyle = OUTLINE;
    artRect(left, top - 1, w, 1);
    ctx.fillStyle = rgb(GRASS[1]);
    artRect(left, top, w, 3);
    drawCap(left, top, w, 0, 1.7, null);
    for (let x = 0; x < w; x++) {
        const hv = hash01((left + x) * 0.53 + 8.1);
        if (hv < 0.5) {
            ctx.fillStyle = rgb(GRASS[0]);
            artRect(left + x, top + 3, 1, 1 + Math.floor(hv * 6));
        }
    }

    const gx = snap(l.x);
    drawSprite(TENT_SPRITE, gx + 44, top - TENT_SPRITE.height + 1);

    const fireX = gx + 24;
    const flicker = Math.floor(now / 110) % 3;
    ctx.fillStyle = 'rgba(255,170,80,0.10)';
    artRect(fireX - 9, top - 13, 25, 13);
    ctx.fillStyle = 'rgba(255,190,90,0.10)';
    artRect(fireX - 5, top - 10, 17, 10);
    drawSprite(FIRE_FRAMES[flicker], fireX, top - 9);
    drawSprite(LOGS_SPRITE, fireX - 1, top - 4);
}

function drawRock(rock) {
    const d = clamp(Math.round((rock.r * 2) / ART), 6, 16);
    const spr = boulderSprite(d);
    // Tumbling, pixel-art style: flip through the four mirrorings instead of rotating.
    const q = Math.floor(((rock.rot % (Math.PI * 2)) + Math.PI * 2) / (Math.PI / 2)) % 4;
    const ax = snap(rock.x) - Math.floor(spr.width / 2);
    const ay = snap(rock.y) - Math.floor(spr.height / 2);
    if (q % 2 === 1) {
        ctx.save();
        ctx.translate(0, (ay * 2 + spr.height) * ART);
        ctx.scale(1, -1);
        drawSprite(spr, ax, ay, q === 3);
        ctx.restore();
    } else {
        drawSprite(spr, ax, ay, q === 2);
    }
}

function drawPickup(pk, tick, now) {
    const bob = Math.round(pickupBob(tick, pk.phase) * 3);
    const ax = snap(pk.x) - Math.floor(QUICKDRAW_SPRITE.width / 2);
    const ay = snap(pk.y) - Math.floor(QUICKDRAW_SPRITE.height / 2) + bob;
    drawSprite(QUICKDRAW_SPRITE, ax, ay);

    // Four sparkle pixels orbiting it, blinking in turn.
    const cx = ax + Math.floor(QUICKDRAW_SPRITE.width / 2);
    const cy = ay + Math.floor(QUICKDRAW_SPRITE.height / 2);
    const phase = Math.floor(now / 140);
    const spots = [[-6, -5], [6, -2], [-5, 5], [5, 6]];
    for (let i = 0; i < spots.length; i++) {
        if ((phase + i) % 4 === 0) {
            ctx.fillStyle = 'rgba(190,255,245,0.95)';
            artRect(cx + spots[i][0] - 1, cy + spots[i][1], 3, 1);
            artRect(cx + spots[i][0], cy + spots[i][1] - 1, 1, 3);
        } else if ((phase + i) % 4 === 1) {
            ctx.fillStyle = 'rgba(120,240,220,0.7)';
            artRect(cx + spots[i][0], cy + spots[i][1], 1, 1);
        }
    }
}

// ============================================
// BELAYER + ROPE + CLIMBER
// ============================================
function groundOf(sim) {
    return sim.ledges[0] && sim.ledges[0].isGround ? sim.ledges[0] : null;
}

function drawBelayer(ground) {
    if (!ground) {
        return;
    }
    drawSprite(BELAYER_FRAMES.idle.canvas, snap(ground.x - 70) - 11, snap(ground.y) - FRAME_H);
}

function playerFrame(p, charging, squash, now) {
    if (charging && p.onLedge) {
        return 'crouch';
    }
    if (!p.onLedge) {
        return p.vy < 0 ? 'jump' : 'fall';
    }
    if (squash < 0.86) {
        return 'crouch'; // landing recoil
    }
    // An occasional blink while standing still.
    return (now % 3400) < 140 ? 'blink' : 'idle';
}

function drawRope(px, py, frame, ground, now) {
    const topX = snap(px);
    const topY = snap(py + PLAYER_RADIUS) - FRAME_H + frame.harness;
    const endX = ground ? snap(ground.x - 70) + 2 : topX;
    const endY = ground ? snap(ground.y) - FRAME_H + BELAYER_FRAMES.idle.harness : topY + 400;

    // Always run the full rope down to the belayer and let the canvas clip whatever is
    // off-screen - stopping at the first point below the viewport left the rope cut short.
    const segments = 9;
    const pts = [[topX, topY]];
    for (let i = 1; i <= segments; i++) {
        const t = i / segments;
        pts.push([
            Math.round(lerp(topX, endX, t) + Math.sin(now / 850 + t * 3.4) * 5 * t),
            Math.round(lerp(topY, endY, t)),
        ]);
    }
    ctx.fillStyle = 'rgb(120,30,40)';
    for (let s = 0; s < segments; s++) {
        artLine(pts[s][0], pts[s][1] + 1, pts[s + 1][0], pts[s + 1][1] + 1);
    }
    ctx.fillStyle = 'rgb(226,72,72)';
    for (let s = 0; s < segments; s++) {
        artLine(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]);
    }
}

function drawClimber(frames, frameName, px, py, faceLeft, shakeArt) {
    const frame = frames[frameName];
    drawSprite(frame.canvas, snap(px) - 11 + shakeArt, snap(py + PLAYER_RADIUS) - FRAME_H, faceLeft);
}

// Only the first half of the arc, fading out: you see the launch direction but still have
// to judge where you'll land. Integrates exactly like sim.js, so it never lies.
function drawTrajectoryPreview(sim, aimMilli, ticksHeld) {
    const p = sim.player;
    const res = calcJumpVelocities(chargePower(ticksHeld), aimMilli / 1000, p.stamina);
    let x = p.x;
    let y = p.y;
    let vx = res.vx;
    let vy = res.vy;
    const deathLine = fallLimitY(sim);
    const dots = 13;
    for (let i = 0; i < dots; i++) {
        for (let k = 0; k < 5; k++) {
            vy += GRAVITY * DT;
            x += vx * DT;
            y += vy * DT;
        }
        if (y > deathLine) {
            break;
        }
        const alpha = 0.85 * (1 - i / dots);
        ctx.fillStyle = 'rgba(27,20,32,' + (alpha * 0.6) + ')';
        artRect(snap(x) - 1, snap(y) - 1, 3, 3);
        ctx.fillStyle = 'rgba(255,214,110,' + alpha + ')';
        artRect(snap(x) - 1, snap(y) - 1, 2, 2);
    }
}

// Floating pollen low down, snow up high - stateless, positions are a pure function of
// time, so there's nothing to update or spawn.
function drawAmbient(meters, now, camTopArt, reduced) {
    const aw = view.aw;
    const ah = view.ah;
    const cold = zoneVisual(meters).cold;
    const t = now / 1000;
    let count = cold > 0.45 ? 34 : 12;
    if (reduced) {
        count = Math.floor(count / 3);
    }
    for (let i = 0; i < count; i++) {
        const speed = 6 + hash01(i * 3.3) * 10;
        const x = Math.floor((hash01(i * 7.7) * aw + t * (cold > 0.45 ? -4 : 3) + Math.sin(t * 0.8 + i) * 4 + aw * 10) % aw);
        const y = Math.floor((hash01(i * 1.9) * ah + t * speed - camTopArt * 0.5 + ah * 1000) % ah);
        if (cold > 0.45) {
            ctx.fillStyle = 'rgba(255,255,255,' + (0.5 + hash01(i) * 0.5) + ')';
            const big = hash01(i * 5.1) > 0.75 ? 2 : 1;
            artRect(x, y, big, big);
        } else {
            ctx.fillStyle = i % 3 === 0 ? 'rgba(255,214,120,0.7)' : 'rgba(190,230,130,0.5)';
            artRect(x, y, 1, 1);
        }
    }
}

// ============================================
// TEXT OVERLAYS (crisp, drawn on the real canvas after the pixel blit)
// ============================================
function pixelText(text, x, y, size, color, alpha) {
    realCtx.font = size + "px 'Press Start 2P', monospace";
    realCtx.textAlign = 'center';
    realCtx.fillStyle = 'rgba(20,12,28,' + alpha + ')';
    realCtx.fillText(text, x + 2, y + 2);
    realCtx.fillStyle = color;
    realCtx.globalAlpha = alpha;
    realCtx.fillText(text, x, y);
    realCtx.globalAlpha = 1;
}

function drawZoneBanner(banner, w, h) {
    if (!banner) {
        return;
    }
    const t = banner.age / banner.life;
    const alpha = t < 0.15 ? t / 0.15 : (t > 0.75 ? Math.max(0, (1 - t) / 0.25) : 1);
    const y = Math.round(h * 0.3);

    // Same pixel-frame language as the HTML overlays: an ink band with gold rules top and
    // bottom, and text with a hard drop shadow.
    realCtx.fillStyle = 'rgba(27,20,32,' + (0.82 * alpha) + ')';
    realCtx.fillRect(0, y - 26, w, 52);
    realCtx.fillStyle = 'rgba(242,194,90,' + alpha + ')';
    realCtx.fillRect(0, y - 30, w, 4);
    realCtx.fillRect(0, y + 26, w, 4);
    realCtx.fillStyle = 'rgba(169,120,31,' + alpha + ')';
    realCtx.fillRect(0, y - 26, w, 2);
    realCtx.fillRect(0, y + 24, w, 2);
    // Not uppercased: the pixel font has no accented capitals.
    pixelText(banner.text, w / 2, y + 7, 14, 'rgb(242,194,90)', alpha);
}

// ============================================
// FRAME
// ============================================
function blit() {
    realCtx.setTransform(1, 0, 0, 1, 0, 0);
    realCtx.imageSmoothingEnabled = false;
    realCtx.clearRect(0, 0, realCanvas.width, realCanvas.height);
    realCtx.drawImage(pixelCanvas, 0, 0, view.aw, view.ah, 0, 0, view.aw * view.devPerArt, view.ah * view.devPerArt);
    realCtx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
}

function vignette() {
    const w = view.cssW;
    const h = view.cssH;
    const vgn = realCtx.createRadialGradient(w / 2, h / 2, h * 0.4, w / 2, h / 2, h * 0.9);
    vgn.addColorStop(0, 'rgba(0,0,0,0)');
    vgn.addColorStop(1, 'rgba(10,4,20,0.32)');
    realCtx.fillStyle = vgn;
    realCtx.fillRect(0, 0, w, h);
}

// `state`: { sim, alpha, now, skin, charging, aimMilli, ticksHeld, squash, shake,
//            particles, popups, banner, ghost, reducedMotion, dying }
export function renderGame(state) {
    const sim = state.sim;
    const now = state.now;
    const a = state.alpha;
    const p = sim.player;

    // Interpolate between the last two simulation ticks so motion stays smooth on any
    // refresh rate, then snap the camera to whole art pixels so the world never shimmers.
    let px = lerp(sim.prevX, p.x, a);
    let py = lerp(sim.prevY, p.y, a);
    let focus = lerp(sim.prevCam, sim.camFocus, a);
    if (state.dying) {
        px = state.dying.x;
        py = state.dying.y;
        focus = state.dying.focus;
    }
    // Near the start, don't waste most of the view on earth below the ground line.
    const camTopArt = snap(Math.min(focus - view.logicalH * CAMERA_TOP_FRACTION, -view.logicalH * 0.8));
    const camTop = camTopArt * ART;
    const meters = heightMeters(sim);

    let shakeX = 0;
    let shakeY = 0;
    if (state.shake > 0 && !state.reducedMotion) {
        shakeX = Math.round((Math.random() * 2 - 1) * state.shake / ART) * ART;
        shakeY = Math.round((Math.random() * 2 - 1) * state.shake / ART) * ART;
    }

    ctx = pixelCtx;
    drawDistance(view.aw, view.ah, camTop, meters, now);

    ctx.save();
    ctx.translate(view.offsetX + shakeX, shakeY - camTop);

    drawCliffWalls(view.ah, camTopArt, view.padArt);

    for (let i = 0; i < sim.ledges.length; i++) {
        const l = sim.ledges[i];
        if (l.y < camTop - 60 || l.y > camTop + view.logicalH + 120) {
            continue;
        }
        drawLedge(l, now);
    }

    const ground = groundOf(sim);
    drawBelayer(ground);

    for (let r = 0; r < sim.rocks.length; r++) {
        drawRock(sim.rocks[r]);
    }
    for (let k = 0; k < sim.pickups.length; k++) {
        drawPickup(sim.pickups[k], sim.tick, now);
    }

    if (state.charging && p.onLedge && !state.dying) {
        drawTrajectoryPreview(sim, state.aimMilli, state.ticksHeld);
    }

    // Your best run on today's challenge, climbing alongside you.
    if (state.ghost && state.ghost.status === 'playing') {
        const g = state.ghost;
        const gp = g.player;
        ctx.globalAlpha = 0.45;
        drawClimber(skinFrames('ghost'), playerFrame(gp, g.charging, 1, now), lerp(g.prevX, gp.x, a), lerp(g.prevY, gp.y, a), gp.facing < 0, 0);
        ctx.globalAlpha = 1;
    }

    const frames = skinFrames(state.skin);
    const frameName = state.dying ? 'fall' : playerFrame(p, state.charging, state.squash, now);
    drawRope(px, py, frames[frameName], ground, now);
    let shakeArt = 0;
    if (state.charging && state.ticksHeld >= MAX_CHARGE_TICKS && !state.reducedMotion) {
        shakeArt = Math.floor(now / 45) % 2 ? 1 : -1; // straining at full power
    }
    const faceLeft = state.charging && Math.abs(state.aimMilli) > 50 ? state.aimMilli < 0 : p.facing < 0;
    drawClimber(frames, frameName, px, py, faceLeft, shakeArt);

    for (let q = 0; q < state.particles.length; q++) {
        const pt = state.particles[q];
        const alpha = 1 - pt.age / pt.life;
        const size = pt.r > 3.4 ? 2 : 1;
        ctx.fillStyle = pt.color.replace('ALPHA', String(Math.max(0, alpha * 0.9)));
        artRect(snap(pt.x), snap(pt.y), size, size);
    }

    ctx.restore();

    drawAmbient(meters, now, camTopArt, state.reducedMotion);
    if (state.dying) {
        drawDitherFade(state.dying.fade, 'rgb(14,8,26)');
    }

    blit();

    for (let u = 0; u < state.popups.length; u++) {
        const up = state.popups[u];
        const alpha = clamp(1 - up.age / up.life, 0, 1);
        const pos = toCss(up.x, up.y, camTop, shakeX, shakeY);
        pixelText(up.text, pos.x, pos.y, 11, up.color, alpha);
    }

    drawZoneBanner(state.banner, view.cssW, view.cssH);
    vignette();
}

// The animated base-camp scene behind the start overlay.
export function renderIdle(now, skin, seedSim) {
    const camTopArt = snap(-(view.logicalH - 70));
    const camTop = camTopArt * ART;

    ctx = pixelCtx;
    drawDistance(view.aw, view.ah, camTop, 0, now);
    ctx.save();
    ctx.translate(view.offsetX, -camTop);
    drawCliffWalls(view.ah, camTopArt, view.padArt);

    const ground = seedSim.ledges[0];
    drawGround(ground, now);
    for (let i = 1; i < seedSim.ledges.length; i++) {
        drawLedge(seedSim.ledges[i], now);
    }
    drawBelayer(ground);
    const frames = skinFrames(skin);
    const p = seedSim.player;
    const frameName = (now % 3400) < 140 ? 'blink' : 'idle';
    drawRope(p.x, p.y, frames[frameName], ground, now);
    drawClimber(frames, frameName, p.x, p.y, false, 0);
    ctx.restore();

    drawAmbient(0, now, camTopArt, false);
    blit();
    vignette();
}

// ============================================
// SHARE CARD - a 1200x630 pixel-art image of the result, for social networks.
// ============================================
export function makeShareCard(info) {
    const AW = 300;
    const AH = 158;
    const SCALE = 4;
    const art = makeCanvas(AW, AH);
    const prevCtx = ctx;
    ctx = art.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.setTransform(1 / ART, 0, 0, 1 / ART, 0, 0);

    const climbY = -info.height * 26;
    drawDistance(AW, AH, climbY - 400, info.height, 0);
    const zone = ZONES[Math.max(0, Math.min(ZONES.length - 1, info.zoneIndex))];
    const tile = tileFor('ledge', zone.color);
    ctx.fillStyle = OUTLINE;
    artRect(18, 112, 74, 12);
    ctx.fillStyle = tile.pattern;
    artRect(19, 113, 72, 10);
    drawCap(19, 113, 72, zone.cold, 3.3, tile.ramp);
    drawSprite(skinFrames(info.skin)[info.won ? 'jump' : 'idle'].canvas, 44, 113 - FRAME_H + 1);
    if (info.won) {
        drawSprite(FLAG_FRAMES[0], 74, 113 - FLAG_FRAMES[0].height + 1);
    }
    ctx = prevCtx;

    const out = makeCanvas(AW * SCALE, AH * SCALE);
    const g = out.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(art, 0, 0, out.width, out.height);

    // Panel + text.
    g.fillStyle = 'rgba(27,20,32,0.86)';
    g.fillRect(430, 120, 700, 390);
    g.fillStyle = '#f2c25a';
    g.fillRect(430, 120, 700, 8);
    g.fillRect(430, 502, 700, 8);
    g.fillRect(430, 120, 8, 390);
    g.fillRect(1122, 120, 8, 390);
    g.textAlign = 'left';
    const text = (str, x, y, size, color) => {
        g.font = size + "px 'Press Start 2P', monospace";
        g.fillStyle = '#1b1420';
        g.fillText(str, x + 5, y + 5);
        g.fillStyle = color;
        g.fillText(str, x, y);
    };
    text('Al Filo', 480, 200, 40, '#f2c25a');
    text(info.won ? '¡Cumbre!' : 'He llegado a', 480, 270, 22, '#fff3d6');
    text(info.height + ' m', 480, 360, 64, '#f2c25a');
    text(zone.name, 480, 420, 20, '#a99cc8');
    text(info.mode === 'daily' ? 'Reto diario ' + info.day : 'climbup.es/juego', 480, 470, 16, '#a99cc8');
    return out;
}
