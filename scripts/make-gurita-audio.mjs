// Builds public/gurita-mix.wav: Indonesian voiceover segments + synthesized music + SFX.
// Music and SFX are level-locked to 50% (-6 dB) of the voice's gated RMS.
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FFMPEG = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const SR = 44100;
const DUR = 30;
const N = SR * DUR;

// Start time (s) of each voice segment. Keep in sync with src/Gurita.tsx.
const SEG_START = [0.2, 4.55, 11.15, 18.72, 25.9];

function decode(file) {
  const tmp = path.join(ROOT, "public/_tmp.wav");
  execFileSync(FFMPEG, ["-y", "-v", "error", "-i", file, "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", tmp]);
  const b = readFileSync(tmp);
  unlinkSync(tmp);
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

const voice = new Float32Array(N);
SEG_START.forEach((t0, i) => {
  const seg = decode(path.join(ROOT, `public/gurita/seg${i + 1}.mp3`));
  const s0 = Math.floor(t0 * SR);
  for (let k = 0; k < seg.length && s0 + k < N; k++) voice[s0 + k] += seg[k];
  console.log(`seg${i + 1}: ${t0.toFixed(2)}s -> ${(t0 + seg.length / SR).toFixed(2)}s`);
});

let seed = 4242;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const music = new Float32Array(N);
const sfx = new Float32Array(N);
const env = (t, a, d) => (t < 0 ? 0 : Math.min(1, t / a) * Math.exp(-t / d));
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tone(buf, t0, freq, dur, amp, { type = "sine", a = 0.01, d = 0.3, vib = 0, glide = 0 } = {}) {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR;
    const f = freq * (1 + glide * (t / dur));
    ph += (2 * Math.PI * f) / SR;
    const p = ph + vib * Math.sin(t * 30);
    const v = type === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(p)) : type === "sq" ? Math.sign(Math.sin(p)) * 0.5 : Math.sin(p);
    buf[s0 + i] += v * env(t, a, d) * Math.min(1, (dur - t) / 0.03) * amp;
  }
}
function noise(buf, t0, dur, amp, { a = 0.01, d = 0.3, lp = 0.2, hp = 0, sweep = 0 } = {}) {
  const s0 = Math.floor(t0 * SR);
  const n = Math.floor(dur * SR);
  let y = 0, yh = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR;
    const k = Math.max(0.005, Math.min(0.95, lp + sweep * (t / dur)));
    y += (rand() - y) * k;
    yh += (y - yh) * 0.02;
    const v = hp ? y - yh : y;
    buf[s0 + i] += v * env(t, a, d) * amp * Math.min(1, (dur - t) / 0.05);
  }
}

// ----- music: calm underwater marimba loop, 100 bpm, A minor pentatonic
const beat = 60 / 100;
const penta = [57, 60, 62, 64, 67, 69, 72, 74];
const prog4 = [[57, 64, 69], [53, 60, 65], [55, 62, 67], [52, 59, 64]];
for (let t = 0.1, b = 0; t < DUR - 0.2; t += beat / 2, b++) {
  const ch = prog4[Math.floor(b / 8) % 4];
  const fade = t > DUR - 2 ? (DUR - t) / 2 : 1;
  if (b % 8 === 0) for (const n of ch) tone(music, t, midi(n - 12), beat * 3.6, 0.1 * fade, { type: "tri", a: 0.06, d: 1.4 });
  if (b % 2 === 0) tone(music, t, midi(ch[0] - 24), beat * 0.9, 0.14 * fade, { a: 0.01, d: 0.25 });
  const idx = Math.abs(Math.floor(rand() * 4 + 4 + Math.sin(b * 0.7) * 3)) % 8;
  if (b % 3 !== 2) tone(music, t, midi(penta[idx]), 0.5, 0.09 * fade, { a: 0.004, d: 0.18 });
  if (b % 2 === 1) noise(music, t, 0.04, 0.02 * fade, { a: 0.002, d: 0.02, lp: 0.9 });
}

// ----- SFX (seconds). Keep in sync with visual cues in src/Gurita.tsx.
const whoosh = (t, d = 0.35, amp = 0.35) => noise(sfx, t, d, amp, { a: d * 0.45, d: d * 0.5, lp: 0.03, sweep: 0.3 });
const pop = (t, f = 700, amp = 0.35) => { tone(sfx, t, f, 0.12, amp, { a: 0.002, d: 0.05, glide: 0.6 }); noise(sfx, t, 0.03, 0.1, { a: 0.001, d: 0.012, lp: 0.7 }); };
const thump = (t, amp = 0.9) => { tone(sfx, t, 70, 0.28, amp, { a: 0.004, d: 0.1 }); noise(sfx, t, 0.08, 0.15, { a: 0.002, d: 0.03, lp: 0.08 }); };
const chime = (t, n, amp = 0.28) => tone(sfx, t, midi(n), 1.2, amp, { a: 0.003, d: 0.4 });
const bubble = (t, f = 500) => tone(sfx, t, f, 0.1, 0.18, { a: 0.003, d: 0.04, glide: 1.2 });

// scene 1 hook
whoosh(0.1, 0.3);
thump(0.2);
pop(0.35, 520);
whoosh(1.8, 0.2, 0.25); pop(1.9, 760); thump(1.92, 0.7);
whoosh(3.1, 0.2, 0.25); pop(3.2, 900); thump(3.22, 0.8);
chime(3.3, 88, 0.2);
[0.9, 1.3, 2.4, 2.9, 3.8].forEach((t, i) => bubble(t, 420 + i * 60));
// scene 2: octopus + hearts
whoosh(4.4, 0.3);
pop(4.7, 640);
pop(6.0, 780); pop(8.5, 860);
for (let t = 5.6; t < 11.0; t += 0.78) { thump(t, 0.7); thump(t + 0.24, 0.45); }
chime(6.05, 84, 0.2); chime(8.55, 88, 0.2);
// scene 3: blood
whoosh(11.05, 0.3);
pop(11.4, 600);
chime(13.2, 79); chime(13.27, 84); chime(13.34, 88);
pop(13.2, 820);
// red drop crossed out: low buzz + thud
tone(sfx, 15.2, 110, 0.45, 0.35, { type: "sq", a: 0.005, d: 0.25 });
thump(15.2, 0.7);
[16.5, 16.65, 16.8, 16.95, 17.1].forEach((t, i) => tone(sfx, t, midi(91 + (i % 3) * 2), 0.6, 0.12, { a: 0.002, d: 0.2 }));
// scene 4: ECG beats -> flatline -> swim jets -> crawl
whoosh(18.6, 0.3);
pop(19.0, 560);
pop(20.1, 640);
[20.2, 20.9, 21.6].forEach((t) => { thump(t, 0.5); tone(sfx, t, 1000, 0.12, 0.12, { a: 0.002, d: 0.06 }); }); // beat + monitor blip
tone(sfx, 22.0, 1000, 1.2, 0.18, { a: 0.005, d: 5 }); // flatline beeeep
pop(22.05, 380); thump(22.05, 0.8);
pop(22.5, 600);
[22.6, 23.0, 23.4].forEach((t) => noise(sfx, t, 0.45, 0.5, { a: 0.12, d: 0.18, lp: 0.05, sweep: 0.25 })); // jet swim
whoosh(23.9, 0.25);
pop(24.0, 720);
for (let t = 24.4; t < 25.7; t += 0.3) noise(sfx, t, 0.12, 0.22, { a: 0.01, d: 0.05, lp: 0.12 }); // crawl squelch
// scene 5: CTA
whoosh(25.8, 0.3);
pop(26.0, 800); thump(26.02, 0.7);
pop(26.8, 1200, 0.3); noise(sfx, 26.8, 0.05, 0.25, { a: 0.001, d: 0.02, lp: 0.9 }); // click
[79, 84, 88, 91].forEach((n, i) => chime(27.0 + i * 0.1, n, 0.25));
chime(28.4, 96, 0.15);

// ----- levels
const WIN = Math.floor(SR * 0.05);
function gatedRms(buf, thr) {
  let sum = 0, cnt = 0;
  for (let i = 0; i + WIN <= N; i += WIN) {
    let s = 0;
    for (let j = 0; j < WIN; j++) s += buf[i + j] * buf[i + j];
    if (Math.sqrt(s / WIN) > thr) { sum += s; cnt += WIN; }
  }
  return Math.sqrt(sum / Math.max(1, cnt));
}
const peak = (b) => b.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
const vRms = gatedRms(voice, 0.01), vPeak = peak(voice);
const mRms = gatedRms(music, 0.002), sRms = gatedRms(sfx, 0.002);
const mg = Math.min((0.5 * vRms) / mRms, (0.7 * vPeak) / peak(music));
const sg = Math.min((0.5 * vRms) / sRms, (0.7 * vPeak) / peak(sfx));
const out = new Float32Array(N);
for (let i = 0; i < N; i++) out[i] = voice[i] + music[i] * mg + sfx[i] * sg;
const lim = peak(out) > 0.95 ? 0.95 / peak(out) : 1;
const db = (x) => (20 * Math.log10(x)).toFixed(1);
console.log("voice rms", db(vRms), "dB | music", db(gatedRms(music, 0.002) * mg), "dB | sfx", db(sRms * sg), "dB | limiter", lim.toFixed(3));

const pcm = Buffer.alloc(44 + N * 2);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * lim)) * 32767), 44 + i * 2);
writeFileSync(path.join(ROOT, "public/gurita-mix.wav"), pcm);
console.log("wrote public/gurita-mix.wav", DUR, "s");
