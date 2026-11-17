// Builds public/bubur-mix.wav: Indonesian voiceover segments + synthesized music + SFX (60s).
// Music and SFX are level-locked to 50% (-6 dB) of the voice's gated RMS.
// Word/cue timing logic mirrors src/Bubur.tsx so SFX line up with the visuals.
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FFMPEG = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const SR = 44100;
const DUR = 60;
const N = SR * DUR;

const SEGS = [
  { start: 0.2, dur: 7.3, text: "Orang yang makan bubur nggak diaduk itu... psikopat? Atau justru... elegan? Kita bedah sekarang." },
  { start: 7.8, dur: 7.63, text: "Di Indonesia, bubur ayam bukan cuma sarapan, ini identitas! Begitu mangkuk datang, kita langsung terbelah jadi dua kubu." },
  { start: 15.75, dur: 12.98, text: "Tim diaduk bilang: bubur harus menyatu! Ayam, kerupuk, cakwe, kecap, sambal, semuanya tercampur. Satu suapan, semua rasa dapat. Praktis, nggak ribet!" },
  { start: 29.05, dur: 10.46, text: "Tim nggak diaduk marah: tampilannya jadi berantakan! Mereka makan dari pinggir, rasa dinikmati satu-satu, kerupuk tetap renyah. Katanya, mengaduk itu merusak seni." },
  { start: 39.83, dur: 8.14, text: "Jadi, psikopat atau elegan? Dua-duanya salah! Ini murni selera. Yang penting buburnya enak!" },
  { start: 48.3, dur: 10.06, text: "Giliran kamu. Komentar A kalau diaduk, B kalau nggak diaduk. Tag temanmu yang beda kubu. Follow ya, besok kita bahas bubur kuah atau tanpa kuah!" },
];
const norm = (w) => w.toLowerCase().replace(/[^a-z-]/g, "");
const WORDS = [];
SEGS.forEach((seg, si) => {
  const ws = seg.text.split(" ");
  const wt = ws.map((w) => w.length + 1.5 + (/[,.!?:]$/.test(w) ? 3 : 0));
  const total = wt.reduce((a, b) => a + b, 0);
  const t0 = seg.start + 0.05, span = seg.dur - 0.15;
  let acc = 0;
  ws.forEach((w, i) => { WORDS.push({ n: norm(w), t0: t0 + (acc / total) * span, seg: si }); acc += wt[i]; });
});
const cue = (seg, word, nth = 0) => {
  const m = WORDS.filter((x) => x.seg === seg && x.n === word);
  if (!m.length) throw new Error(`cue not found: ${seg} ${word}`);
  return (m[nth] ?? m[0]).t0;
};
const cutT = (i) => Math.round((SEGS[i].start - 0.1) * 30) / 30; // scene cut time

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
SEGS.forEach((seg, i) => {
  let s = decode(path.join(ROOT, `public/bubur/seg${i + 1}.mp3`));
  if (i === 0) {
    // creepy hook: dark echo trail on the low-pitched voice
    const d1 = Math.floor(0.19 * SR), d2 = Math.floor(0.41 * SR), d3 = Math.floor(0.67 * SR);
    const e = new Float32Array(s.length + d3);
    for (let k = 0; k < e.length; k++) {
      let v = k < s.length ? s[k] : 0;
      if (k - d1 >= 0 && k - d1 < s.length) v += 0.38 * s[k - d1];
      if (k - d2 >= 0 && k - d2 < s.length) v += 0.22 * s[k - d2];
      if (k - d3 >= 0 && k - d3 < s.length) v += 0.12 * s[k - d3];
      e[k] = v;
    }
    s = e;
  }
  const s0 = Math.floor(seg.start * SR);
  for (let k = 0; k < s.length && s0 + k < N; k++) voice[s0 + k] += s[k];
  console.log(`seg${i + 1}: ${seg.start.toFixed(2)}s -> ${(seg.start + s.length / SR).toFixed(2)}s (declared ${(seg.start + seg.dur).toFixed(2)})`);
});

let seed = 9090;
const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const music = new Float32Array(N);
const sfx = new Float32Array(N);
const env = (t, a, d) => (t < 0 ? 0 : Math.min(1, t / a) * Math.exp(-t / d));
const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);

function tone(buf, t0, freq, dur, amp, { type = "sine", a = 0.01, d = 0.3, vib = 0, glide = 0 } = {}) {
  const s0 = Math.floor(t0 * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let i = 0; i < n && s0 + i < N; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * freq * (1 + glide * (t / dur))) / SR;
    const p = ph + vib * Math.sin(t * 30);
    const v = type === "tri" ? (2 / Math.PI) * Math.asin(Math.sin(p)) : type === "sq" ? Math.sign(Math.sin(p)) * 0.5 : Math.sin(p);
    buf[s0 + i] += v * env(t, a, d) * Math.min(1, (dur - t) / 0.03) * amp;
  }
}
function noise(buf, t0, dur, amp, { a = 0.01, d = 0.3, lp = 0.2, hp = 0, sweep = 0 } = {}) {
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

// ----- music: bouncy warung groove, 112 bpm, C major pentatonic, with bass + shaker
const beat = 60 / 112;
const penta = [60, 62, 64, 67, 69, 72, 74, 76];
const prog4 = [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]];
const HOOK_END = (SEGS[1].start - 0.1);
// dark hook bed: low drone + minor-second clash, clock ticks, eerie high whine, riser into scene 2
tone(music, 0, 55, HOOK_END, 0.22, { type: "tri", a: 1.2, d: 60 });
tone(music, 0, 58.27, HOOK_END, 0.16, { type: "tri", a: 1.5, d: 60 });
tone(music, 0.4, 880, HOOK_END - 0.4, 0.035, { a: 2.0, d: 60, vib: 5, glide: -0.12 });
tone(music, 0.4, 932, HOOK_END - 0.4, 0.03, { a: 2.5, d: 60, vib: 7, glide: -0.1 });
for (let t = 0.5, k = 0; t < HOOK_END - 0.9; t += 0.6, k++) noise(music, t, 0.03, 0.12, { a: 0.001, d: 0.012, lp: k % 2 ? 0.5 : 0.8, hp: 1 });
noise(music, HOOK_END - 1.0, 1.0, 0.25, { a: 0.9, d: 3, lp: 0.03, sweep: 0.4 });
for (let t = 0.1, b = 0; t < DUR - 0.2; t += beat / 2, b++) {
  if (t < HOOK_END) continue;
  const ch = prog4[Math.floor(b / 8) % 4];
  const fade = t > DUR - 2.5 ? Math.max(0, (DUR - t) / 2.5) : 1;
  if (b % 8 === 0) for (const n of ch) tone(music, t, midi(n - 12), beat * 3.6, 0.09 * fade, { type: "tri", a: 0.05, d: 1.3 });
  if (b % 2 === 0) tone(music, t, midi(ch[0] - 24), beat * 0.8, 0.15 * fade, { a: 0.01, d: 0.22 }); // bass
  const idx = Math.abs(Math.floor(rand() * 4 + 4 + Math.sin(b * 0.9) * 3)) % 8;
  if (b % 4 !== 3) tone(music, t, midi(penta[idx]), 0.4, 0.09 * fade, { a: 0.004, d: 0.15 });
  noise(music, t, 0.04, 0.025 * fade, { a: 0.002, d: 0.02, lp: 0.9 }); // shaker
  if (b % 4 === 2) noise(music, t, 0.08, 0.05 * fade, { a: 0.002, d: 0.04, lp: 0.25 }); // soft snare
}

// ----- SFX
const whoosh = (t, d = 0.3, amp = 0.35) => noise(sfx, t, d, amp, { a: d * 0.45, d: d * 0.5, lp: 0.03, sweep: 0.3 });
const pop = (t, f = 700, amp = 0.35) => { tone(sfx, t, f, 0.12, amp, { a: 0.002, d: 0.05, glide: 0.6 }); noise(sfx, t, 0.03, 0.1, { a: 0.001, d: 0.012, lp: 0.7 }); };
const thump = (t, amp = 0.9) => { tone(sfx, t, 70, 0.28, amp, { a: 0.004, d: 0.1 }); noise(sfx, t, 0.08, 0.15, { a: 0.002, d: 0.03, lp: 0.08 }); };
const chime = (t, n, amp = 0.26) => tone(sfx, t, midi(n), 1.1, amp, { a: 0.003, d: 0.4 });
const plop = (t, f = 420) => tone(sfx, t, f, 0.16, 0.3, { a: 0.003, d: 0.06, glide: -0.5 });
const crunch = (t) => { noise(sfx, t, 0.09, 0.5, { a: 0.001, d: 0.03, lp: 0.8, hp: 1 }); noise(sfx, t + 0.05, 0.07, 0.35, { a: 0.001, d: 0.025, lp: 0.7, hp: 1 }); };
const buzz = (t, f = 110) => tone(sfx, t, f, 0.5, 0.35, { type: "sq", a: 0.005, d: 0.3 });
const sparkle = (t) => [84, 88, 91, 96].forEach((n, i) => chime(t + i * 0.07, n, 0.2));

// scene cuts
for (let i = 1; i < SEGS.length; i++) whoosh(cutT(i) - 0.05, 0.3);

// S1 hook
thump(0.2); pop(0.25, 520);
const e1p = cue(0, "psikopat"), e1e = cue(0, "elegan"), e1b = cue(0, "bedah");
pop(e1p, 600); buzz(e1p, 100); thump(e1p, 0.8);
[60, 61, 66].forEach((n) => tone(sfx, e1p, midi(n - 12), 1.4, 0.22, { type: "tri", a: 0.02, d: 0.9 })); // dissonant sting
thump(e1p + 0.5, 0.5); thump(e1p + 0.75, 0.35); // heartbeat
pop(e1e, 850); sparkle(e1e + 0.05);
whoosh(e1b - 0.1, 0.25); pop(e1b, 760); thump(e1b, 0.7);

// S2 identity + split
pop(cutT(1) + 0.2, 640);
pop(cue(1, "sarapan"), 700);
const e2i = cue(1, "identitas");
pop(e2i, 800); thump(e2i, 0.7); chime(e2i + 0.05, 84); chime(e2i + 0.12, 88);
const e2s = cue(1, "terbelah");
noise(sfx, e2s - 0.02, 0.25, 0.8, { a: 0.001, d: 0.06, lp: 0.9 }); // crack
thump(e2s, 1.0); whoosh(e2s - 0.1, 0.3);
pop(e2s + 0.2, 560); pop(e2s + 0.33, 640);
thump(e2s + 0.13, 0.9); buzz(e2s + 0.13, 90); // VS hit

// S3 diaduk
pop(cutT(2) + 0.2, 640);
pop(cue(2, "menyatu"), 820); chime(cue(2, "menyatu") + 0.05, 88);
for (const w of ["ayam", "kerupuk", "cakwe", "kecap", "sambal"]) {
  const t = cue(2, w);
  pop(t, 700); plop(t + 0.18, 380 + rand() * 80);
}
const e3t = cue(2, "tercampur");
for (let t = e3t - 0.2; t < cutT(3) - 0.2; t += 0.28) noise(sfx, t, 0.1, 0.3, { a: 0.01, d: 0.05, lp: 0.15 }); // sruk-sruk stir
pop(cue(2, "semua"), 780); sparkle(cue(2, "semua") + 0.05);
pop(cue(2, "praktis"), 900); chime(cue(2, "praktis") + 0.05, 91);

// S4 nggak diaduk
pop(cutT(3) + 0.2, 640);
const e4m = cue(3, "marah");
pop(e4m, 520); tone(sfx, e4m, 85, 0.9, 0.4, { type: "tri", a: 0.05, d: 0.6, vib: 6 }); // growl
pop(cue(3, "berantakan"), 500); buzz(cue(3, "berantakan"), 130);
const e4p = cue(3, "pinggir"), e4me = cue(3, "mengaduk");
pop(e4p, 740);
for (let t = e4p; t < e4me - 0.5; t += 1.8) { whoosh(t, 0.2, 0.18); plop(t + 0.55, 520); chime(t + 1.2, 88, 0.12); } // scoop cycle (54 frames)
const e4s = cue(3, "satu-satu");
pop(e4s, 760); [84, 88, 91].forEach((n, i) => chime(e4s + 0.1 + i * 0.25, n, 0.2));
const e4r = cue(3, "renyah");
pop(e4r, 820); crunch(e4r + 0.05); crunch(e4r + 0.35); crunch(e4r + 0.6);
pop(e4me, 540); thump(e4me, 0.8); tone(sfx, e4me + 0.05, 330, 0.4, 0.25, { glide: -0.5, d: 0.2 }); // dramatic gasp
const e4se = cue(3, "seni");
pop(e4se, 880); sparkle(e4se);

// S5 answer
pop(cutT(4) + 0.2, 640);
pop(cue(4, "psikopat"), 640); pop(cue(4, "elegan"), 820);
const e5d = cue(4, "dua-duanya");
buzz(e5d, 100); thump(e5d, 1.0); pop(e5d + 0.05, 500);
const e5m = cue(4, "murni");
pop(e5m, 800); chime(e5m, 84); chime(e5m + 0.1, 88);
const e5e = cue(4, "enak");
pop(e5e, 900); sparkle(e5e);
for (let i = 0; i < 8; i++) pop(e5e + 0.1 + i * 0.06, 1000 + i * 70, 0.18);

// S6 CTA
pop(cutT(5) + 0.1, 640);
pop(cue(5, "giliran"), 800); thump(cue(5, "giliran"), 0.7);
pop(cue(5, "a"), 660, 0.4); chime(cue(5, "a"), 84);
pop(cue(5, "b"), 560, 0.4); chime(cue(5, "b"), 79);
const e6t = cue(5, "tag");
pop(e6t, 700);
[0, 0.2, 0.4, 0.6, 0.8].forEach((d, i) => plop(e6t + d, 600 + i * 50));
const e6f = cue(5, "follow");
whoosh(e6f - 0.1, 0.25); pop(e6f, 840); thump(e6f, 0.7);
pop(cue(5, "kuah"), 700);
const click = cue(5, "kuah", 1) + 14 / 30;
pop(click, 1200, 0.35); noise(sfx, click, 0.05, 0.25, { a: 0.001, d: 0.02, lp: 0.9 });
[79, 84, 88, 91, 96].forEach((n, i) => chime(click + 0.05 + i * 0.09, n, 0.25));
chime(click + 1.2, 96, 0.14);

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
console.log("voice rms", db(vRms), "dB | music", db(mRms * mg), "dB | sfx", db(sRms * sg), "dB | limiter", lim.toFixed(3));

const pcm = Buffer.alloc(44 + N * 2);
pcm.write("RIFF", 0); pcm.writeUInt32LE(36 + N * 2, 4); pcm.write("WAVEfmt ", 8);
pcm.writeUInt32LE(16, 16); pcm.writeUInt16LE(1, 20); pcm.writeUInt16LE(1, 22);
pcm.writeUInt32LE(SR, 24); pcm.writeUInt32LE(SR * 2, 28); pcm.writeUInt16LE(2, 32);
pcm.writeUInt16LE(16, 34); pcm.write("data", 36); pcm.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[i] * lim)) * 32767), 44 + i * 2);
writeFileSync(path.join(ROOT, "public/bubur-mix.wav"), pcm);
console.log("wrote public/bubur-mix.wav", DUR, "s");
