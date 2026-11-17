import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";

export const BUBUR_TOTAL = 1800; // 60s @ 30fps
const OUT = "#2b1a12";
const BG1 = "#ffd35e";
const BG2 = "#ff8f3d";
const CREAM = "#fff0c2";
const RED = "#ef476f";
const TEAL = "#06b6a4";
const YEL = "#ffe14d";
const FONT = "'Segoe UI Black','Arial Black',Impact,sans-serif";

// ---------- helpers ----------
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const prog = (f: number, a: number, b: number) => ease(clamp((f - a) / (b - a), 0, 1));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const back = (t: number) => {
  const c = 1.9;
  const u = clamp(t, 0, 1) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const popS = (f: number, t0: number, dur = 10) => (f < t0 ? 0 : back((f - t0) / dur));

// ---------- voice timeline (must match scripts/make-bubur-audio.mjs) ----------
const SEGS = [
  { start: 0.2, dur: 7.3, text: "Orang yang makan bubur nggak diaduk itu... psikopat? Atau justru... elegan? Kita bedah sekarang." },
  { start: 7.8, dur: 7.63, text: "Di Indonesia, bubur ayam bukan cuma sarapan, ini identitas! Begitu mangkuk datang, kita langsung terbelah jadi dua kubu." },
  { start: 15.75, dur: 12.98, text: "Tim diaduk bilang: bubur harus menyatu! Ayam, kerupuk, cakwe, kecap, sambal, semuanya tercampur. Satu suapan, semua rasa dapat. Praktis, nggak ribet!" },
  { start: 29.05, dur: 10.46, text: "Tim nggak diaduk marah: tampilannya jadi berantakan! Mereka makan dari pinggir, rasa dinikmati satu-satu, kerupuk tetap renyah. Katanya, mengaduk itu merusak seni." },
  { start: 39.83, dur: 8.14, text: "Jadi, psikopat atau elegan? Dua-duanya salah! Ini murni selera. Yang penting buburnya enak!" },
  { start: 48.3, dur: 10.06, text: "Giliran kamu. Komentar A kalau diaduk, B kalau nggak diaduk. Tag temanmu yang beda kubu. Follow ya, besok kita bahas bubur kuah atau tanpa kuah!" },
];
const norm = (w: string) => w.toLowerCase().replace(/[^a-z-]/g, "");
type Word = { w: string; n: string; t0: number; t1: number; chunk: number; seg: number };
const buildWords = (): Word[] => {
  const out: Word[] = [];
  let chunk = 0;
  SEGS.forEach((seg, si) => {
    const ws = seg.text.split(" ");
    const wt = ws.map((w) => w.length + 1.5 + (/[,.!?:]$/.test(w) ? 3 : 0));
    const total = wt.reduce((a, b) => a + b, 0);
    const t0 = seg.start + 0.05;
    const span = seg.dur - 0.15;
    let acc = 0;
    let chars = 0;
    ws.forEach((w, i) => {
      if (chars > 0 && chars + w.length > 20) {
        chunk++;
        chars = 0;
      }
      chars += w.length + 1;
      out.push({ w, n: norm(w), t0: t0 + (acc / total) * span, t1: t0 + ((acc + wt[i]) / total) * span, chunk, seg: si });
      acc += wt[i];
    });
    chunk++;
  });
  return out;
};
const WORDS = buildWords();
const cue = (seg: number, word: string, nth = 0): number => {
  const m = WORDS.filter((x) => x.seg === seg && x.n === word);
  if (!m.length) throw new Error(`cue not found: ${seg} ${word}`);
  return (m[nth] ?? m[0]).t0;
};
const F = (seg: number, word: string, nth = 0) => Math.round(cue(seg, word, nth) * 30);
const CUT = [0, ...SEGS.slice(1).map((s) => Math.round((s.start - 0.1) * 30)), BUBUR_TOTAL];

// ---------- text ----------
const T: React.FC<{ f: number; t0: number; x: number; y: number; size: number; text: string; fill?: string; rot?: number; dur?: number }> = ({
  f,
  t0,
  x,
  y,
  size,
  text,
  fill = "#fff",
  rot = 0,
  dur = 10,
}) => {
  const s = popS(f, t0, dur);
  if (s <= 0) return null;
  const common = { textAnchor: "middle" as const, fontFamily: FONT, fontWeight: 900, fontSize: size, strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <text {...common} transform={`translate(0 ${size * 0.09})`} fill={OUT} stroke={OUT} strokeWidth={size * 0.2}>
        {text}
      </text>
      <text {...common} fill={fill} stroke={OUT} strokeWidth={size * 0.12} paintOrder="stroke">
        {text}
      </text>
    </g>
  );
};

const Tag: React.FC<{ f: number; t0: number; x: number; y: number; size: number; text: string; box?: string; ink?: string; rot?: number }> = ({
  f,
  t0,
  x,
  y,
  size,
  text,
  box = YEL,
  ink = OUT,
  rot = 0,
}) => {
  const s = popS(f, t0);
  if (s <= 0) return null;
  const w = text.length * size * 0.66 + size * 0.9;
  const h = size * 1.4;
  const light = ink !== OUT;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <rect x={-w / 2 + 8} y={-size * 1.02 + 10} width={w} height={h} rx={h * 0.26} fill={OUT} />
      <rect x={-w / 2} y={-size * 1.02} width={w} height={h} rx={h * 0.26} fill={box} stroke={OUT} strokeWidth={6} />
      <text
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={900}
        fontSize={size}
        fill={ink}
        stroke={light ? OUT : "none"}
        strokeWidth={light ? size * 0.1 : 0}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {text}
      </text>
    </g>
  );
};

const slot = (f: number, items: [number, React.ReactNode][]) => {
  let cur: React.ReactNode = null;
  for (const [c, n] of items) if (f >= c) cur = n;
  return cur;
};

// ---------- shapes ----------
const HEART = "M0 -18 C-10 -34 -36 -26 -36 -4 C-36 14 -14 26 0 40 C14 26 36 14 36 -4 C36 -26 10 -34 0 -18Z";
const Heart: React.FC<{ x: number; y: number; s: number; fill?: string; rot?: number }> = ({ x, y, s, fill = RED, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
    <path d={HEART} fill={fill} stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-22 -12 Q-24 -22 -12 -24" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
  </g>
);
const Spark: React.FC<{ x: number; y: number; s: number; rot?: number }> = ({ x, y, s, rot = 0 }) => (
  <path
    transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
    d="M0 -30 Q4 -4 30 0 Q4 4 0 30 Q-4 4 -30 0 Q-4 -4 0 -30Z"
    fill="#fff8b0"
    stroke={OUT}
    strokeWidth={3 / Math.max(s, 0.3)}
  />
);

// ---------- bowl ----------
type Kind = "ayam" | "kerupuk" | "cakwe" | "sambal" | "daun";
type Piece = { kind: Kind; neat: [number, number, number, number]; seed: number };
const PIECES: Piece[] = [
  ...([[-30, -2, -15], [-10, 5, 10], [10, -4, -5], [30, 3, 20], [-48, 6, 5], [52, -3, -20]] as [number, number, number][]).map(
    (p, i): Piece => ({ kind: "ayam", neat: [p[0], p[1], p[2], 1], seed: 10 + i }),
  ),
  { kind: "cakwe", neat: [-100, -22, -18, 1], seed: 30 },
  { kind: "cakwe", neat: [-66, -30, 8, 1], seed: 31 },
  { kind: "kerupuk", neat: [108, -40, 0, 1], seed: 40 },
  { kind: "kerupuk", neat: [140, -14, 0, 0.8], seed: 41 },
  { kind: "sambal", neat: [6, -14, 0, 1], seed: 50 },
  { kind: "sambal", neat: [24, -9, 0, 1], seed: 51 },
  ...Array.from({ length: 8 }).map((_, i): Piece => ({ kind: "daun", neat: [-70 + i * 20, -12 + (i % 2) * 8, rnd(i) * 40 - 20, 1], seed: 60 + i })),
];
const drawPiece = (kind: Kind) => {
  switch (kind) {
    case "ayam":
      return (
        <g>
          <path d="M-16 0 Q0 -9 16 2" fill="none" stroke={OUT} strokeWidth={14} strokeLinecap="round" />
          <path d="M-16 0 Q0 -9 16 2" fill="none" stroke="#e3a43f" strokeWidth={8} strokeLinecap="round" />
        </g>
      );
    case "cakwe":
      return (
        <g>
          <rect x={-38} y={-11} width={76} height={22} rx={11} fill="#f2b84b" stroke={OUT} strokeWidth={5} />
          <path d="M-24 -2 L-12 4 M0 -3 L12 4 M20 -2 L28 3" stroke="#c98a22" strokeWidth={3} strokeLinecap="round" />
        </g>
      );
    case "kerupuk":
      return (
        <g>
          <circle r={34} fill="#ffe4a3" stroke={OUT} strokeWidth={5} />
          <circle cx={-10} cy={-8} r={5} fill="#f5c978" />
          <circle cx={12} cy={6} r={6} fill="#f5c978" />
          <circle cx={-4} cy={14} r={4} fill="#f5c978" />
        </g>
      );
    case "sambal":
      return <circle r={9} fill="#e5383b" stroke={OUT} strokeWidth={4} />;
    default:
      return <rect x={-7} y={-3} width={14} height={6} rx={3} fill="#3bb273" />;
  }
};

type Expr = "smug" | "evil" | "angry" | "happy" | "shock";
const Face: React.FC<{ expr: Expr; f: number; look: [number, number] }> = ({ expr, f, look }) => {
  const blink = f % 120 < 4;
  const eyes = [-55, 55].map((ex) => {
    if (expr === "smug" || expr === "happy")
      return <path key={ex} d={`M${ex - 18} ${expr === "happy" ? 92 : 88} Q${ex} ${expr === "happy" ? 68 : 72} ${ex + 18} ${expr === "happy" ? 92 : 88}`} fill="none" stroke={OUT} strokeWidth={8} strokeLinecap="round" />;
    if (expr === "shock")
      return (
        <g key={ex} transform={`translate(${ex} 86)`}>
          <ellipse rx={24} ry={28} fill="#fff" stroke={OUT} strokeWidth={6} />
          <circle cx={look[0] * 6} cy={look[1] * 6} r={7} fill={OUT} />
        </g>
      );
    const r = expr === "evil" ? 11 : 14;
    return (
      <g key={ex} transform={`translate(${ex} 88)`}>
        <ellipse rx={r} ry={blink ? 3 : r + 4} fill={OUT} />
        {!blink && <circle cx={4} cy={-6} r={4} fill="#fff" />}
      </g>
    );
  });
  return (
    <g>
      {eyes}
      {(expr === "evil" || expr === "angry") && (
        <g stroke={OUT} strokeWidth={9} strokeLinecap="round">
          <path d="M-84 56 L-34 74" />
          <path d="M84 56 L34 74" />
        </g>
      )}
      <ellipse cx={-92} cy={112} rx={20} ry={12} fill={RED} opacity={0.35} />
      <ellipse cx={92} cy={112} rx={20} ry={12} fill={RED} opacity={0.35} />
      {expr === "smug" && <path d="M-22 120 Q10 138 42 110" fill="none" stroke={OUT} strokeWidth={7} strokeLinecap="round" />}
      {expr === "evil" && (
        <g>
          <path d="M-42 112 Q0 154 42 112Z" fill={OUT} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
          <path d="M-30 114 L30 114 L24 124 L-24 124Z" fill="#fff" />
        </g>
      )}
      {expr === "angry" && <path d="M-30 136 Q0 112 30 136" fill="none" stroke={OUT} strokeWidth={8} strokeLinecap="round" />}
      {expr === "happy" && (
        <g>
          <path d="M-32 112 Q0 158 32 112Z" fill={OUT} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
          <ellipse cx={0} cy={134} rx={13} ry={8} fill={RED} />
        </g>
      )}
      {expr === "shock" && <ellipse cx={0} cy={132} rx={15} ry={22} fill={OUT} />}
    </g>
  );
};

const Spoon: React.FC<{ x: number; y: number; scoop?: number }> = ({ x, y, scoop = 0 }) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M20 -4 L230 -92" stroke={OUT} strokeWidth={24} strokeLinecap="round" />
    <path d="M20 -4 L230 -92" stroke="#dfe6ee" strokeWidth={12} strokeLinecap="round" />
    <ellipse rx={38} ry={24} fill="#dfe6ee" stroke={OUT} strokeWidth={7} />
    {scoop > 0 && <ellipse cx={0} cy={-8} rx={32 * scoop} ry={14 * scoop} fill={CREAM} stroke={OUT} strokeWidth={4} />}
  </g>
);

type BowlP = {
  x: number;
  y: number;
  s?: number;
  f: number;
  accent?: string;
  expr?: Expr;
  mixed?: number;
  show?: Partial<Record<Kind | "kecap", number>>;
  hat?: boolean;
  bite?: number;
  stir?: boolean;
  scoopSpoon?: number; // start frame of scoop cycle, -1 = off
  look?: [number, number];
  wobble?: number;
  steam?: boolean;
};

const mixCol = (c1: number[], c2: number[], t: number) => `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;

const KF: [number, number, number, number][] = [
  [0, 170, -140, 0],
  [0.3, -130, -4, 0],
  [0.4, -130, -4, 1],
  [0.75, -40, -200, 1],
  [0.9, -40, -200, 0],
  [1, 170, -140, 0],
];
const scoopPose = (p: number) => {
  for (let i = 0; i < KF.length - 1; i++) {
    const a = KF[i];
    const b = KF[i + 1];
    if (p >= a[0] && p <= b[0]) {
      const t = ease((p - a[0]) / (b[0] - a[0]));
      return { x: lerp(a[1], b[1], t), y: lerp(a[2], b[2], t), sc: lerp(a[3], b[3], t) };
    }
  }
  return { x: 170, y: -140, sc: 0 };
};

const Bowl: React.FC<BowlP> = ({
  x,
  y,
  s = 1,
  f,
  accent = TEAL,
  expr = "smug",
  mixed = 0,
  show = {},
  hat = false,
  bite = 0,
  stir = false,
  scoopSpoon = -1,
  look = [0, 0],
  wobble = 0,
  steam = true,
}) => {
  const sh = (k: Kind | "kecap") => show[k] ?? 1;
  const bob = Math.sin(f / 12) * 4 + (wobble ? Math.sin(f * 1.7) * wobble : 0);
  const surf = mixCol([255, 240, 194], [214, 154, 82], mixed);
  const sa = f / 5;
  let spoon: React.ReactNode = null;
  if (stir) spoon = <Spoon x={Math.cos(sa) * 70} y={Math.sin(sa) * 14 - 8} />;
  if (scoopSpoon >= 0 && f >= scoopSpoon - 6) {
    const p = (((f - scoopSpoon) % 54) + 54) % 54 / 54;
    const pose = scoopPose(f < scoopSpoon ? 0 : p);
    spoon = <Spoon x={pose.x} y={pose.y} scoop={pose.sc} />;
  }
  return (
    <g transform={`translate(${x} ${y + bob}) scale(${s})`}>
      <ellipse cx={0} cy={190} rx={210} ry={22} fill={OUT} opacity={0.18} />
      {steam &&
        [-60, 0, 60].map((sx, i) => (
          <path
            key={i}
            d={`M${sx + Math.sin(f / 10 + i) * 8} -70 q14 -26 0 -52 t0 -52`}
            fill="none"
            stroke="#fff"
            strokeWidth={9}
            strokeLinecap="round"
            opacity={0.45 + 0.2 * Math.sin(f / 9 + i)}
          />
        ))}
      {/* bowl body */}
      <path d="M-196 0 Q-196 172 0 178 Q196 172 196 0Z" fill="#fdf6e3" stroke={OUT} strokeWidth={9} strokeLinejoin="round" />
      <path d="M-188 34 Q0 84 188 34" fill="none" stroke={accent} strokeWidth={14} strokeLinecap="round" />
      <ellipse cx={0} cy={184} rx={84} ry={16} fill="#fdf6e3" stroke={OUT} strokeWidth={8} />
      <path d="M-196 0 Q-196 172 0 178" fill="none" stroke="#fff" strokeWidth={0} />
      {/* rim + surface */}
      <ellipse cx={0} cy={0} rx={196} ry={56} fill="#fdf6e3" stroke={OUT} strokeWidth={9} />
      <ellipse cx={0} cy={2} rx={172} ry={42} fill={surf} stroke={OUT} strokeWidth={5} />
      {mixed > 0 && (
        <g opacity={mixed * 0.6} fill="none" stroke="#b9792f" strokeWidth={5} strokeLinecap="round">
          <path d={`M-90 ${Math.sin(sa) * 4} Q0 -22 90 ${Math.cos(sa) * 4}`} />
          <path d="M-60 16 Q0 30 70 12" />
        </g>
      )}
      {bite > 0 && <ellipse cx={-128} cy={6} rx={42 * bite} ry={16 * bite} fill="#f1d58c" stroke={OUT} strokeWidth={3 * bite} />}
      {sh("kecap") > 0 && mixed < 1 && (
        <path d="M-130 -2 Q-100 -24 -70 -4 T-10 -4 T50 -4 T110 -4" fill="none" stroke="#5a2d14" strokeWidth={9 * sh("kecap")} strokeLinecap="round" opacity={(1 - mixed) * Math.min(1, sh("kecap") * 2)} />
      )}
      {PIECES.map((p, i) => {
        const t = sh(p.kind);
        if (t <= 0) return null;
        const ex = ease(t);
        const mx = (rnd(p.seed) - 0.5) * 270;
        const my = (rnd(p.seed + 7) - 0.5) * 52 - 4;
        const nx = lerp(p.neat[0], mx, mixed);
        const ny = lerp(p.neat[1], my, mixed);
        const rot = lerp(p.neat[2], rnd(p.seed + 3) * 360, mixed);
        const sc = lerp(p.neat[3], p.kind === "kerupuk" ? 0.45 : p.kind === "cakwe" ? 0.55 : 0.8, mixed) * ex;
        const shake = p.kind === "kerupuk" && wobble ? Math.sin(f * 2 + i) * 3 : 0;
        return (
          <g key={i} transform={`translate(${nx + shake} ${ny - (1 - ex) * 420}) rotate(${rot}) scale(${sc})`} opacity={Math.min(1, t * 3)}>
            {drawPiece(p.kind)}
          </g>
        );
      })}
      {spoon}
      {hat && (
        <g transform="translate(0 -56)">
          <path d="M-84 -2 Q-80 -62 10 -60 Q92 -58 84 -2 Q0 -26 -84 -2Z" fill="#c1121f" stroke={OUT} strokeWidth={7} strokeLinejoin="round" />
          <path d="M-84 -2 Q0 -26 84 -2" fill="none" stroke={OUT} strokeWidth={5} />
          <circle cx={14} cy={-64} r={9} fill="#c1121f" stroke={OUT} strokeWidth={5} />
        </g>
      )}
      <Face expr={expr} f={f} look={look} />
      {expr === "angry" && (
        <g stroke={RED} strokeWidth={9} strokeLinecap="round">
          <path d="M104 40 L130 28 M104 28 L130 40" transform={`rotate(${Math.sin(f / 3) * 8} 117 34)`} />
        </g>
      )}
    </g>
  );
};

// ---------- background ----------
const Background: React.FC<{ f: number; tint: number }> = ({ f, tint }) => (
  <g>
    <defs>
      <linearGradient id="bgB" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={BG1} />
        <stop offset="1" stopColor={BG2} />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#bgB)" />
    <g transform={`translate(540 900) rotate(${f * 0.2})`} opacity={0.14} fill="#fff">
      {Array.from({ length: 14 }).map((_, i) => {
        const a0 = (i / 14) * Math.PI * 2;
        const a1 = a0 + Math.PI / 14;
        return <path key={i} d={`M0 0 L${Math.cos(a0) * 1800} ${Math.sin(a0) * 1800} L${Math.cos(a1) * 1800} ${Math.sin(a1) * 1800}Z`} />;
      })}
    </g>
    <rect width={1080} height={1920} fill={RED} opacity={tint * 0.2} />
    {Array.from({ length: 12 }).map((_, i) => {
      const by = 1700 - ((f * (0.8 + rnd(i) * 1.4) + rnd(i + 9) * 1700) % 1700);
      return <circle key={i} cx={rnd(i + 3) * 1080 + Math.sin(f / 25 + i) * 18} cy={by} r={5 + rnd(i + 5) * 10} fill="#fff" opacity={0.35} />;
    })}
    {/* table */}
    <rect x={0} y={1600} width={1080} height={320} fill="#b9733a" stroke={OUT} strokeWidth={8} />
    <path d="M0 1700 H1080 M0 1810 H1080" stroke={OUT} strokeWidth={4} opacity={0.35} />
  </g>
);

// ---------- subtitles ----------
const Subtitle: React.FC<{ f: number }> = ({ f }) => {
  const t = f / 30;
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) if (t >= WORDS[i].t0) idx = i;
  if (idx < 0) return null;
  const cur = WORDS[idx];
  if (t > cur.t1 + 0.5) return null;
  const group = WORDS.filter((w) => w.chunk === cur.chunk);
  return (
    <g>
      <rect x={70} y={1648} width={940} height={108} rx={34} fill={OUT} opacity={0.82} />
      <text x={540} y={1720} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={58} fill="#fff">
        {group.map((w, i) => (
          <tspan key={i} fill={w === cur ? YEL : "#fff"}>
            {w.w.toUpperCase()}
            {i < group.length - 1 ? " " : ""}
          </tspan>
        ))}
      </text>
    </g>
  );
};

const Garland: React.FC<{ f: number }> = ({ f }) => {
  const n = 12;
  const pts = Array.from({ length: n }).map((_, i) => {
    const t = (i + 0.5) / n;
    const x = lerp(0, 1080, t);
    const y = (1 - t) * (1 - t) * 90 + 2 * (1 - t) * t * 250 + t * t * 90;
    return { x, y, i };
  });
  return (
    <g>
      <path d="M0 90 Q540 250 1080 90" fill="none" stroke={OUT} strokeWidth={6} />
      {pts.map((p) => (
        <g key={p.i} transform={`translate(${p.x} ${p.y}) rotate(${Math.sin(f / 10 + p.i) * 6})`}>
          <polygon points="-34,0 34,0 0,80" fill={p.i % 2 ? "#fff" : "#e63946"} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
        </g>
      ))}
    </g>
  );
};

// ---------- main ----------
export const Bubur: React.FC = () => {
  const f = useCurrentFrame();
  let sc = 1;
  for (let i = 1; i < CUT.length - 1; i++) if (f >= CUT[i]) sc = i + 1;
  const lf = f - CUT[sc - 1];
  const BY = 1300;

  let hero: React.ReactNode = null;
  let overlay: React.ReactNode = null;
  let tint = 0;
  const punches: number[] = [...CUT];

  if (sc === 1) {
    const fP = F(0, "psikopat");
    const fE = F(0, "elegan");
    const fB = F(0, "bedah");
    punches.push(fP, fE, fB);
    const expr: Expr = f >= fE ? "smug" : f >= fP ? "evil" : "smug";
    tint = f >= fP && f < fE ? 0.6 + 0.4 * Math.sin(f / 3) : 0;
    hero = <Bowl x={540} y={BY} s={1.4} f={f} accent={TEAL} expr={expr} hat={f >= fE} look={[Math.sin(f / 20), 0.3]} wobble={f >= fP && f < fE ? 3 : 0} />;
    overlay = (
      <g>
        <T f={f} t0={6} x={540} y={330} size={84} text="NGGAK DIADUK..." fill={YEL} rot={-3} />
        <Tag f={f} t0={fP} x={540} y={560} size={110} text="PSIKOPAT?" box={RED} ink="#fff" rot={2} />
        <Tag f={f} t0={fE} x={540} y={780} size={110} text="ELEGAN?" box={TEAL} ink="#fff" rot={-2} />
        <T f={f} t0={fB} x={540} y={980} size={96} text="KITA BEDAH!" fill={YEL} rot={-3} />
        {f >= fE &&
          [[250, 1130, 1], [830, 1100, 1.2], [200, 1330, 0.8], [880, 1320, 0.9], [540, 1000, 0.7]].map(([sx, sy, ss], i) => (
            <Spark key={i} x={sx} y={sy + Math.sin(f / 8 + i) * 8} s={popS(f, fE + i * 3) * ss * (0.8 + 0.2 * Math.sin(f / 5 + i))} rot={f * 3} />
          ))}
      </g>
    );
  } else if (sc === 2) {
    const fSar = F(1, "sarapan");
    const fId = F(1, "identitas");
    const fSp = F(1, "terbelah");
    punches.push(fSar, fId, fSp);
    if (f < fSp) {
      hero = <Bowl x={540} y={BY} s={1.35} f={f} accent={RED} expr={f >= fId ? "happy" : "smug"} mixed={0} />;
      overlay = (
        <g>
          <Garland f={f} />
          <Tag f={f} t0={CUT[1] + 6} x={540} y={470} size={64} text="BUBUR AYAM" box="#fff" />
          <Tag f={f} t0={fSar} x={540} y={640} size={64} text="BUKAN CUMA SARAPAN" box={YEL} rot={-2} />
          <T f={f} t0={fId} x={540} y={850} size={92} text="INI IDENTITAS!" fill="#fff" rot={2} />
        </g>
      );
    } else {
      const lx = 270 + (1 - prog(f, fSp, fSp + 10)) * -300;
      const rx = 810 + (1 - prog(f, fSp, fSp + 10)) * 300;
      hero = (
        <g>
          <Bowl x={lx} y={BY + 30} s={0.78} f={f} accent={RED} expr="angry" mixed={1} look={[1, 0]} />
          <Bowl x={rx} y={BY + 30} s={0.78} f={f + 17} accent={TEAL} expr="angry" mixed={0} look={[-1, 0]} />
        </g>
      );
      const zig = "M540 180 L500 420 L590 600 L490 800 L590 1000 L500 1200 L560 1560";
      overlay = (
        <g>
          <path d={zig} fill="none" stroke={OUT} strokeWidth={26} strokeLinejoin="round" strokeLinecap="round" opacity={prog(f, fSp, fSp + 6)} />
          <path d={zig} fill="none" stroke={YEL} strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" opacity={prog(f, fSp, fSp + 6)} />
          <Tag f={f} t0={fSp + 6} x={270} y={420} size={52} text="TIM DIADUK" box={RED} ink="#fff" rot={-3} />
          <Tag f={f} t0={fSp + 10} x={810} y={420} size={52} text="NGGAK DIADUK" box={TEAL} ink="#fff" rot={3} />
          <T f={f} t0={fSp + 4} x={540} y={800} size={150} text="VS" fill={YEL} rot={-6} dur={8} />
        </g>
      );
    }
  } else if (sc === 3) {
    const dropT = (fc: number) => clamp((f - fc) / 12, 0, 1);
    const fAy = F(2, "ayam");
    const fKe = F(2, "kerupuk");
    const fCa = F(2, "cakwe");
    const fKc = F(2, "kecap");
    const fSa = F(2, "sambal");
    const fTc = F(2, "tercampur");
    const fSm = F(2, "semua");
    const fPr = F(2, "praktis");
    punches.push(F(2, "menyatu"), fAy, fKe, fCa, fKc, fSa, fTc, fSm, fPr);
    const mixed = prog(f, fTc, fTc + 80);
    hero = (
      <Bowl
        x={540}
        y={BY}
        s={1.4}
        f={f}
        accent={RED}
        expr={f >= fTc ? "happy" : "smug"}
        mixed={mixed}
        show={{ ayam: dropT(fAy), kerupuk: dropT(fKe), cakwe: dropT(fCa), kecap: dropT(fKc), sambal: dropT(fSa), daun: dropT(fSa + 8) }}
        stir={f >= fTc - 8}
      />
    );
    overlay = (
      <g>
        <Tag f={f} t0={CUT[2] + 6} x={540} y={340} size={84} text="TIM DIADUK" box={RED} ink="#fff" rot={-2} />
        <T f={f} t0={F(2, "menyatu")} x={540} y={520} size={92} text="HARUS MENYATU!" />
        {f < fSm &&
          slot(f, [
            [fAy, <T key="a" f={f} t0={fAy} x={540} y={720} size={100} text="AYAM" fill={YEL} />],
            [fKe, <T key="k" f={f} t0={fKe} x={540} y={720} size={100} text="KERUPUK" fill={YEL} />],
            [fCa, <T key="c" f={f} t0={fCa} x={540} y={720} size={100} text="CAKWE" fill={YEL} />],
            [fKc, <T key="kc" f={f} t0={fKc} x={540} y={720} size={100} text="KECAP" fill={YEL} />],
            [fSa, <T key="s" f={f} t0={fSa} x={540} y={720} size={100} text="SAMBAL" fill={YEL} />],
          ])}
        <T f={f} t0={fSm} x={540} y={720} size={84} text="SEMUA RASA DAPAT!" fill={YEL} rot={-2} />
        <Tag f={f} t0={fPr} x={540} y={900} size={80} text="PRAKTIS!" box={TEAL} ink="#fff" rot={2} />
      </g>
    );
  } else if (sc === 4) {
    const fMa = F(3, "marah");
    const fBe = F(3, "berantakan");
    const fPi = F(3, "pinggir");
    const fSs = F(3, "satu-satu");
    const fRe = F(3, "renyah");
    const fMe = F(3, "mengaduk");
    const fSe = F(3, "seni");
    punches.push(fMa, fBe, fPi, fSs, fRe, fMe, fSe);
    const expr: Expr = f >= fSe ? "smug" : f >= fMe ? "shock" : f >= fPi ? "smug" : f >= fMa ? "angry" : "smug";
    hero = (
      <Bowl
        x={540}
        y={BY}
        s={1.4}
        f={f}
        accent={TEAL}
        expr={expr}
        bite={f >= fPi ? prog(f, fPi, fMe) * 0.9 : 0}
        scoopSpoon={f >= fPi && f < fMe ? fPi : -1}
        hat={f >= fSe}
        wobble={f >= fRe && f < fRe + 30 ? 2 : 0}
      />
    );
    overlay = (
      <g>
        <Tag f={f} t0={CUT[3] + 6} x={540} y={340} size={80} text="NGGAK DIADUK" box={TEAL} ink="#fff" rot={2} />
        {slot(f, [
          [fBe, <T key="1" f={f} t0={fBe} x={540} y={560} size={100} text="BERANTAKAN!" fill={RED} rot={-4} />],
          [fPi, <Tag key="2" f={f} t0={fPi} x={540} y={560} size={84} text="DARI PINGGIR" box={YEL} rot={-2} />],
          [fSs, <T key="3" f={f} t0={fSs} x={540} y={560} size={100} text="SATU-SATU" fill={YEL} rot={2} />],
          [fRe, <T key="4" f={f} t0={fRe} x={540} y={560} size={110} text="RENYAH!" fill={YEL} rot={-3} />],
          [fMe, <Tag key="5" f={f} t0={fMe} x={540} y={560} size={70} text="MERUSAK SENI?!" box={RED} ink="#fff" rot={2} />],
        ])}
        {f >= fRe && f < fMe && <T f={f} t0={fRe + 4} x={820} y={1000} size={80} text="KRIUK!" fill={YEL} rot={12} />}
        {f >= fSe &&
          [[240, 1130, 1], [850, 1110, 1.2], [210, 1320, 0.8], [880, 1310, 0.9]].map(([sx, sy, ss], i) => (
            <Spark key={i} x={sx} y={sy + Math.sin(f / 8 + i) * 8} s={popS(f, fSe + i * 3) * ss} rot={f * 3} />
          ))}
      </g>
    );
  } else if (sc === 5) {
    const fP = F(4, "psikopat");
    const fE = F(4, "elegan");
    const fD = F(4, "dua-duanya");
    const fM = F(4, "murni");
    const fEn = F(4, "enak");
    punches.push(fP, fE, fD, fM, fEn);
    const happy = f >= fM;
    hero = (
      <g>
        <Bowl x={270} y={BY + 30} s={0.82} f={f} accent={RED} expr={happy ? "happy" : "angry"} mixed={1} look={[1, 0]} />
        <Bowl x={810} y={BY + 30} s={0.82} f={f + 17} accent={TEAL} expr={happy ? "happy" : "angry"} mixed={0} look={[-1, 0]} />
      </g>
    );
    const xs = popS(f, fD, 6);
    overlay = (
      <g>
        <Tag f={f} t0={fP} x={540} y={340} size={96} text="PSIKOPAT?" box={RED} ink="#fff" rot={-2} />
        <Tag f={f} t0={fE} x={540} y={540} size={96} text="ELEGAN?" box={TEAL} ink="#fff" rot={2} />
        {f >= fD && (
          <g transform={`translate(540 440) scale(${xs})`}>
            <path d="M-330 -190 L330 190 M330 -190 L-330 190" stroke={OUT} strokeWidth={46} strokeLinecap="round" />
            <path d="M-330 -190 L330 190 M330 -190 L-330 190" stroke={RED} strokeWidth={28} strokeLinecap="round" />
          </g>
        )}
        <T f={f} t0={fD} x={540} y={800} size={68} text="DUA-DUANYA SALAH!" fill={YEL} rot={-2} />
        {slot(f, [
          [fM, <T key="m" f={f} t0={fM} x={540} y={960} size={100} text="MURNI SELERA!" fill="#fff" rot={2} />],
          [fEn, <T key="e" f={f} t0={fEn} x={540} y={960} size={76} text="YANG PENTING ENAK!" fill="#fff" rot={-2} />],
        ])}
        {f >= fEn &&
          Array.from({ length: 8 }).map((_, i) => {
            const u = clamp((f - fEn) / 45, 0, 1);
            const ang = (i / 8) * Math.PI * 2;
            return <Heart key={i} x={540 + Math.cos(ang) * (60 + 260 * ease(u))} y={1150 + Math.sin(ang) * (40 + 130 * ease(u)) - u * 50} s={0.8 * (1 - u * 0.5)} rot={(rnd(i) - 0.5) * 50} />;
          })}
      </g>
    );
  } else {
    const fG = F(5, "giliran");
    const fA = F(5, "a");
    const fB = F(5, "b");
    const fTg = F(5, "tag");
    const fFo = F(5, "follow");
    const fKu = F(5, "kuah");
    const fClick = F(5, "kuah", 1) + 14;
    punches.push(fG, fA, fB, fTg, fFo, fClick);
    const click = f >= fClick;
    const press = f >= fClick - 3 && f < fClick + 6 ? 0.92 : 1;
    hero = (
      <g>
        <Bowl x={280} y={1400} s={0.75} f={f} accent={RED} expr="happy" mixed={1} />
        <Bowl x={800} y={1400} s={0.75} f={f + 17} accent={TEAL} expr="happy" mixed={0} />
      </g>
    );
    const btn = (cx: number, color: string, letter: string, l1: string, l2: string, t0: number, ph: number) => {
      const s = popS(f, t0) * (1 + 0.04 * Math.sin(f / 6 + ph));
      if (s <= 0) return null;
      return (
        <g transform={`translate(${cx} 560) scale(${s})`}>
          <rect x={-220 + 8} y={-100 + 10} width={440} height={200} rx={40} fill={OUT} />
          <rect x={-220} y={-100} width={440} height={200} rx={40} fill={color} stroke={OUT} strokeWidth={7} />
          <text x={-130} y={44} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={140} fill="#fff" stroke={OUT} strokeWidth={14} paintOrder="stroke" strokeLinejoin="round">
            {letter}
          </text>
          <text x={70} y={-6} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={50} fill="#fff" stroke={OUT} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">
            {l1}
          </text>
          <text x={70} y={52} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={50} fill="#fff" stroke={OUT} strokeWidth={8} paintOrder="stroke" strokeLinejoin="round">
            {l2}
          </text>
        </g>
      );
    };
    const bubbles = [
      { x: 150, y: 860, l: "A", c: RED, d: 0 },
      { x: 930, y: 900, l: "B", c: TEAL, d: 6 },
      { x: 330, y: 1010, l: "B", c: TEAL, d: 12 },
      { x: 760, y: 1020, l: "A", c: RED, d: 18 },
      { x: 540, y: 930, l: "A", c: RED, d: 24 },
    ];
    const bub = 1 - prog(f, fFo - 6, fFo);
    const cx = lerp(820, 640, prog(f, fClick - 24, fClick - 6));
    const cy = lerp(1100, 880, prog(f, fClick - 24, fClick - 6));
    overlay = (
      <g>
        <T f={f} t0={fG} x={540} y={340} size={100} text="GILIRAN KAMU!" fill={YEL} rot={-3} />
        {btn(280, RED, "A", "TIM", "DIADUK", fA, 0)}
        {btn(800, TEAL, "B", "NGGAK", "DIADUK", fB, 2)}
        {f >= fTg && bub > 0 && (
          <g opacity={bub}>
            {bubbles.map((b, i) => {
              const s = popS(f, fTg + b.d);
              if (s <= 0) return null;
              return (
                <g key={i} transform={`translate(${b.x} ${b.y + Math.sin(f / 10 + i) * 8}) scale(${s})`}>
                  <path d="M-60 -50 H60 Q80 -50 80 -30 V30 Q80 50 60 50 H-10 L-40 85 L-38 50 H-60 Q-80 50 -80 30 V-30 Q-80 -50 -60 -50Z" fill="#fff" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
                  <text y={26} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={70} fill={b.c} stroke={OUT} strokeWidth={6} paintOrder="stroke">
                    {b.l}
                  </text>
                </g>
              );
            })}
            <T f={f} t0={fTg} x={540} y={760} size={64} text="TAG TEMANMU!" fill="#fff" />
          </g>
        )}
        {f >= fFo && (
          <g transform={`translate(540 880) scale(${popS(f, fFo) * press})`}>
            <rect x={-300 + 8} y={-80 + 10} width={600} height={160} rx={80} fill={OUT} />
            <rect x={-300} y={-80} width={600} height={160} rx={80} fill={click ? TEAL : YEL} stroke={OUT} strokeWidth={7} />
            <text y={32} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={click ? 80 : 90} fill={click ? "#fff" : OUT} stroke={click ? OUT : "none"} strokeWidth={click ? 10 : 0} paintOrder="stroke" strokeLinejoin="round">
              {click ? "FOLLOWED" : "+ FOLLOW"}
            </text>
          </g>
        )}
        {f >= fClick - 24 && f < fClick + 30 && (
          <g transform={`translate(${cx} ${cy}) rotate(-15)`} opacity={1 - prog(f, fClick + 16, fClick + 30)}>
            <path d="M0 0 L0 70 L18 54 L32 86 L46 80 L32 48 L56 46Z" fill="#fff" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
          </g>
        )}
        <T f={f} t0={fKu} x={540} y={1060} size={52} text="BESOK: KUAH VS TANPA KUAH" fill="#fff" />
        {click &&
          Array.from({ length: 9 }).map((_, i) => {
            const u = clamp((f - fClick) / 40, 0, 1);
            const ang = (i / 9) * Math.PI * 2 + rnd(i) * 0.5;
            const dist = 60 + rnd(i + 3) * 200;
            return (
              <Heart key={i} x={540 + Math.cos(ang) * (360 + dist * ease(u))} y={880 + Math.sin(ang) * (130 + dist * ease(u) * 0.9) - u * 60} s={0.7 * (1 - u * 0.6)} rot={(rnd(i + 5) - 0.5) * 50} />
            );
          })}
      </g>
    );
  }

  // zoom punch at scene starts and key cues
  let punch = 0;
  for (const p of punches) if (f >= p && f < p + 14) punch = Math.max(punch, 0.07 * Math.exp(-(f - p) / 4));
  const zoom = 1 + punch + (lf < 8 ? 0.1 * (1 - prog(lf, 0, 8)) : 0);
  const flash = CUT.slice(1, CUT.length - 1).reduce((m, c) => (f >= c && f < c + 6 ? Math.max(m, 0.55 * (1 - (f - c) / 6)) : m), 0);

  return (
    <AbsoluteFill style={{ backgroundColor: BG1 }}>
      <Audio src={staticFile("bubur-mix.wav")} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(540 960) scale(${zoom}) translate(-540 -960)`}>
          <Background f={f} tint={tint} />
          {hero}
          {overlay}
        </g>
        <Subtitle f={f} />
        <rect width={1080} height={1920} fill="#fff" opacity={flash} />
      </svg>
    </AbsoluteFill>
  );
};
