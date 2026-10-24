// ============================================
// AL FILO - AUDIO
// NES-style chiptune and sound effects generated live with WebAudio, no audio files: pulse
// waves (25% / 12.5% duty), a triangle bass and noise drums, the same voices the NES had.
// Notes are scheduled slightly ahead from a short interval timer (the standard WebAudio
// "lookahead" pattern) so timing stays tight even when a frame runs long.
//
// Each stretch of the mountain has its own arrangement: the base-camp theme climbs a key
// every couple of zones, a tenser theme takes over on Denali and K2, and a slow, airy one
// plays on the way to the summit. Changes land on a bar line so the music never jolts.
// ============================================

const SETTINGS_KEY = 'climbup_game_settings';

let audioCtx = null;
let musicBus = null;
let sfxBus = null;
let leadBus = null;
let pulse25 = null;
let pulse12 = null;
let noiseBuffer = null;

const settings = loadSettings();

function loadSettings() {
    const defaults = { music: 0.8, sfx: 0.9, muted: false, reducedMotion: null };
    try {
        const raw = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || 'null');
        // The old single on/off switch, from before volumes existed.
        if (!raw && window.localStorage.getItem('climbup_game_sound_muted') === '1') {
            defaults.muted = true;
        }
        return Object.assign(defaults, raw || {});
    } catch (e) {
        return defaults;
    }
}

function saveSettings() {
    try {
        window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
        // storage blocked - settings still apply for this visit
    }
}

export function getSettings() {
    return settings;
}

export function updateSettings(patch) {
    Object.assign(settings, patch);
    saveSettings();
    applyVolumes();
    if (settings.muted || settings.music <= 0) {
        stopMusic();
    }
}

function applyVolumes() {
    if (!audioCtx) {
        return;
    }
    const now = audioCtx.currentTime;
    sfxBus.gain.setTargetAtTime(settings.muted ? 0 : settings.sfx * 0.55, now, 0.02);
    if (music.playing && !music.fading) {
        musicBus.gain.setTargetAtTime(musicLevel(), now, 0.05);
    }
}

function musicLevel() {
    return settings.muted ? 0 : settings.music * 0.34;
}

// Browsers only allow audio after a user gesture, so this runs from the first click/key.
export function ensureAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) {
            return;
        }
        audioCtx = new AC();
        setupGraph();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

function pulseWave(duty) {
    const n = 32;
    const real = new Float32Array(n);
    const imag = new Float32Array(n);
    for (let k = 1; k < n; k++) {
        real[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
    }
    return audioCtx.createPeriodicWave(real, imag);
}

function setupGraph() {
    musicBus = audioCtx.createGain();
    musicBus.gain.value = 0;
    musicBus.connect(audioCtx.destination);
    sfxBus = audioCtx.createGain();
    sfxBus.connect(audioCtx.destination);

    // Lead goes through a short feedback echo for a bit of space.
    leadBus = audioCtx.createGain();
    const delay = audioCtx.createDelay(1);
    delay.delayTime.value = 0.17;
    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.28;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.35;
    leadBus.connect(musicBus);
    leadBus.connect(delay);
    delay.connect(feedback);
    feedback.connect(delay);
    delay.connect(wet);
    wet.connect(musicBus);

    pulse25 = pulseWave(0.25);
    pulse12 = pulseWave(0.125);

    const len = Math.floor(audioCtx.sampleRate * 0.5);
    noiseBuffer = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    applyVolumes();
}

// ============================================
// VOICES
// ============================================
const NOTE_INDEX = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };

function noteMidi(name) {
    const m = /^([A-G]#?)(\d)$/.exec(name);
    return (parseInt(m[2], 10) + 1) * 12 + NOTE_INDEX[m[1]];
}

function midiFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
}

function tone(wave, freq, t, dur, vol, dest, slideTo) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    if (typeof wave === 'string') {
        osc.type = wave;
    } else {
        osc.setPeriodicWave(wave);
    }
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) {
        osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    }
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(vol, t + 0.005);
    gain.gain.setValueAtTime(vol * 0.8, t + dur * 0.6);
    gain.gain.linearRampToValueAtTime(0, t + dur);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.02);
}

function noise(t, dur, vol, dest, filterType, freq) {
    const src = audioCtx.createBufferSource();
    src.buffer = noiseBuffer;
    const filter = audioCtx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(t, Math.random() * 0.3);
    src.stop(t + dur + 0.02);
}

function kick(t, dest, vol) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, t);
    osc.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + 0.16);
}

// ============================================
// SONGS - [note, length in 16ths], one line per bar adding up to 16. null is a rest.
// ============================================
function song(def) {
    const lead = {};
    let step = 0;
    for (let i = 0; i < def.lead.length; i++) {
        const n = def.lead[i];
        if (n[0]) {
            lead[step] = { midi: noteMidi(n[0]), len: n[1] };
        }
        step += n[1];
    }
    def.leadSteps = lead;
    def.chordMidi = def.chords.map((c) => c.map(noteMidi));
    def.totalSteps = def.chords.length * 16;
    return def;
}

// Base camp: Am F C G | Am F G E || F G Em Am | F G Am E
const THEME_CAMP = song({
    chords: [
        ['A2', 'A3', 'C4', 'E4'], ['F2', 'F3', 'A3', 'C4'], ['C3', 'C4', 'E4', 'G4'], ['G2', 'G3', 'B3', 'D4'],
        ['A2', 'A3', 'C4', 'E4'], ['F2', 'F3', 'A3', 'C4'], ['G2', 'G3', 'B3', 'D4'], ['E2', 'E3', 'G#3', 'B3'],
        ['F2', 'F3', 'A3', 'C4'], ['G2', 'G3', 'B3', 'D4'], ['E2', 'E3', 'G3', 'B3'], ['A2', 'A3', 'C4', 'E4'],
        ['F2', 'F3', 'A3', 'C4'], ['G2', 'G3', 'B3', 'D4'], ['A2', 'A3', 'C4', 'E4'], ['E2', 'E3', 'G#3', 'B3'],
    ],
    lead: [
        ['E5', 4], ['A4', 2], ['C5', 2], ['E5', 4], ['D5', 2], ['C5', 2],
        ['C5', 4], ['A4', 4], ['F4', 2], ['A4', 2], ['C5', 4],
        ['G4', 2], ['C5', 2], ['E5', 4], ['G5', 4], ['E5', 2], ['C5', 2],
        ['D5', 6], ['B4', 2], ['G4', 4], ['B4', 2], ['D5', 2],
        ['E5', 4], ['A5', 4], ['G5', 2], ['E5', 2], ['C5', 4],
        ['F5', 4], ['E5', 2], ['D5', 2], ['C5', 4], ['A4', 4],
        ['B4', 2], ['D5', 2], ['G5', 4], ['F5', 2], ['E5', 2], ['D5', 4],
        ['E5', 8], ['G#4', 4], ['B4', 4],
        ['A5', 4], ['G5', 2], ['F5', 2], ['C5', 4], ['F5', 4],
        ['G5', 4], ['F5', 2], ['E5', 2], ['D5', 4], ['B4', 4],
        ['E5', 2], ['G5', 2], ['B5', 4], ['A5', 2], ['G5', 2], ['E5', 4],
        ['A5', 6], ['E5', 2], ['C5', 4], [null, 4],
        ['C5', 2], ['F5', 2], ['A5', 4], ['G5', 2], ['F5', 2], ['C5', 4],
        ['D5', 2], ['G5', 2], ['B5', 4], ['A5', 2], ['G5', 2], ['D5', 4],
        ['C6', 4], ['B5', 2], ['A5', 2], ['E5', 4], ['C5', 4],
        ['B4', 4], ['E5', 4], ['G#5', 4], ['B5', 4],
    ],
});

// High peaks (Denali, K2): driving D minor. Dm Bb C A, twice.
const THEME_PEAKS = song({
    chords: [
        ['D2', 'D3', 'F3', 'A3'], ['A#1', 'A#2', 'D3', 'F3'], ['C2', 'C3', 'E3', 'G3'], ['A1', 'A2', 'C#3', 'E3'],
        ['D2', 'D3', 'F3', 'A3'], ['A#1', 'A#2', 'D3', 'F3'], ['C2', 'C3', 'E3', 'G3'], ['A1', 'A2', 'C#3', 'E3'],
    ],
    lead: [
        ['D5', 4], ['F5', 2], ['A5', 2], ['G5', 4], ['F5', 2], ['E5', 2],
        ['F5', 4], ['D5', 4], ['A#4', 4], ['D5', 4],
        ['E5', 2], ['G5', 2], ['C6', 4], ['A#5', 2], ['A5', 2], ['G5', 4],
        ['A5', 8], ['E5', 4], ['C#5', 4],
        ['D6', 4], ['C6', 2], ['A5', 2], ['F5', 4], ['D5', 4],
        ['D5', 2], ['F5', 2], ['A#5', 4], ['A5', 2], ['G5', 2], ['F5', 4],
        ['G5', 4], ['E5', 2], ['C5', 2], ['E5', 4], ['G5', 4],
        ['A5', 4], ['G5', 2], ['F5', 2], ['E5', 4], ['C#5', 4],
    ],
});

// The way to the summit: slow and airy, long notes over a constant arpeggio.
const THEME_SUMMIT = song({
    chords: [
        ['A2', 'A3', 'C4', 'E4'], ['F2', 'F3', 'A3', 'C4'], ['C3', 'C4', 'E4', 'G4'], ['G2', 'G3', 'B3', 'D4'],
        ['A2', 'A3', 'C4', 'E4'], ['F2', 'F3', 'A3', 'C4'], ['C3', 'C4', 'E4', 'G4'], ['G2', 'G3', 'B3', 'D4'],
    ],
    lead: [
        ['E5', 8], ['A5', 8],
        ['C6', 8], ['A5', 8],
        ['G5', 8], ['E5', 4], ['D5', 4],
        ['D5', 12], [null, 4],
        ['E5', 4], ['A5', 4], ['B5', 4], ['C6', 4],
        ['A5', 8], ['F5', 8],
        ['G5', 6], ['E5', 2], ['C5', 8],
        ['B4', 8], ['D5', 8],
    ],
});

// Zone index -> arrangement.
const ZONE_MUSIC = [
    { song: THEME_CAMP, transpose: 0, bpm: 128, arp: 'b', drums: 'full', bass: 'bounce' },
    { song: THEME_CAMP, transpose: 3, bpm: 132, arp: 'b', drums: 'full', bass: 'bounce' },
    { song: THEME_CAMP, transpose: 5, bpm: 136, arp: 'always', drums: 'full', bass: 'bounce' },
    { song: THEME_CAMP, transpose: 7, bpm: 140, arp: 'always', drums: 'full', bass: 'bounce' },
    { song: THEME_PEAKS, transpose: 0, bpm: 146, arp: 'always', drums: 'drive', bass: 'drive' },
    { song: THEME_PEAKS, transpose: 2, bpm: 150, arp: 'always', drums: 'drive', bass: 'drive' },
    { song: THEME_SUMMIT, transpose: 0, bpm: 104, arp: 'always', drums: 'soft', bass: 'long' },
    { song: THEME_SUMMIT, transpose: 0, bpm: 104, arp: 'always', drums: 'soft', bass: 'long' },
];

const music = { playing: false, fading: false, step: 0, nextTime: 0, timer: null, arrangement: ZONE_MUSIC[0], pending: null };

function stepSec() {
    return 60 / music.arrangement.bpm / 4;
}

function playMusicStep(t) {
    const arr = music.arrangement;
    const s = arr.song;
    const step = music.step;
    const bar = Math.floor(step / 16);
    const inBar = step % 16;
    const chord = s.chordMidi[bar];
    const tr = arr.transpose;
    const sec = stepSec();

    const lead = s.leadSteps[step];
    if (lead) {
        tone(pulse25, midiFreq(lead.midi + tr), t, lead.len * sec * 0.92, arr.drums === 'soft' ? 0.08 : 0.11, leadBus);
    }

    if (arr.bass === 'long') {
        if (inBar === 0) {
            tone('triangle', midiFreq(chord[0] + tr), t, 16 * sec * 0.95, 0.3, musicBus);
        }
    } else if (arr.bass === 'drive') {
        const note = inBar % 4 === 2 ? chord[1] : chord[0];
        tone('triangle', midiFreq(note + tr), t, sec * 0.9, 0.3, musicBus);
    } else if (inBar % 2 === 0) {
        let note = inBar % 4 === 0 ? chord[0] : chord[1];
        if (inBar === 14) {
            note = chord[2] - 12;
        }
        tone('triangle', midiFreq(note + tr), t, sec * 1.7, 0.32, musicBus);
    }

    const arpOn = arr.arp === 'always' || (arr.arp === 'b' && bar >= 8);
    if (arpOn) {
        const arp = chord[[1, 2, 3, 2][inBar % 4]] + 12 + tr;
        tone(pulse12, midiFreq(arp), t, sec * 0.8, arr.drums === 'soft' ? 0.045 : 0.035, musicBus);
    }

    if (arr.drums === 'soft') {
        if (inBar === 0) {
            kick(t, musicBus, 0.35);
        }
        if (inBar % 4 === 2) {
            noise(t, 0.03, 0.03, musicBus, 'highpass', 7000);
        }
        return;
    }
    if (inBar === 0 || inBar === 8 || (arr.drums === 'drive' && (inBar === 6 || inBar === 11)) || (bar >= 8 && inBar === 10)) {
        kick(t, musicBus, 0.55);
    }
    if (inBar === 4 || inBar === 12) {
        noise(t, 0.12, 0.22, musicBus, 'lowpass', 1800);
    }
    if (arr.drums === 'drive' ? true : inBar % 2 === 0) {
        noise(t, 0.03, inBar % 4 === 2 ? 0.07 : 0.04, musicBus, 'highpass', 7000);
    }
}

function scheduleMusic() {
    if (!music.playing) {
        return;
    }
    while (music.nextTime < audioCtx.currentTime + 0.15) {
        // Arrangement changes wait for the next bar line.
        if (music.pending && music.step % 16 === 0) {
            const changedSong = music.pending.song !== music.arrangement.song;
            music.arrangement = music.pending;
            music.pending = null;
            if (changedSong) {
                music.step = 0;
            }
        }
        playMusicStep(music.nextTime);
        music.nextTime += stepSec();
        music.step = (music.step + 1) % music.arrangement.song.totalSteps;
    }
}

export function startMusic(zoneIndex) {
    if (!audioCtx || settings.muted || settings.music <= 0 || music.playing) {
        return;
    }
    music.arrangement = ZONE_MUSIC[zoneIndex || 0];
    music.pending = null;
    music.step = 0;
    resumeMusic();
}

// Pick up from wherever the song was (used after a pause as well as on start).
export function resumeMusic() {
    if (!audioCtx || settings.muted || settings.music <= 0 || music.playing) {
        return;
    }
    const now = audioCtx.currentTime;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicLevel(), now);
    music.playing = true;
    music.fading = false;
    music.nextTime = now + 0.08;
    scheduleMusic();
    music.timer = setInterval(scheduleMusic, 25);
}

export function stopMusic() {
    if (!music.playing) {
        return;
    }
    music.playing = false;
    clearInterval(music.timer);
    music.timer = null;
    // Fade out whatever is already scheduled instead of cutting it off mid-note.
    const now = audioCtx.currentTime;
    music.fading = true;
    musicBus.gain.cancelScheduledValues(now);
    musicBus.gain.setValueAtTime(musicBus.gain.value, now);
    musicBus.gain.linearRampToValueAtTime(0, now + 0.25);
}

export function setMusicZone(zoneIndex) {
    const next = ZONE_MUSIC[Math.min(zoneIndex, ZONE_MUSIC.length - 1)];
    if (next !== music.arrangement) {
        music.pending = next;
    }
}

export function isMusicPlaying() {
    return music.playing;
}

// ============================================
// SOUND EFFECTS - same chip voices as the music, so they sit in the same world.
// ============================================
function sfxReady() {
    return audioCtx && !settings.muted && settings.sfx > 0;
}

function sfxAt(delay) {
    return audioCtx.currentTime + (delay || 0);
}

export const sfx = {
    jump() {
        if (!sfxReady()) { return; }
        tone(pulse25, 330, sfxAt(), 0.11, 0.22, sfxBus, 720);
    },
    land(impact) {
        if (!sfxReady()) { return; }
        const t = sfxAt();
        noise(t, 0.05 + impact * 0.08, 0.18 + impact * 0.3, sfxBus, 'lowpass', 900 + impact * 900);
        tone('triangle', 140 + impact * 30, t, 0.08 + impact * 0.06, 0.5, sfxBus, 55);
    },
    wall() {
        if (!sfxReady()) { return; }
        tone(pulse25, 220, sfxAt(), 0.06, 0.18, sfxBus, 160);
    },
    rock() {
        if (!sfxReady()) { return; }
        const t = sfxAt();
        noise(t, 0.28, 0.5, sfxBus, 'lowpass', 1200);
        tone(pulse25, 320, t, 0.3, 0.2, sfxBus, 70);
    },
    pickup() {
        if (!sfxReady()) { return; }
        [1047, 1319, 1568, 2093].forEach((f, i) => tone(pulse12, f, sfxAt(i * 0.045), 0.06, 0.18, sfxBus));
    },
    combo(chain) {
        if (!sfxReady()) { return; }
        const base = 72 + Math.min(chain, 8) * 2; // climbs with the chain
        tone(pulse25, midiFreq(base), sfxAt(), 0.06, 0.16, sfxBus);
        tone(pulse25, midiFreq(base + 7), sfxAt(0.06), 0.09, 0.16, sfxBus);
    },
    precise() {
        if (!sfxReady()) { return; }
        tone(pulse12, 1568, sfxAt(), 0.05, 0.16, sfxBus);
        tone(pulse12, 2093, sfxAt(0.05), 0.12, 0.16, sfxBus);
    },
    milestone() {
        if (!sfxReady()) { return; }
        [72, 76, 79].forEach((m, i) => tone(pulse25, midiFreq(m), sfxAt(i * 0.07), 0.08, 0.15, sfxBus));
    },
    zone() {
        if (!sfxReady()) { return; }
        [69, 72, 76, 81].forEach((m, i) => tone(pulse25, midiFreq(m), sfxAt(i * 0.09), i === 3 ? 0.3 : 0.09, 0.15, sfxBus));
    },
    chargeFull() {
        if (!sfxReady()) { return; }
        tone(pulse12, 1760, sfxAt(), 0.03, 0.08, sfxBus);
    },
    fall() {
        if (!sfxReady()) { return; }
        tone(pulse25, 660, sfxAt(), 0.7, 0.2, sfxBus, 70);
    },
    ui() {
        if (!sfxReady()) { return; }
        tone(pulse12, 990, sfxAt(), 0.04, 0.12, sfxBus);
    },
    achievement() {
        if (!sfxReady()) { return; }
        [76, 79, 84, 88].forEach((m, i) => tone(pulse12, midiFreq(m), sfxAt(i * 0.06), 0.1, 0.16, sfxBus));
    },
};

// Short jingles for the end of a run: a sad little descent, or a summit fanfare.
export function playJingle(win) {
    if (!sfxReady()) {
        return;
    }
    const t = audioCtx.currentTime + 0.3;
    const bus = audioCtx.createGain();
    bus.gain.value = Math.max(settings.music, settings.sfx) * 0.34;
    bus.connect(audioCtx.destination);
    const notes = win
        ? [['C5', 1], ['E5', 1], ['G5', 1], ['C6', 2], ['G5', 1], ['C6', 4]]
        : [['E5', 1.5], ['D5', 1.5], ['C5', 1.5], ['B4', 1.5], ['A4', 4]];
    const bass = win ? ['C3', 'G2', 'C3'] : ['A2', 'E2', 'A2'];
    const beat = 0.23;
    let at = t;
    for (let i = 0; i < notes.length; i++) {
        tone(pulse25, midiFreq(noteMidi(notes[i][0])), at, notes[i][1] * beat * 0.95, 0.12, bus);
        at += notes[i][1] * beat;
    }
    const total = at - t;
    for (let b = 0; b < bass.length; b++) {
        tone('triangle', midiFreq(noteMidi(bass[b])), t + (total / bass.length) * b, (total / bass.length) * 0.95, 0.3, bus);
    }
}

// Haptics on mobile - silently a no-op wherever navigator.vibrate isn't supported.
export function vibrate(pattern) {
    if (navigator.vibrate && !settings.muted) {
        try {
            navigator.vibrate(pattern);
        } catch (e) {
            // ignore - haptics are a nice-to-have
        }
    }
}
