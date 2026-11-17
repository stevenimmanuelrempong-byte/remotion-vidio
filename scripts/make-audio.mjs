// Synthesizes music + SFX and mixes them under the voiceover.
// Music and SFX are level-locked to 50% (-6 dB) of the voice's gated RMS.
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FFMPEG = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const SR = 44100;
const tmp = path.join(ROOT, "public/_voice.wav");
execFileSync(FFMPEG, ["-y", "-v", "error", "-i", path.join(ROOT, "public/voice.mp3"), "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", tmp]);
const wavBuf = readFileSync(tmp);
unlinkSync(tmp);
let off = 12, dataOff = 44, dataLen = wavBuf.length - 44;
while (off + 8 <= wavBuf.length) { const id = wavBuf.toString("ascii", off, off + 4), sz = wavBuf.readUInt32LE(off + 4); if (id === "data") { dataOff = off + 8; dataLen = Math.min(sz, wavBuf.length - dataOff); break; } off += 8 + sz; }
const nS = Math.floor(dataLen / 2);
const voice = new Float32Array(nS);
for (let i = 0; i < nS; i++) voice[i] = wavBuf.readInt16LE(dataOff + i * 2) / 32768;
const N = voice.length;

let seed = 12345;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;

const music = new Float32Array(N);
const sfx = new Float32Array(N);
const env = (t, a, d) => (t < 0 ? 0 : Math.min(1, t / a) * Math.exp(-t / d));

function tone(buf, t0, freq, dur, amp, { type = "sine", a = 0.01, d = 0.3, vib = 0 } = {}) {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(dur * SR);
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR;
    const ph = 2 * Math.PI * freq * t + vib * Math.sin(t * 30);
    let v = type === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : type === "sq" ? Math.sign(Math.sin(ph)) * 0.5 : Math.sin(ph);
    const e = env(t, a, d) * Math.min(1, (dur - t) / 0.03);
    buf[s0 + i] += v * e * amp;
  }
}
function noise(buf, t0, dur, amp, { a = 0.01, d = 0.3, lp = 0.2, hp = 0, sweep = 0 } = {}) {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(dur * SR);
  let y = 0, yh = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR;
    const k = Math.max(0.005, Math.min(0.95, lp + sweep * (t / dur)));
    const x = rand();
    y += (x - y) * k;
    yh += (y - yh) * 0.02;
    const v = hp ? y - yh : y;
    buf[s0 + i] += v * env(t, a, d) * amp * Math.min(1, (dur - t) / 0.05);
  }
}
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ----- music: marimba-ish pentatonic loop, 96 bpm. Stops at 35.7s (promise breaks), returns at 42.7s.
const beat = 60 / 96;
const penta = [57, 60, 62, 64, 67, 69, 72, 74];
const prog4 = [[57, 64, 69], [55, 62, 67], [53, 60, 65], [55, 62, 67]];
function musicSection(from, to, soft = 1, mood = 0) {
  for (let t = from, b = 0; t < to; t += beat / 2, b++) {
    const bar = Math.floor(b / 8) % 4;
    const ch = prog4[bar];
    if (b % 8 === 0) for (const n of ch) tone(music, t, midi(n - 12), beat * 3.6, 0.1 * soft, { type: "tri", a: 0.05, d: 1.4 });
    if (b % 2 === 0) tone(music, t, midi(ch[0] - 24), beat * 0.9, 0.14 * soft, { type: "sine", a: 0.01, d: 0.25 });
    const idx = Math.floor(rand() * 0.5 * 8 + 4 + Math.sin(b * 0.7) * 3) % 8;
    if (b % 3 !== 2) tone(music, t, midi(penta[Math.abs(idx) % 8] + (mood ? -12 : 0)), 0.5, 0.09 * soft, { type: "sine", a: 0.004, d: 0.18 });
    if (b % 2 === 1) noise(music, t, 0.04, 0.02 * soft, { a: 0.002, d: 0.02, lp: 0.9 });
  }
}
seed = 777;
musicSection(0.2, 35.6, 1);
musicSection(42.7, 52.3, 0.9);
// dark drone under the storm
for (let t = 36.0; t < 42.6; t += 0.5) tone(music, t, 55 + Math.sin(t) * 1.5, 0.7, 0.08, { type: "tri", a: 0.2, d: 2 });
// final soft chord
for (const n of [57, 64, 69, 76]) tone(music, 49.3, midi(n), 3.0, 0.07, { type: "sine", a: 0.2, d: 1.2 });

// ----- SFX (seconds)
const whoosh = (t, d = 0.35, amp = 0.35) => noise(sfx, t, d, amp, { a: d * 0.45, d: d * 0.5, lp: 0.03, sweep: 0.3 });
[5.0, 10.95, 15.1, 21.2, 25.55, 30.85].forEach((t) => whoosh(t));
// footsteps shot 2 (5.4 - 8.2)
for (let t = 5.5; t < 8.2; t += 0.27) noise(sfx, t, 0.07, 0.25, { a: 0.003, d: 0.04, lp: 0.12 });
// bobber dip + splash + reeling (shot 3 starts 11.07)
noise(sfx, 12.3, 0.2, 0.25, { a: 0.01, d: 0.08, lp: 0.25 });
noise(sfx, 13.3, 0.7, 0.55, { a: 0.02, d: 0.25, lp: 0.35, sweep: -0.2 });
tone(sfx, 13.35, 700, 0.35, 0.25, { d: 0.12, vib: 4 });
// fish sparkle chimes (shot 4 starts 15.2)
[15.4, 15.7, 16.0, 16.5, 16.8, 17.1].forEach((t, i) => tone(sfx, t, midi(84 + i * 2), 0.5, 0.25, { a: 0.003, d: 0.2 }));
// transformation flash 17.5s
noise(sfx, 17.3, 0.6, 0.45, { a: 0.3, d: 0.3, lp: 0.05, sweep: 0.5 });
[72, 76, 79, 84, 88].forEach((n, i) => tone(sfx, 17.6 + i * 0.07, midi(n), 0.9, 0.3, { a: 0.003, d: 0.35 }));
// wedding hearts pops
[19.2, 19.7, 20.2].forEach((t) => tone(sfx, t, 900, 0.1, 0.25, { d: 0.05 }));
// shh bubble pop (shot 5 starts 21.3)
tone(sfx, 21.58, 500, 0.12, 0.35, { d: 0.05 });
noise(sfx, 21.9, 0.35, 0.18, { a: 0.1, d: 0.2, lp: 0.5 });
// munching (shot 6 ~ 28.1-29.9)
for (let t = 28.2; t < 29.9; t += 0.22) noise(sfx, t, 0.07, 0.35, { a: 0.002, d: 0.035, lp: 0.55 });
tone(sfx, 30.2, 300, 0.4, 0.2, { type: "tri", d: 0.2, vib: 10 }); // worried slide
// anger: rising tension 31 -> 33.4, shout hit
for (let t = 31.1; t < 33.3; t += 0.18) tone(sfx, t, 90 + (t - 31) * 40, 0.15, 0.2, { type: "tri", d: 0.1 });
noise(sfx, 33.35, 1.2, 0.8, { a: 0.005, d: 0.5, lp: 0.2 });
tone(sfx, 33.4, 60, 1.2, 0.8, { d: 0.5 });
// promise breaks: crack + low hit + glass
noise(sfx, 35.75, 0.25, 0.8, { a: 0.001, d: 0.06, lp: 0.9 });
tone(sfx, 35.75, 48, 1.6, 0.9, { d: 0.7 });
for (let i = 0; i < 7; i++) tone(sfx, 35.85 + i * 0.05, 1800 + rnd(i) * 1500, 0.3, 0.15, { a: 0.001, d: 0.08 });
// rain + wind + thunder + flood
noise(sfx, 37.4, 6.0, 0.28, { a: 1.5, d: 8, lp: 0.7, hp: 1 });
[37.75, 39.9, 41.3].forEach((t) => {
  noise(sfx, t, 0.15, 0.9, { a: 0.001, d: 0.05, lp: 0.9 });
  noise(sfx, t + 0.05, 2.0, 0.8, { a: 0.2, d: 0.8, lp: 0.04 });
});
noise(sfx, 38.5, 4.2, 0.5, { a: 2.0, d: 3, lp: 0.05, sweep: 0.05 });
// calm: bells + water
[72, 76, 79, 84].forEach((n, i) => tone(sfx, 42.8 + i * 0.35, midi(n), 1.8, 0.28, { a: 0.003, d: 0.7 }));
noise(sfx, 43.5, 2.0, 0.1, { a: 0.8, d: 1.4, lp: 0.08 });
// island rises 47.2 .. 48.6
noise(sfx, 47.0, 1.8, 0.5, { a: 0.9, d: 0.6, lp: 0.04, sweep: 0.1 });
tone(sfx, 48.55, 110, 0.7, 0.7, { d: 0.3 });
[79, 83, 86, 91].forEach((n, i) => tone(sfx, 48.6 + i * 0.12, midi(n), 1.4, 0.3, { a: 0.003, d: 0.6 }));
// kid waves: happy ting
tone(sfx, 49.6, midi(88), 0.9, 0.25, { d: 0.35 });
function rnd(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

// ----- levels
const WIN = Math.floor(SR * 0.05);
function gatedRms(buf, thr) {
  let sum = 0, cnt = 0;
  for (let i = 0; i + WIN <= N; i += WIN) {
    let s = 0;
    for (let j = 0; j < WIN; j++) s += buf[i + j] * buf[i + j];
    const r = Math.sqrt(s / WIN);
    if (r > thr) {
      sum += s;
      cnt += WIN;
    }
  }
  return Math.sqrt(sum / Math.max(1, cnt));
}
const peak = (b) => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const vRms = gatedRms(voice, 0.01);
const vPeak = peak(voice);
const mRms = gatedRms(music, 0.002);
const sRms = gatedRms(sfx, 0.002);
const mGain = (0.5 * vRms) / mRms;
let sGain = (0.5 * vRms) / sRms;
sGain = Math.min(sGain, (0.7 * vPeak) / peak(sfx));
const mPeakGain = (0.7 * vPeak) / peak(music);
const mg = Math.min(mGain, mPeakGain);
const out = new Float32Array(N);
for (let i = 0; i < N; i++) out[i] = voice[i] + music[i] * mg + sfx[i] * sGain;
const mix = peak(out);
const lim = mix > 0.95 ? 0.95 / mix : 1;
const db = (x) => (20 * Math.log10(x)).toFixed(1);
console.log("voice gated rms", db(vRms), "dB  peak", db(vPeak));
console.log("music gated rms", db(gatedRms(music, 0.002) * mg), "dB (target", db(0.5 * vRms), ") ratio vs voice", db((gatedRms(music, 0.002) * mg) / vRms));
console.log("sfx   gated rms", db(sRms * sGain), "dB ratio vs voice", db((sRms * sGain) / vRms), " peak", db(peak(sfx) * sGain));
console.log("limiter gain", lim.toFixed(3));

const pcm = Buffer.alloc(44 + N * 2);
pcm.write("RIFF", 0);
pcm.writeUInt32LE(36 + N * 2, 4);
pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16);
pcm.writeUInt16LE(1, 20);
pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24);
pcm.writeUInt32LE(SR * 2, 28);
pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34);
pcm.write("data", 36);
pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * lim)) * 32767), 44 + i * 2);
writeFileSync(path.join(ROOT, "public/mix.wav"), pcm);
console.log("wrote public/mix.wav", (N / SR).toFixed(2), "s");
