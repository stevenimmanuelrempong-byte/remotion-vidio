import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";

export const GURITA_TOTAL = 900; // 30s @ 30fps
const OUT = "#12102b";
const BG1 = "#0a2a52";
const BG2 = "#0f6fa8";
const OCT = "#ff7a9a";
const OCT2 = "#e8537c";
const BLUE = "#38c8ff";
const YEL = "#ffd84d";
const RED = "#ff4d6d";
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

// scene boundaries (frames) from the voiceover timing
const CUTS = [0, 137, 335, 562, 777, GURITA_TOTAL];

// voice segments (seconds): must match scripts/make-gurita-audio.mjs
const SEGS = [
  { start: 0.2, dur: 4.03, text: "Ada hewan yang punya tiga jantung, dan darahnya berwarna biru!" },
  { start: 4.55, dur: 6.29, text: "Namanya gurita. Dua jantung memompa darah ke insang, satu jantung lainnya ke seluruh tubuh." },
  { start: 11.15, dur: 7.27, text: "Darahnya biru karena mengandung hemosianin, bukan hemoglobin. Lebih efisien di air dingin yang minim oksigen." },
  { start: 18.72, dur: 6.89, text: "Yang lebih gila, jantung utamanya berhenti berdetak saat dia berenang. Makanya gurita lebih suka merayap." },
  { start: 25.9, dur: 2.4, text: "Follow buat fakta unik lainnya!" },
];

type Word = { w: string; t0: number; t1: number; chunk: number };
const buildWords = (): Word[] => {
  const out: Word[] = [];
  let chunk = 0;
  for (const seg of SEGS) {
    const ws = seg.text.split(" ");
    const wt = ws.map((w) => w.length + 1.5 + (/[,.!?]$/.test(w) ? 3 : 0));
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
      out.push({ w, t0: t0 + (acc / total) * span, t1: t0 + ((acc + wt[i]) / total) * span, chunk });
      acc += wt[i];
    });
    chunk++;
  }
  return out;
};
const WORDS = buildWords();

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

// ---------- shapes ----------
const HEART = "M0 -18 C-10 -34 -36 -26 -36 -4 C-36 14 -14 26 0 40 C14 26 36 14 36 -4 C36 -26 10 -34 0 -18Z";
const Heart: React.FC<{ x: number; y: number; s: number; fill?: string; scale?: number; rot?: number }> = ({ x, y, s, fill = BLUE, scale = 1, rot = 0 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s * scale})`}>
    <path d={HEART} fill={fill} stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
    <path d="M-22 -12 Q-24 -22 -12 -24" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" opacity={0.8} />
  </g>
);

const Drop: React.FC<{ x: number; y: number; s: number; fill: string; label?: boolean }> = ({ x, y, s, fill }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M0 -90 C10 -50 60 -10 60 40 A60 60 0 0 1 -60 40 C-60 -10 -10 -50 0 -90Z" fill={fill} stroke={OUT} strokeWidth={7} strokeLinejoin="round" />
    <path d="M-34 30 Q-34 8 -18 -6" fill="none" stroke="#fff" strokeWidth={8} strokeLinecap="round" opacity={0.75} />
  </g>
);

const pulse = (f: number, phase: number, period: number) => {
  if (f < phase) return 0;
  const ph = (f - phase) % period;
  return Math.exp(-ph / 3) + (ph >= 7 ? 0.6 * Math.exp(-(ph - 7) / 3) : 0);
};

// ---------- octopus ----------
type Expr = "happy" | "surprised" | "shock";
type OctP = {
  x: number;
  y: number;
  s?: number;
  f: number;
  expr?: Expr;
  mode?: "float" | "swim" | "crawl";
  hearts?: boolean;
  heartPulse?: number;
  mainStopped?: boolean;
  veins?: number;
  look?: [number, number];
  wave?: boolean;
  squash?: number;
};

const Octopus: React.FC<OctP> = ({
  x,
  y,
  s = 1,
  f,
  expr = "happy",
  mode = "float",
  hearts = false,
  heartPulse = 0,
  mainStopped = false,
  veins = 0,
  look = [0, 0],
  wave = false,
  squash = 1,
}) => {
  const idle = mode === "crawl" ? 0 : Math.sin(f / 14) * 6;
  const tents: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bx = -105 + i * 30;
    const side = (i - 3.5) / 3.5;
    const pts: string[] = [];
    for (let k = 0; k <= 10; k++) {
      const u = k / 10;
      let px: number;
      let py: number;
      if (wave && i === 7) {
        px = bx + u * 170 + Math.sin(f / 4 - u * 2) * 18 * u;
        py = 50 + u * 30 - u * u * 280;
      } else if (mode === "swim") {
        px = bx * (1 - 0.65 * u) + Math.sin(f / 5 + i - u * 3) * 8 * u;
        py = 50 + u * 340;
      } else if (mode === "crawl") {
        px = bx + side * u * 200 + Math.sin(f / 5 + i * 1.3 - u * 4) * 14 * u;
        py = 50 + u * 95 - Math.max(0, Math.sin(f / 5 + i * 1.3 - u * 4)) * 14 * u;
      } else {
        px = bx + side * u * 90 + Math.sin(f / 7 + i * 0.9 - u * 3) * 22 * u;
        py = 50 + u * 250 - Math.abs(side) * u * 40;
      }
      pts.push(`${k === 0 ? "M" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    tents.push(pts.join(" "));
  }
  const blink = f % 110 < 4 ? 0.12 : 1;
  const pr = expr === "surprised" ? 10 : expr === "shock" ? 6 : 17;
  const sx = s / squash;
  const sy = s * squash;
  const hp = 1 + 0.16 * heartPulse;
  return (
    <g transform={`translate(${x} ${y + idle}) scale(${sx} ${sy})`}>
      {tents.map((d, i) => (
        <path key={`o${i}`} d={d} fill="none" stroke={OUT} strokeWidth={46} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {tents.map((d, i) => (
        <path key={`f${i}`} d={d} fill="none" stroke={i % 2 ? OCT : "#ff8aa6"} strokeWidth={34} strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {veins > 0 &&
        tents.map((d, i) => (
          <path
            key={`v${i}`}
            d={d}
            fill="none"
            stroke={BLUE}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray="14 26"
            strokeDashoffset={-f * 3}
            opacity={veins}
          />
        ))}
      {/* head */}
      <ellipse cx={0} cy={-60} rx={150} ry={165} fill={OCT} stroke={OUT} strokeWidth={8} />
      <path d="M-105 -165 Q-60 -212 -10 -206" fill="none" stroke="#fff" strokeWidth={14} strokeLinecap="round" opacity={0.5} />
      <circle cx={-80} cy={-150} r={0} fill={OCT2} />
      <circle cx={95} cy={-30} r={13} fill={OCT2} opacity={0.6} />
      <circle cx={-120} cy={20} r={10} fill={OCT2} opacity={0.6} />
      <circle cx={118} cy={-95} r={9} fill={OCT2} opacity={0.6} />
      {hearts && (
        <g>
          <Heart x={0} y={-150} s={0.95} scale={mainStopped ? 1 : hp} fill={mainStopped ? "#8aa0b5" : BLUE} />
          <Heart x={-105} y={-135} s={0.68} scale={hp} />
          <Heart x={105} y={-135} s={0.68} scale={hp} />
        </g>
      )}
      {/* eyes */}
      {[-56, 56].map((ex) => (
        <g key={ex} transform={`translate(${ex} -20)`}>
          <ellipse rx={36} ry={38 * blink} fill="#fff" stroke={OUT} strokeWidth={6} />
          <ellipse cx={look[0] * 8} cy={look[1] * 8} rx={pr} ry={pr * blink} fill={OUT} />
          {blink === 1 && <circle cx={look[0] * 8 + 4} cy={look[1] * 8 - 5} r={4} fill="#fff" />}
        </g>
      ))}
      <ellipse cx={-92} cy={28} rx={20} ry={12} fill={RED} opacity={0.35} />
      <ellipse cx={92} cy={28} rx={20} ry={12} fill={RED} opacity={0.35} />
      {expr === "happy" && <path d="M-24 44 Q0 70 24 44" fill="none" stroke={OUT} strokeWidth={7} strokeLinecap="round" />}
      {expr === "surprised" && <ellipse cx={0} cy={54} rx={15} ry={21} fill={OUT} />}
      {expr === "shock" && (
        <g>
          <path d="M-28 56 Q-14 42 0 56 T28 56" fill="none" stroke={OUT} strokeWidth={7} strokeLinecap="round" />
          <path d="M120 -150 C124 -135 140 -125 140 -110 A20 20 0 0 1 100 -110 C100 -125 116 -135 120 -150Z" fill={BLUE} stroke={OUT} strokeWidth={5} />
        </g>
      )}
    </g>
  );
};

// ---------- background ----------
const Background: React.FC<{ f: number; cold: number }> = ({ f, cold }) => (
  <g>
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={BG2} />
        <stop offset="1" stopColor={BG1} />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#bg)" />
    {[0, 1, 2, 3].map((i) => (
      <polygon
        key={i}
        points={`${150 + i * 260 + Math.sin(f / 90 + i) * 40},0 ${230 + i * 260 + Math.sin(f / 90 + i) * 40},0 ${60 + i * 260},1700 ${-120 + i * 260},1700`}
        fill="#fff"
        opacity={0.05}
      />
    ))}
    <rect width={1080} height={1920} fill={BLUE} opacity={cold * 0.18} />
    {Array.from({ length: 16 }).map((_, i) => {
      const sp = 1.2 + rnd(i) * 2;
      const by = 1920 - ((f * sp + rnd(i + 9) * 2200) % 2200);
      const bx = rnd(i + 3) * 1080 + Math.sin(f / 20 + i) * 14;
      const r = 6 + rnd(i + 5) * 16;
      return <circle key={i} cx={bx} cy={by} r={r} fill="none" stroke="#fff" strokeWidth={3} opacity={0.35} />;
    })}
    {/* seabed */}
    {[80, 220, 880, 1000].map((sx, i) => (
      <path
        key={i}
        d={`M${sx} 1620 Q${sx + Math.sin(f / 18 + i) * 30} 1540 ${sx + Math.sin(f / 22 + i * 2) * 40} 1470`}
        fill="none"
        stroke={OUT}
        strokeWidth={30}
        strokeLinecap="round"
      />
    ))}
    {[80, 220, 880, 1000].map((sx, i) => (
      <path
        key={i}
        d={`M${sx} 1620 Q${sx + Math.sin(f / 18 + i) * 30} 1540 ${sx + Math.sin(f / 22 + i * 2) * 40} 1470`}
        fill="none"
        stroke="#2bb673"
        strokeWidth={20}
        strokeLinecap="round"
      />
    ))}
    <path d="M0 1580 Q270 1540 540 1575 T1080 1565 V1920 H0Z" fill="#d9b36c" stroke={OUT} strokeWidth={8} />
    <ellipse cx={170} cy={1835} rx={50} ry={28} fill="#9aa7bd" stroke={OUT} strokeWidth={6} />
    <ellipse cx={930} cy={1840} rx={64} ry={34} fill="#9aa7bd" stroke={OUT} strokeWidth={6} />
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
      <rect x={70} y={1635} width={940} height={110} rx={34} fill={OUT} opacity={0.72} />
      <text x={540} y={1708} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={58} fill="#fff">
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

// ---------- ECG ----------
const BEATS = [20.2, 20.9, 21.6];
const FLAT = 22.0;
const ecgY = (t: number) => {
  if (t >= FLAT) return 0;
  let y = 0;
  for (const b of BEATS) {
    const d = t - b;
    y += 95 * Math.exp(-(d * d) / (2 * 0.02 * 0.02)) - 28 * Math.exp(-((d - 0.1) ** 2) / (2 * 0.03 * 0.03));
  }
  return y;
};
const Ecg: React.FC<{ f: number; show: number }> = ({ f, show }) => {
  if (show <= 0) return null;
  const now = f / 30;
  const t0 = Math.max(20.1, now - 3.5);
  const pxs = 223;
  const pts: [number, number][] = [];
  for (let t = t0; t <= now; t += 0.012) pts.push([930 - (now - t) * pxs, 650 - ecgY(t) * 1.3]);
  const live = pts.filter((p, i) => i === 0 || true).map((p, i) => `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`);
  const flatStart = 930 - (now - FLAT) * pxs;
  const flat = now >= FLAT ? `M${Math.max(150, flatStart).toFixed(1)} 650 L930 650` : "";
  const head = pts[pts.length - 1];
  const stopped = now >= FLAT;
  return (
    <g opacity={show} transform={`translate(0 ${(1 - show) * -60})`}>
      <rect x={110} y={500} width={860} height={270} rx={36} fill={OUT} opacity={0.88} stroke={BLUE} strokeWidth={5} />
      <text x={150} y={560} fontFamily={FONT} fontWeight={900} fontSize={34} fill={BLUE}>
        JANTUNG UTAMA
      </text>
      <clipPath id="ecgclip">
        <rect x={130} y={575} width={820} height={180} />
      </clipPath>
      <g clipPath="url(#ecgclip)">
        <path d={live.join(" ")} fill="none" stroke={stopped ? RED : BLUE} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        {flat && <path d={flat} fill="none" stroke={RED} strokeWidth={8} strokeLinecap="round" />}
      </g>
      {head && <circle cx={head[0]} cy={head[1]} r={11} fill="#fff" stroke={stopped ? RED : BLUE} strokeWidth={5} />}
    </g>
  );
};

// ---------- main ----------
export const Gurita: React.FC = () => {
  const f = useCurrentFrame();
  const sc = f < CUTS[1] ? 1 : f < CUTS[2] ? 2 : f < CUTS[3] ? 3 : f < CUTS[4] ? 4 : 5;
  const lf = f - CUTS[sc - 1];

  // zoom punch at scene start and on key hits
  const punches = [0, 57, 96, 141, 180, 255, 335, 396, 456, 562, 662, 720, 777, 804];
  let punch = 0;
  for (const p of punches) if (f >= p && f < p + 14) punch = Math.max(punch, 0.07 * Math.exp(-(f - p) / 4));
  const zoom = 1 + punch + (lf < 8 ? 0.1 * (1 - prog(lf, 0, 8)) : 0);

  const cold = sc === 3 ? prog(f, 495, 520) : 0;

  const flash = CUTS.slice(1, 5).reduce((m, c) => (f >= c && f < c + 6 ? Math.max(m, 0.55 * (1 - (f - c) / 6)) : m), 0);

  let hero: React.ReactNode = null;
  let overlay: React.ReactNode = null;

  if (sc === 1) {
    hero = <Octopus x={540} y={1130} s={1.1} f={f} expr="surprised" look={[Math.sin(f / 20), 0.3]} />;
    overlay = (
      <g>
        <T f={f} t0={9} x={540} y={340} size={92} text="FAKTA GILA!" fill={YEL} rot={-4} />
        <T f={f} t0={57} x={540} y={520} size={130} text="3 JANTUNG?" />
        <Tag f={f} t0={96} x={540} y={740} size={96} text="DARAH BIRU?!" box={BLUE} ink="#fff" rot={2} />
        <Heart x={230} y={990 + Math.sin(f / 9) * 10} s={popS(f, 60) * 1.1} />
        <Heart x={540} y={850 + Math.sin(f / 9 + 1) * 10} s={popS(f, 69) * 1.1} />
        <Heart x={850} y={990 + Math.sin(f / 9 + 2) * 10} s={popS(f, 78) * 1.1} />
      </g>
    );
  } else if (sc === 2) {
    const hb = pulse(f, 168, 23.4);
    hero = <Octopus x={540} y={1170} s={1.1} f={f} expr="happy" hearts heartPulse={hb} veins={prog(f, 180, 200)} />;
    const arrow = (x: number, y0: number, y1: number, show: number) =>
      show > 0 && (
        <g opacity={show} transform={`translate(0 ${Math.sin(f / 5) * 6})`}>
          <path d={`M${x} ${y0} L${x} ${y1 - 24}`} stroke={OUT} strokeWidth={22} strokeLinecap="round" />
          <path d={`M${x} ${y0} L${x} ${y1 - 24}`} stroke={YEL} strokeWidth={12} strokeLinecap="round" />
          <polygon points={`${x - 28},${y1 - 34} ${x + 28},${y1 - 34} ${x},${y1}`} fill={YEL} stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
        </g>
      );
    overlay = (
      <g>
        <T f={f} t0={141} x={540} y={350} size={170} text="GURITA" fill="#fff" />
        {arrow(425, 600, 960, popS(f, 180) > 0 ? 1 : 0)}
        {arrow(655, 600, 960, popS(f, 180) > 0 ? 1 : 0)}
        {arrow(540, 800, 925, popS(f, 255) > 0 ? 1 : 0)}
        <Tag f={f} t0={180} x={540} y={560} size={60} text="2 JANTUNG INSANG" />
        <Tag f={f} t0={255} x={540} y={760} size={60} text="1 JANTUNG UTAMA" box={BLUE} ink="#fff" />
      </g>
    );
  } else if (sc === 3) {
    hero = <Octopus x={540} y={1310} s={0.85} f={f} expr="happy" veins={1} />;
    const dropsOut = 1 - prog(f, 488, 500);
    const snow = prog(f, 495, 505);
    overlay = (
      <g>
        <T f={f} t0={341} x={270} y={350} size={125} text="DARAH" />
        <Tag f={f} t0={349} x={785} y={350} size={125} text="BIRU" box={BLUE} ink="#fff" rot={-3} />
        {dropsOut > 0 && (
          <g opacity={dropsOut}>
            <g transform={`translate(0 ${Math.sin(f / 10) * 8})`}>
              <Drop x={290} y={780} s={popS(f, 380) * 1.5} fill={BLUE} />
            </g>
            <Tag f={f} t0={396} x={290} y={1000} size={44} text="HEMOSIANIN" box={BLUE} ink="#fff" />
            <g transform={`translate(0 ${Math.sin(f / 10 + 2) * 8})`}>
              <Drop x={790} y={780} s={popS(f, 440) * 1.5} fill={RED} />
              {f >= 456 && (
                <g transform={`translate(790 790) scale(${popS(f, 456, 6)})`}>
                  <path d="M-80 -80 L80 80 M80 -80 L-80 80" stroke={OUT} strokeWidth={36} strokeLinecap="round" />
                  <path d="M-80 -80 L80 80 M80 -80 L-80 80" stroke="#fff" strokeWidth={20} strokeLinecap="round" />
                </g>
              )}
            </g>
            <Tag f={f} t0={450} x={790} y={1000} size={44} text="HEMOGLOBIN" box={RED} ink="#fff" />
          </g>
        )}
        {snow > 0 && (
          <g>
            <Tag f={f} t0={495} x={540} y={700} size={84} text="AIR DINGIN" box={BLUE} ink="#fff" rot={-2} />
            <Tag f={f} t0={507} x={540} y={900} size={84} text="OKSIGEN SEDIKIT" rot={2} />
            {Array.from({ length: 22 }).map((_, i) => {
              const sx = rnd(i) * 1080;
              const sy = ((f * (2 + rnd(i + 4) * 3) + rnd(i + 7) * 1900) % 1900) - 20;
              const r = 12 + rnd(i + 2) * 14;
              return (
                <g key={i} transform={`translate(${sx + Math.sin(f / 15 + i) * 20} ${sy}) rotate(${f * 2 + i * 30})`} stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.85 * snow}>
                  <path d={`M0 ${-r} L0 ${r} M${-r} 0 L${r} 0 M${-r * 0.7} ${-r * 0.7} L${r * 0.7} ${r * 0.7} M${r * 0.7} ${-r * 0.7} L${-r * 0.7} ${r * 0.7}`} />
                </g>
              );
            })}
          </g>
        )}
      </g>
    );
  } else if (sc === 4) {
    // octopus motion
    const swimY = (ff: number) => {
      const u = ff - 675;
      return 1180 - 120 * (0.5 - 0.5 * Math.cos((2 * Math.PI * u) / 24)) - Math.min(u, 36) * 3;
    };
    let oy = 1190;
    let os = 1.0;
    let mode: "float" | "swim" | "crawl" = "float";
    let expr: Expr = "happy";
    let sq = 1;
    let ox = 540;
    if (f >= 648 && f < 662) expr = "surprised";
    if (f >= 662) expr = "shock";
    if (f >= 675 && f < 715) {
      mode = "swim";
      oy = swimY(f);
      sq = 1 + 0.16 * Math.sin((2 * Math.PI * (f - 675)) / 24);
    }
    if (f >= 715) {
      const k = prog(f, 715, 735);
      const endY = swimY(715);
      oy = lerp(endY, 1405, k);
      os = lerp(1.0, 0.8, k);
      mode = k > 0.5 ? "crawl" : "swim";
      expr = k > 0.5 ? "happy" : "shock";
      if (k >= 1) ox = 540 + 130 * Math.sin((f - 735) / 16);
    }
    const hb = f < 660 ? pulse(f, 606, 21) : 0;
    hero = <Octopus x={ox} y={oy} s={os} f={f} expr={expr} mode={mode} squash={sq} hearts mainStopped={f >= 660} heartPulse={hb} />;
    const panel = f < 603 ? 0 : f >= 690 ? 1 - prog(f, 690, 705) : prog(f, 603, 612);
    overlay = (
      <g>
        {f < 675 && <T f={f} t0={570} x={540} y={360} size={125} text="LEBIH GILA!" fill={YEL} rot={-3} />}
        {f >= 675 && f < 720 && <T f={f} t0={675} x={540} y={360} size={105} text="SAAT BERENANG" />}
        {f >= 720 && <Tag f={f} t0={720} x={540} y={380} size={100} text="SUKA MERAYAP" box={YEL} rot={-2} />}
        <Ecg f={f} show={panel} />
        {f >= 662 && f < 720 && <T f={f} t0={662} x={540} y={880} size={130} text="STOP!" fill={RED} rot={-6} />}
      </g>
    );
  } else {
    const click = f >= 804;
    const press = f >= 800 && f < 810 ? 0.92 : 1;
    hero = <Octopus x={540} y={1190} s={1.05} f={f} expr="happy" wave />;
    const bs = popS(f, 780) * press;
    const cx = lerp(820, 640, prog(f, 785, 800));
    const cy = lerp(780, 560, prog(f, 785, 800));
    overlay = (
      <g>
        <g transform={`translate(540 560) scale(${bs})`}>
          <rect x={-310 + 8} y={-85 + 10} width={620} height={170} rx={85} fill={OUT} />
          <rect x={-310} y={-85} width={620} height={170} rx={85} fill={click ? BLUE : YEL} stroke={OUT} strokeWidth={7} />
          <text y={34} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={click ? 86 : 96} fill={click ? "#fff" : OUT} stroke={click ? OUT : "none"} strokeWidth={click ? 10 : 0} paintOrder="stroke" strokeLinejoin="round">
            {click ? "FOLLOWED" : "+ FOLLOW"}
          </text>
        </g>
        {f >= 785 && f < 830 && (
          <g transform={`translate(${cx} ${cy}) rotate(-15)`} opacity={1 - prog(f, 818, 830)}>
            <path d="M0 0 L0 70 L18 54 L32 86 L46 80 L32 48 L56 46Z" fill="#fff" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
          </g>
        )}
        <T f={f} t0={786} x={540} y={800} size={68} text="FAKTA UNIK LAINNYA!" />
        {click &&
          Array.from({ length: 9 }).map((_, i) => {
            const u = clamp((f - 804) / 40, 0, 1);
            const ang = (i / 9) * Math.PI * 2 + rnd(i) * 0.5;
            const dist = 60 + rnd(i + 3) * 200;
            return (
              <Heart
                key={i}
                x={540 + Math.cos(ang) * (340 + dist * ease(u))}
                y={560 + Math.sin(ang) * (140 + dist * ease(u) * 0.9) - u * 60}
                s={0.7 * (1 - u * 0.6)}
                rot={(rnd(i + 5) - 0.5) * 50}
              />
            );
          })}
      </g>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: BG1 }}>
      <Audio src={staticFile("gurita-mix.wav")} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(540 960) scale(${zoom}) translate(-540 -960)`}>
          <Background f={f} cold={cold} />
          {hero}
          {overlay}
        </g>
        <Subtitle f={f} />
        <rect width={1080} height={1920} fill="#fff" opacity={flash} />
      </svg>
    </AbsoluteFill>
  );
};
