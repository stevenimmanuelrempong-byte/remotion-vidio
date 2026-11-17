// Builds public/mie-mix.wav: Indonesian voiceover segments + synthesized music + SFX (60s).
// Music and SFX are level-locked to 50% (-6 dB) of the voice's gated RMS.
// Word/cue timing logic mirrors src/Mie.tsx so SFX line up with the visuals.
import { execFileSync } from "node:child_process";
import { writeFileSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FFMPEG = path.join(ROOT, "node_modules/@remotion/compositor-win32-x64-msvc/ffmpeg.exe");
const SR = 44100;
const DUR = 60;
const N = SR * DUR;

const TEXTS = [
  "Kalau cuma boleh makan satu mie seumur hidup, goreng atau kuah? Pilih salah, pertemanan bisa bubar!",
  "Di warung mana pun, pertanyaannya sama: goreng atau kuah? Dan jawabanmu membongkar kamu orang seperti apa.",
  "Tim goreng bilang: bumbunya nendang! Kecap manis, telur, sayur, meresap sampai dalam. Wangi wajannya nggak ada tandingan. Praktis, bisa dibungkus!",
  "Tim kuah nggak terima: mie itu harus berkuah! Hujan-hujan, badan lagi nggak enak, semangkuk mie panas bikin hidup lebih baik. Kuahnya diseruput sampai habis!",
  "Jadi, siapa yang menang? Tergantung cuaca dan isi dompet! Lagi hujan, kuah menang. Lagi buru-buru, goreng menang. Dua-duanya juara!",
  "Giliran kamu. Komentar A kalau goreng, B kalau kuah. Tag temanmu yang beda tim. Follow ya, besok kita bahas mie pakai telur atau tanpa telur!",
];
const DURS = [6.31, 6.7, 11.21, 9.7, 11.28, 9.91];
const GAP = 0.3;
const SEGS = TEXTS.map((text, i) => ({ text, dur: DURS[i], start: 0.2 + DURS.slice(0, i).reduce((a, b) => a + b + GAP, 0) }));
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
const cutT = (i) => Math.round((SEGS[i].start - 0.1) * 30) / 30;

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
  const s = decode(path.join(ROOT, `public/mie/seg${i + 1}.mp3`));
  const s0 = Math.floor(seg.start * SR);
  for (let k = 0; k < s.length && s0 + k < N; k++) voice[s0 + k] += s[k];
  console.log(`seg${i + 1}: ${seg.start.toFixed(2)}s -> ${(seg.start + s.length / SR).toFixed(2)}s (declared ${(seg.start + seg.dur).toFixed(2)})`);
});

let seed = 31337;
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

// ----- music: lively street-food groove, 120 bpm, D major pentatonic, bass + shaker
const beat = 60 / 120;
const penta = [62, 64, 66, 69, 71, 74, 76, 78];
const prog4 = [[62, 66, 69], [59, 62, 66], [55, 59, 62], [57, 61, 64]];
for (let t = 0.1, b = 0; t < DUR - 0.2; t += beat / 2, b++) {
  const ch = prog4[Math.floor(b / 8) % 4];
  const fade = t > DUR - 2.5 ? Math.max(0, (DUR - t) / 2.5) : 1;
  if (b % 8 === 0) for (const n of ch) tone(music, t, midi(n - 12), beat * 3.6, 0.09 * fade, { type: "tri", a: 0.05, d: 1.3 });
  if (b % 2 === 0) tone(music, t, midi(ch[0] - 24), beat * 0.8, 0.15 * fade, { a: 0.01, d: 0.22 });
  const idx = Math.abs(Math.floor(rand() * 4 + 4 + Math.sin(b * 0.9) * 3)) % 8;
  if (b % 4 !== 3) tone(music, t, midi(penta[idx]), 0.4, 0.09 * fade, { a: 0.004, d: 0.15 });
  noise(music, t, 0.04, 0.025 * fade, { a: 0.002, d: 0.02, lp: 0.9 });
  if (b % 4 === 2) noise(music, t, 0.08, 0.05 * fade, { a: 0.002, d: 0.04, lp: 0.25 });
}

// ----- SFX
const whoosh = (t, d = 0.3, amp = 0.35) => noise(sfx, t, d, amp, { a: d * 0.45, d: d * 0.5, lp: 0.03, sweep: 0.3 });
const pop = (t, f = 700, amp = 0.35) => { tone(sfx, t, f, 0.12, amp, { a: 0.002, d: 0.05, glide: 0.6 }); noise(sfx, t, 0.03, 0.1, { a: 0.001, d: 0.012, lp: 0.7 }); };
const thump = (t, amp = 0.9) => { tone(sfx, t, 70, 0.28, amp, { a: 0.004, d: 0.1 }); noise(sfx, t, 0.08, 0.15, { a: 0.002, d: 0.03, lp: 0.08 }); };
const chime = (t, n, amp = 0.26) => tone(sfx, t, midi(n), 1.1, amp, { a: 0.003, d: 0.4 });
const plop = (t, f = 420) => tone(sfx, t, f, 0.16, 0.3, { a: 0.003, d: 0.06, glide: -0.5 });
const buzz = (t, f = 110) => tone(sfx, t, f, 0.5, 0.35, { type: "sq", a: 0.005, d: 0.3 });
const sparkle = (t) => [84, 88, 91, 96].forEach((n, i) => chime(t + i * 0.07, n, 0.2));
const sizzle = (t, d, amp = 0.12) => noise(sfx, t, d, amp, { a: 0.15, d: 99, lp: 0.9, hp: 1 });
const rainBed = (t, d, amp = 0.22) => noise(sfx, t, d, amp, { a: 0.8, d: 99, lp: 0.75, hp: 1 });
const slurp = (t) => noise(sfx, t, 0.45, 0.55, { a: 0.05, d: 0.3, lp: 0.08, sweep: 0.5 });

for (let i = 1; i < SEGS.length; i++) whoosh(cutT(i) - 0.05, 0.3);

// S1 hook
thump(0.2); pop(0.25, 520); pop(0.5, 620);
const e1g = cue(0, "goreng"), e1k = cue(0, "kuah"), e1b = cue(0, "bubar");
pop(e1g, 700); sizzle(e1g, 0.6, 0.2);
pop(e1k, 560); noise(sfx, e1k, 0.7, 0.18, { a: 0.1, d: 0.4, lp: 0.2, sweep: 0.15 }); // brothy bubble swoosh
noise(sfx, e1b - 0.02, 0.25, 0.8, { a: 0.001, d: 0.06, lp: 0.9 }); thump(e1b, 1.0); buzz(e1b, 100); pop(e1b + 0.1, 480);

// S2 warung + VS
pop(cutT(1) + 0.2, 640);
const e2w = cue(1, "warung");
pop(e2w, 700); pop(e2w + 0.33, 780); pop(e2w + 0.53, 840);
const e2s = cue(1, "goreng");
noise(sfx, e2s - 0.02, 0.25, 0.8, { a: 0.001, d: 0.06, lp: 0.9 }); thump(e2s, 1.0); whoosh(e2s - 0.1, 0.3);
pop(e2s + 0.2, 560); pop(e2s + 0.33, 640); thump(e2s + 0.13, 0.9); buzz(e2s + 0.13, 90);
const e2m = cue(1, "membongkar");
pop(e2m, 760); sparkle(e2m + 0.05);

// S3 goreng
pop(cutT(2) + 0.2, 640);
const e3n = cue(2, "nendang");
pop(e3n, 820); chime(e3n + 0.05, 88);
const e3Kc = cue(2, "kecap"), e3Te = cue(2, "telur"), e3Sy = cue(2, "sayur"), e3Wj = cue(2, "wajannya"), e3Pr = cue(2, "praktis"), e3Db = cue(2, "dibungkus");
sizzle(cutT(2) + 0.4, e3Pr - cutT(2) - 0.4, 0.1); // wok sizzle bed
for (let t = cutT(2) + 0.5; t < e3Pr; t += 0.87) whoosh(t, 0.25, 0.12); // toss
pop(e3Kc, 700); noise(sfx, e3Kc + 0.05, 0.9, 0.18, { a: 0.1, d: 0.5, lp: 0.15, sweep: -0.05 }); // pour
pop(e3Te, 760); plop(e3Te + 0.5, 360); sizzle(e3Te + 0.5, 0.5, 0.3);
pop(e3Sy, 700); sizzle(e3Sy + 0.1, 0.5, 0.3);
pop(e3Wj, 600); noise(sfx, e3Wj - 0.05, 0.7, 0.6, { a: 0.08, d: 0.4, lp: 0.05, sweep: 0.25 }); thump(e3Wj + 0.05, 0.7); // flame whoosh
pop(e3Pr, 880); chime(e3Pr + 0.05, 91);
pop(e3Db, 700); plop(e3Db + 0.15, 500);

// S4 kuah
pop(cutT(3) + 0.2, 640);
const e4t = cue(3, "terima"), e4b = cue(3, "berkuah"), e4h = cue(3, "hujan-hujan"), e4s = cue(3, "semangkuk"), e4d = cue(3, "diseruput"), e4hb = cue(3, "habis");
pop(e4t, 520); tone(sfx, e4t, 85, 0.8, 0.4, { type: "tri", a: 0.05, d: 0.5, vib: 6 });
pop(e4b, 780);
pop(e4h, 700); rainBed(e4h - 0.2, e4hb - e4h + 0.6, 0.22); // rain
noise(sfx, e4h + 0.4, 1.8, 0.7, { a: 0.2, d: 0.8, lp: 0.04 }); thump(e4h + 0.4, 0.6); // thunder
pop(e4s, 800); chime(e4s + 0.05, 84); chime(e4s + 0.12, 88);
pop(e4d, 760);
for (let t = e4d; t < e4hb - 0.4; t += 1.8) { plop(t + 0.55, 520); slurp(t + 1.55); } // chopsticks slurp cycle (54 frames)
pop(e4hb, 880); sparkle(e4hb); tone(sfx, e4hb + 0.1, 330, 0.5, 0.2, { glide: 0.4, d: 0.25 }); // "ahh"

// S5 answer
pop(cutT(4) + 0.2, 640);
const e5t = cue(4, "tergantung"), e5c = cue(4, "cuaca"), e5d = cue(4, "dompet"), e5h = cue(4, "hujan"), e5bu = cue(4, "buru-buru"), e5du = cue(4, "dua-duanya");
pop(e5t, 700);
pop(e5c, 600); chime(e5c, 79);
pop(e5d, 820); [0, 0.09].forEach((d) => tone(sfx, e5d + d, 2200, 0.25, 0.18, { a: 0.002, d: 0.08 })); // coin ting
pop(e5h, 560); rainBed(e5h, 1.4, 0.18);
pop(e5bu, 900); for (let t = e5bu; t < e5bu + 1.6; t += 0.12) tone(sfx, t, 1500, 0.03, 0.1, { a: 0.001, d: 0.01 }); // ticking
pop(e5du, 860); sparkle(e5du);
[72, 76, 79, 84].forEach((n, i) => tone(sfx, e5du + 0.1 + i * 0.12, midi(n), 0.7, 0.25, { type: "tri", a: 0.01, d: 0.3 })); // fanfare
for (let i = 0; i < 8; i++) pop(e5du + 0.5 + i * 0.06, 1000 + i * 70, 0.16);

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
pop(cue(5, "telur"), 700);
const click = cue(5, "telur", 1) + 14 / 30;
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
writeFileSync(path.join(ROOT, "public/mie-mix.wav"), pcm);
console.log("wrote public/mie-mix.wav", DUR, "s");
