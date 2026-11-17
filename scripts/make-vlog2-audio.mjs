// Builds public/vlog2/mix.wav: soft lo-fi music bed + SFX (no voice; the voice stays in the source video).
// Levels are locked relative to the voice in public/vlog2/src.mp4 so the bed never competes with it.
// SFX times must stay in sync with src/Vlog2.tsx.
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FFMPEG = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const SR = 44100;
const DUR = 66.69;
const N = Math.ceil(SR * DUR);

function readWavMono(file) {
  const b = readFileSync(file);
  let off = 12, dOff = 44, dLen = b.length - 44;
  while (off + 8 <= b.length) {
    const id = b.toString("ascii", off, off + 4), sz = b.readUInt32LE(off + 4);
    if (id === "data") { dOff = off + 8; dLen = Math.min(sz, b.length - dOff); break; }
    off += 8 + sz;
  }
  const n = Math.floor(dLen / 2);
  const f = new Float32Array(n);
  for (let i = 0; i < n; i++) f[i] = b.readInt16LE(dOff + i * 2) / 32768;
  return f;
}

// ----- measure the voice
const tmp = path.join(ROOT, "public/vlog2/_voice.wav");
execFileSync(FFMPEG, ["-y", "-v", "error", "-i", path.join(ROOT, "public/vlog2/src.mp4"), "-vn", "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", tmp]);
const voice = readWavMono(tmp);
unlinkSync(tmp);
let sum = 0, cnt = 0;
const abs = [];
for (let i = 0; i < voice.length; i += 7) {
  const a = Math.abs(voice[i]);
  abs.push(a);
  if (a > 0.02) { sum += a * a; cnt++; }
}
abs.sort((a, b) => a - b);
const voiceRms = Math.sqrt(sum / Math.max(1, cnt));
const voicePeak = abs[Math.floor(abs.length * 0.99)];
console.log("voice gated RMS", voiceRms.toFixed(4), "p99", voicePeak.toFixed(4));

let seed = 913;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const music = new Float32Array(N);
const sfx = new Float32Array(N);
const env = (t, a, d) => (t < 0 ? 0 : Math.min(1, t / a) * Math.exp(-t / d));
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tone(buf, t0, freq, dur, amp, { type = "sine", a = 0.01, d = 0.3, glide = 0 } = {}) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * freq * (1 + glide * (t / dur))) / SR;
    const v = type === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(ph)) : type === "sq" ? Math.sign(Math.sin(ph)) * 0.5 : Math.sin(ph);
    buf[s0 + i] += v * env(t, a, d) * Math.min(1, (dur - t) / 0.03) * amp;
  }
}
function noise(buf, t0, dur, amp, { a = 0.01, d = 0.3, lp = 0.2, hp = false, sweep = 0 } = {}) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let y = 0, yh = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR;
    const k = Math.max(0.005, Math.min(0.95, lp + sweep * (t / dur)));
    y += (rand() - y) * k;
    yh += (y - yh) * 0.02;
    buf[s0 + i] += (hp ? y - yh : y) * env(t, a, d) * amp * Math.min(1, (dur - t) / 0.05);
  }
}

// ----- music: mellow lo-fi loop, 96 bpm
const beat = 60 / 96;
const prog = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 55, 60, 64], [55, 59, 62, 67]];
const penta = [69, 72, 74, 76, 79];
for (let bar = 0; bar * beat * 4 < DUR; bar++) {
  const t0 = bar * beat * 4, ch = prog[bar % 4];
  ch.forEach((m, i) => tone(music, t0 + i * 0.012, midi(m), beat * 4, 0.1, { type: "tri", a: 0.25, d: 1.6 }));
  tone(music, t0, midi(ch[0] - 12), beat * 1.8, 0.28, { a: 0.02, d: 0.7 });
  tone(music, t0 + beat * 2, midi(ch[0] - 12), beat * 1.8, 0.24, { a: 0.02, d: 0.7 });
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * beat;
    tone(music, tb, 120, 0.22, 0.3, { glide: -0.6, a: 0.002, d: 0.08 });
    noise(music, tb + beat / 2, 0.06, 0.05, { a: 0.002, d: 0.025, lp: 0.9, hp: true });
  }
  for (let e = 0; e < 8; e++) {
    if ((e * 3 + bar) % 4 === 0) continue;
    tone(music, t0 + e * beat / 2, midi(penta[(e * 2 + bar) % 5]), 0.3, 0.05, { a: 0.005, d: 0.18 });
  }
}
const fade = (buf) => {
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    buf[i] *= Math.min(1, t / 0.6) * Math.min(1, Math.max(0, (DUR - t) / 1.8));
  }
};
fade(music);

// ----- SFX (seconds) -- keep in sync with src/Vlog2.tsx
const whooshSoft = [4.7, 8.7, 22.1, 33.1, 43.9, 53.7];
const whooshBig = [3.4, 15.2, 27.8, 38.5, 48.4, 60.3];
const flash = [15.2, 27.8, 38.5, 48.4, 60.3];
const pop = [8.75, 17.1, 18.1, 19.5, 33.3, 43.4, 45.05, 52.83, 53.73, 54.81, 63.43, 64.51];
const steps = [[23.41, 0], [23.71, 1], [23.87, 2], [24.15, 3]];
const buzz = [27.43, 45.95];
const riseT = [[29.99, 0.85]];
const dropT = [[31.6, 1.05]];
const ching = [45.9, 57.15];
const sparkle = [0.85, 47.63, 56.07];
const ringFill = [[33.35, 5.0]];
const fanfare = [64.63];
// hook: riser into impact
noise(sfx, 0.0, 0.7, 0.35, { a: 0.6, d: 3, lp: 0.03, sweep: 0.4 });
tone(sfx, 0.0, 180, 0.7, 0.25, { type: "tri", glide: 3.5, a: 0.4, d: 3 });
tone(sfx, 0.7, 70, 0.7, 1.0, { glide: -0.5, a: 0.002, d: 0.22 });
noise(sfx, 0.7, 0.35, 0.5, { a: 0.002, d: 0.08, lp: 0.25 });
tone(sfx, 0.56, 90, 0.4, 0.5, { glide: -0.5, a: 0.002, d: 0.12 });
whooshSoft.forEach((t) => noise(sfx, t - 0.12, 0.45, 0.22, { a: 0.14, d: 0.15, lp: 0.05, sweep: 0.45 }));
whooshBig.forEach((t) => noise(sfx, t - 0.15, 0.55, 0.38, { a: 0.18, d: 0.18, lp: 0.04, sweep: 0.55 }));
flash.forEach((t) => { tone(sfx, t + 0.05, 60, 0.45, 0.55, { glide: -0.4, a: 0.002, d: 0.14 }); noise(sfx, t + 0.05, 0.15, 0.3, { a: 0.002, d: 0.04, lp: 0.5, hp: true }); });
pop.forEach((t) => { tone(sfx, t, 620, 0.12, 0.5, { a: 0.003, d: 0.05, glide: 0.8 }); tone(sfx, t + 0.04, 930, 0.1, 0.25, { a: 0.003, d: 0.04 }); });
steps.forEach(([t, i]) => tone(sfx, t, midi(60 + i * 3), 0.22, 0.45, { type: "tri", a: 0.004, d: 0.1 }));
buzz.forEach((t) => { tone(sfx, t, 160, 0.28, 0.55, { type: "sq", a: 0.003, d: 0.2 }); tone(sfx, t + 0.12, 120, 0.3, 0.5, { type: "sq", a: 0.003, d: 0.2 }); });
riseT.forEach(([t, d]) => tone(sfx, t, 330, d, 0.4, { type: "tri", glide: 1.6, a: 0.05, d: 3 }));
dropT.forEach(([t, d]) => { tone(sfx, t, 660, d, 0.45, { type: "tri", glide: -0.8, a: 0.03, d: 3 }); noise(sfx, t + d - 0.1, 0.3, 0.4, { a: 0.002, d: 0.08, lp: 0.2 }); });
ching.forEach((t) => { tone(sfx, t, 1568, 0.5, 0.45, { a: 0.002, d: 0.18 }); tone(sfx, t + 0.07, 2093, 0.6, 0.4, { a: 0.002, d: 0.25 }); });
sparkle.forEach((t) => [88, 91, 95, 100].forEach((m, i) => tone(sfx, t + i * 0.05, midi(m), 0.3, 0.22, { a: 0.003, d: 0.14 })));
ringFill.forEach(([t, d]) => { for (let k = 0; k < d / 0.5; k++) tone(sfx, t + k * 0.5, 900 + k * 40, 0.04, 0.14, { a: 0.001, d: 0.02 }); });
fanfare.forEach((t) => [72, 76, 79, 84].forEach((m, i) => { tone(sfx, t + i * 0.09, midi(m), 0.9, 0.35, { type: "tri", a: 0.005, d: 0.5 }); tone(sfx, t + i * 0.09, midi(m + 12), 0.7, 0.12, { a: 0.005, d: 0.3 }); }));

// ----- level lock
const rms = (buf) => { let s = 0, c = 0; for (let i = 0; i < buf.length; i++) if (Math.abs(buf[i]) > 0.003) { s += buf[i] * buf[i]; c++; } return Math.sqrt(s / Math.max(1, c)); };
const mk = (0.14 * voiceRms) / rms(music);
let sp = 0;
for (let i = 0; i < N; i += 5) sp = Math.max(sp, Math.abs(sfx[i]));
const sk = (0.45 * voicePeak) / sp;
const out = new Int16Array(N);
for (let i = 0; i < N; i++) {
  const v = music[i] * mk + sfx[i] * sk;
  out[i] = Math.max(-32768, Math.min(32767, Math.round(v * 32767)));
}
const hdr = Buffer.alloc(44);
hdr.write("RIFF", 0); hdr.writeUInt32LE(36 + out.length * 2, 4); hdr.write("WAVEfmt ", 8);
hdr.writeUInt32LE(16, 16); hdr.writeUInt16LE(1, 20); hdr.writeUInt16LE(1, 22);
hdr.writeUInt32LE(SR, 24); hdr.writeUInt32LE(SR * 2, 28); hdr.writeUInt16LE(2, 32); hdr.writeUInt16LE(16, 34);
hdr.write("data", 36); hdr.writeUInt32LE(out.length * 2, 40);
writeFileSync(path.join(ROOT, "public/vlog2/mix.wav"), Buffer.concat([hdr, Buffer.from(out.buffer)]));
console.log("wrote public/vlog2/mix.wav", (N / SR).toFixed(2) + "s");
