import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";

export const MIE_TOTAL = 1800; // 60s @ 30fps
const OUT = "#2b1a12";
const BG1 = "#ffe08a";
const BG2 = "#ff7a59";
const RED = "#ef476f";
const GOR = "#ff8a00"; // team goreng
const KUA = "#2f9bff"; // team kuah
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
const mixCol = (c1: number[], c2: number[], t: number) => `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;

// ---------- voice timeline (must match scripts/make-mie-audio.mjs) ----------
const TEXTS = [
  "Kalau cuma boleh makan satu mie seumur hidup, goreng atau kuah? Pilih salah, pertemanan bisa bubar!",
  "Di warung mana pun, pertanyaannya sama: goreng atau kuah? Dan jawabanmu membongkar kamu orang seperti apa.",
  "Tim goreng bilang: bumbunya nendang! Kecap manis, telur, sayur, meresap sampai dalam. Wangi wajannya nggak ada tandingan. Praktis, bisa dibungkus!",
  "Tim kuah nggak terima: mie itu harus berkuah! Hujan-hujan, badan lagi nggak enak, semangkuk mie panas bikin hidup lebih baik. Kuahnya diseruput sampai habis!",
  "Jadi, siapa yang menang? Tergantung cuaca dan isi dompet! Lagi hujan, kuah menang. Lagi buru-buru, goreng menang. Dua-duanya juara!",
  "Giliran kamu. Komentar A kalau goreng, B kalau kuah. Tag temanmu yang beda tim. Follow ya, besok kita bahas mie pakai telur atau tanpa telur!",
];
const DURS = [6.31, 6.7, 11.21, 9.7, 11.28, 9.91]; // measured voice durations (s)
const GAP = 0.3;
const SEGS = TEXTS.map((text, i) => ({
  text,
  dur: DURS[i],
  start: 0.2 + DURS.slice(0, i).reduce((a, b) => a + b + GAP, 0),
}));
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
const CUT = [0, ...SEGS.slice(1).map((s) => Math.round((s.start - 0.1) * 30)), MIE_TOTAL];

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

// ---------- face ----------
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
          <path d="M-42 112 Q0 150 42 112Z" fill={OUT} stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
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

// ---------- noodle bowl ----------
type Kind = "goreng" | "kuah";
type BowlP = {
  x: number;
  y: number;
  s?: number;
  f: number;
  kind: Kind;
  expr?: Expr;
  empty?: number;
  wobble?: number;
  look?: [number, number];
  steam?: boolean;
  chop?: number; // start frame of chopstick-slurp cycle, -1 = off
  egg?: boolean;
};

const chopPose = (p: number) => {
  let ty: number;
  if (p < 0.3) ty = lerp(-230, -8, ease(p / 0.3));
  else if (p < 0.4) ty = -8;
  else if (p < 0.8) ty = lerp(-8, -230, ease((p - 0.4) / 0.4));
  else ty = -230;
  const holding = p >= 0.4 && p < 0.97;
  const full = Math.max(0, -4 - ty);
  const len = holding ? (p >= 0.85 ? (1 - (p - 0.85) / 0.12) * full : full) : 0;
  return { ty, len };
};

const Bowl: React.FC<BowlP> = ({ x, y, s = 1, f, kind, expr = "smug", empty = 0, wobble = 0, look = [0, 0], steam = true, chop = -1, egg = true }) => {
  const accent = kind === "goreng" ? GOR : KUA;
  const bob = Math.sin(f / 12) * 4 + (wobble ? Math.sin(f * 1.7) * wobble : 0);
  const wob = wobble ? Math.sin(f * 2) * 3 : 0;
  let chopsticks: React.ReactNode = null;
  if (chop >= 0 && f >= chop - 6) {
    const p = f < chop ? 0 : ((((f - chop) % 54) + 54) % 54) / 54;
    const { ty, len } = chopPose(p);
    const tx = -30;
    chopsticks = (
      <g>
        {len > 2 &&
          [0, 1, 2, 3, 4].map((i) => {
            const sx = tx + (i - 2) * 7;
            const d = `M${sx} ${ty} Q${sx + Math.sin(f / 4 + i) * 10} ${ty + len / 2} ${sx + (i - 2) * 4} ${ty + len}`;
            return (
              <g key={i}>
                <path d={d} fill="none" stroke={OUT} strokeWidth={12} strokeLinecap="round" />
                <path d={d} fill="none" stroke="#ffe9a8" strokeWidth={7} strokeLinecap="round" />
              </g>
            );
          })}
        {[[-8, 190], [8, 215]].map(([ox, ex], i) => (
          <g key={i}>
            <path d={`M${tx + ox} ${ty} L${tx + ex} ${ty - 140}`} stroke={OUT} strokeWidth={20} strokeLinecap="round" />
            <path d={`M${tx + ox} ${ty} L${tx + ex} ${ty - 140}`} stroke="#d9a05b" strokeWidth={11} strokeLinecap="round" />
          </g>
        ))}
      </g>
    );
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
            opacity={(0.45 + 0.2 * Math.sin(f / 9 + i)) * (1 - empty * 0.8)}
          />
        ))}
      <path d="M-196 0 Q-196 172 0 178 Q196 172 196 0Z" fill="#fdf6e3" stroke={OUT} strokeWidth={9} strokeLinejoin="round" />
      <path d="M-188 34 Q0 84 188 34" fill="none" stroke={accent} strokeWidth={14} strokeLinecap="round" />
      <ellipse cx={0} cy={184} rx={84} ry={16} fill="#fdf6e3" stroke={OUT} strokeWidth={8} />
      <ellipse cx={0} cy={0} rx={196} ry={56} fill="#fdf6e3" stroke={OUT} strokeWidth={9} />
      {kind === "goreng" ? (
        <g transform={`translate(${wob} 0)`}>
          <ellipse cx={0} cy={2} rx={172} ry={42} fill="#a8641a" stroke={OUT} strokeWidth={5} />
          <path d="M-150 -2 Q-125 -80 -45 -72 Q8 -108 82 -74 Q152 -70 150 -2 Q0 38 -150 -2Z" fill="#d98a2b" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
          {[[-110, -30], [-70, -50], [-20, -62], [30, -54], [80, -42], [-95, -8], [-30, -18], [40, -14], [100, -12]].map(([sx, sy], i) => (
            <path key={i} d={`M${sx} ${sy} q18 -12 36 0 t36 0`} fill="none" stroke="#8f5412" strokeWidth={6} strokeLinecap="round" />
          ))}
          {egg && (
            <g transform="translate(-40 -84)">
              <path d="M-52 6 Q-60 -22 -28 -30 Q2 -44 30 -28 Q62 -20 52 8 Q10 26 -52 6Z" fill="#fff" stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
              <circle cx={-2} cy={-8} r={17} fill="#ffb703" stroke={OUT} strokeWidth={4} />
              <circle cx={-8} cy={-14} r={4} fill="#fff" />
            </g>
          )}
          {[[72, -64], [98, -44], [-120, -56]].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r={9 - i} fill="#e63946" stroke={OUT} strokeWidth={3} />
          ))}
          {[[24, -78, 20], [-92, -56, -15], [122, -30, 40], [56, -26, -30]].map(([lx, ly, r], i) => (
            <rect key={i} x={lx - 9} y={ly - 3} width={18} height={6} rx={3} fill="#3bb273" transform={`rotate(${r} ${lx} ${ly})`} />
          ))}
        </g>
      ) : (
        <g>
          <ellipse cx={0} cy={2} rx={172} ry={42} fill={mixCol([230, 168, 74], [240, 222, 176], empty)} stroke={OUT} strokeWidth={5} />
          {[0, 1].map((i) => {
            const u = ((f / 40 + i * 0.5) % 1);
            return <ellipse key={i} cx={0} cy={2} rx={30 + u * 120} ry={6 + u * 28} fill="none" stroke="#f3c978" strokeWidth={4} opacity={(1 - u) * 0.7} />;
          })}
          <g opacity={1 - empty}>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const sy = -10 + i * 8;
              const x0 = -86 + (i % 2) * 24;
              const d = `M${x0} ${sy} q20 -16 40 0 t40 0 t40 0 t20 0`;
              return (
                <g key={i}>
                  <path d={d} fill="none" stroke={OUT} strokeWidth={12} strokeLinecap="round" />
                  <path d={d} fill="none" stroke="#ffe9a8" strokeWidth={7} strokeLinecap="round" />
                </g>
              );
            })}
            {egg && (
              <g>
                <ellipse cx={-100} cy={-8} rx={38} ry={22} fill="#fff" stroke={OUT} strokeWidth={4} />
                <ellipse cx={-100} cy={-8} rx={15} ry={10} fill="#ffb703" />
              </g>
            )}
            {[[40, -20], [70, -8], [-30, 20], [100, 14], [10, 22], [-60, -22]].map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r={5} fill="#3bb273" stroke={OUT} strokeWidth={2} />
            ))}
            <circle cx={120} cy={-4} r={8} fill="#e63946" stroke={OUT} strokeWidth={3} />
          </g>
        </g>
      )}
      {chopsticks}
      <Face expr={expr} f={f} look={look} />
      {expr === "angry" && (
        <g stroke={RED} strokeWidth={9} strokeLinecap="round">
          <path d="M104 40 L130 28 M104 28 L130 40" transform={`rotate(${Math.sin(f / 3) * 8} 117 34)`} />
        </g>
      )}
    </g>
  );
};

// ---------- wok ----------
const Wok: React.FC<{ x: number; y: number; s: number; f: number; kecap: number; pour: boolean; egg: number; veg: number; flare: number }> = ({ x, y, s, f, kecap, pour, egg, veg, flare }) => {
  const noodle = mixCol([243, 193, 79], [154, 90, 26], kecap);
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-250} y={205} width={500} height={70} rx={14} fill="#4a4a55" stroke={OUT} strokeWidth={8} />
      {[-160, -80, 0, 80, 160].map((fx, i) => {
        const h = (30 + flare * 80) * (0.75 + 0.25 * Math.sin(f / 3 + i * 1.7));
        return (
          <g key={i}>
            <path d={`M${fx - 34} 205 Q${fx - 44} ${160 - h} ${fx} ${110 - h} Q${fx + 44} ${160 - h} ${fx + 34} 205Z`} fill="#ff6b1a" stroke={OUT} strokeWidth={5} strokeLinejoin="round" />
            <path d={`M${fx - 16} 205 Q${fx - 20} ${175 - h * 0.6} ${fx} ${150 - h * 0.6} Q${fx + 20} ${175 - h * 0.6} ${fx + 16} 205Z`} fill="#ffd93d" />
          </g>
        );
      })}
      {/* handle */}
      <path d="M225 -6 L430 -64" stroke={OUT} strokeWidth={36} strokeLinecap="round" />
      <path d="M225 -6 L430 -64" stroke="#6b4a2b" strokeWidth={22} strokeLinecap="round" />
      <path d="M-240 0 Q-240 150 0 165 Q240 150 240 0Z" fill="#3b3b44" stroke={OUT} strokeWidth={9} strokeLinejoin="round" />
      <path d="M-200 60 Q-150 120 -60 138" fill="none" stroke="#fff" strokeWidth={10} strokeLinecap="round" opacity={0.15} />
      <ellipse cx={0} cy={0} rx={240} ry={46} fill="#55555f" stroke={OUT} strokeWidth={9} />
      <ellipse cx={0} cy={4} rx={216} ry={36} fill="#1f1f26" />
      {/* noodle toss */}
      {Array.from({ length: 11 }).map((_, i) => {
        const t = (f / 26 + i * 0.09) % 1;
        const bx = -125 + i * 25;
        const py = -250 * Math.sin(Math.PI * t) - 8;
        const rot = t * 360 * (i % 2 ? 1 : -1);
        return (
          <g key={i} transform={`translate(${bx + (t - 0.5) * 50} ${py}) rotate(${rot})`}>
            <path d="M-24 0 q12 -13 24 0 t24 0" fill="none" stroke={OUT} strokeWidth={13} strokeLinecap="round" />
            <path d="M-24 0 q12 -13 24 0 t24 0" fill="none" stroke={noodle} strokeWidth={8} strokeLinecap="round" />
          </g>
        );
      })}
      {veg > 0 &&
        [0, 1, 2, 3, 4, 5].map((i) => {
          const t = (f / 30 + i * 0.16) % 1;
          return <rect key={i} x={-110 + i * 42 + (t - 0.5) * 30} y={-210 * Math.sin(Math.PI * t) - 14} width={26} height={10} rx={5} fill="#3bb273" stroke={OUT} strokeWidth={3} transform={`rotate(${t * 300} ${-110 + i * 42} ${-210 * Math.sin(Math.PI * t)})`} opacity={veg} />;
        })}
      {egg > 0 &&
        (egg < 1 ? (
          <g transform={`translate(${lerp(-300, 0, ease(egg))} ${lerp(-420, -30, ease(egg)) - Math.sin(Math.PI * egg) * 120}) rotate(${egg * 400})`}>
            <ellipse rx={30} ry={38} fill="#fff" stroke={OUT} strokeWidth={5} />
            <circle r={13} fill="#ffb703" stroke={OUT} strokeWidth={3} />
          </g>
        ) : (
          [[-60, -26], [0, -34], [64, -22]].map(([ex, ey], i) => (
            <ellipse key={i} cx={ex} cy={ey + Math.sin(f / 5 + i) * 5} rx={30} ry={14} fill="#ffd54a" stroke={OUT} strokeWidth={4} />
          ))
        ))}
      {pour && (
        <g>
          <rect x={-6} y={-460} width={12} height={430} rx={6} fill="#4a2410" stroke={OUT} strokeWidth={3} />
          <path d="M-60 -470 L60 -470 L40 -540 L-40 -540Z" fill="#2d1a0e" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
        </g>
      )}
      {[-70, 10, 90].map((sx, i) => (
        <path key={i} d={`M${sx + Math.sin(f / 10 + i) * 10} -300 q14 -26 0 -52 t0 -52`} fill="none" stroke="#fff" strokeWidth={9} strokeLinecap="round" opacity={0.3 + flare * 0.3} />
      ))}
    </g>
  );
};

// ---------- scene props ----------
const Awning: React.FC<{ f: number }> = ({ f }) => (
  <g>
    {Array.from({ length: 9 }).map((_, i) => (
      <path key={i} d={`M${i * 120} 0 H${(i + 1) * 120} V150 Q${i * 120 + 60} ${215 + Math.sin(f / 12 + i) * 6} ${i * 120} 150Z`} fill={i % 2 ? "#fff" : RED} stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
    ))}
  </g>
);

const RainWindow: React.FC<{ f: number; show: number }> = ({ f, show }) => {
  if (show <= 0) return null;
  return (
    <g opacity={show}>
      <clipPath id="rwclip">
        <rect x={110} y={640} width={860} height={480} rx={34} />
      </clipPath>
      <rect x={110} y={640} width={860} height={480} rx={34} fill="#6f93c4" stroke={OUT} strokeWidth={8} />
      <g clipPath="url(#rwclip)">
        <rect x={110} y={640} width={860} height={140} fill="#4d6d99" />
        {Array.from({ length: 36 }).map((_, i) => {
          const x1 = 110 + ((rnd(i) * 1000 + f * 5) % 1000) - 60;
          const y1 = 640 + ((rnd(i + 3) * 700 + f * 20) % 700) - 60;
          return <path key={i} d={`M${x1} ${y1} L${x1 - 14} ${y1 + 48}`} stroke="#fff" strokeWidth={4} strokeLinecap="round" opacity={0.7} />;
        })}
        <g fill="#8a9fba" stroke={OUT} strokeWidth={5}>
          <ellipse cx={300} cy={690} rx={110} ry={44} />
          <ellipse cx={400} cy={680} rx={90} ry={50} />
          <ellipse cx={700} cy={700} rx={120} ry={42} />
          <ellipse cx={800} cy={690} rx={80} ry={40} />
        </g>
      </g>
      <path d="M540 640 V1120 M110 880 H970" stroke={OUT} strokeWidth={8} />
      <rect x={110} y={640} width={860} height={480} rx={34} fill="none" stroke={OUT} strokeWidth={8} />
    </g>
  );
};

const Cloud: React.FC<{ x: number; y: number; s: number; f: number }> = ({ x, y, s, f }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 1, 2, 3, 4].map((i) => {
      const t = (f / 14 + i * 0.2) % 1;
      return <path key={i} d={`M${-70 + i * 35} ${30 + t * 90} l-8 24`} stroke={KUA} strokeWidth={8} strokeLinecap="round" opacity={1 - t} />;
    })}
    <path d="M-110 30 Q-130 -10 -85 -15 Q-80 -60 -30 -50 Q10 -85 55 -45 Q110 -50 115 -5 Q145 15 115 30 Z" fill="#cfd8e6" stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
  </g>
);

const Clock: React.FC<{ x: number; y: number; s: number; f: number }> = ({ x, y, s, f }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M${-110 - ((f * 6 + i * 20) % 50)} ${-30 + i * 30} h-40`} stroke={OUT} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
    ))}
    <circle r={70} fill="#fff" stroke={OUT} strokeWidth={8} />
    <path d={`M0 0 L0 -48`} stroke={OUT} strokeWidth={8} strokeLinecap="round" transform={`rotate(${f * 14})`} />
    <path d={`M0 0 L32 0`} stroke={RED} strokeWidth={8} strokeLinecap="round" transform={`rotate(${f * 1.2})`} />
    <circle r={7} fill={OUT} />
  </g>
);

const Trophy: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M-62 -70 Q-110 -70 -96 -20 Q-86 14 -50 14" fill="none" stroke={OUT} strokeWidth={22} strokeLinecap="round" />
    <path d="M62 -70 Q110 -70 96 -20 Q86 14 50 14" fill="none" stroke={OUT} strokeWidth={22} strokeLinecap="round" />
    <path d="M-62 -70 Q-110 -70 -96 -20 Q-86 14 -50 14" fill="none" stroke="#ffc928" strokeWidth={10} strokeLinecap="round" />
    <path d="M62 -70 Q110 -70 96 -20 Q86 14 50 14" fill="none" stroke="#ffc928" strokeWidth={10} strokeLinecap="round" />
    <path d="M-64 -90 H64 Q64 30 0 46 Q-64 30 -64 -90Z" fill="#ffc928" stroke={OUT} strokeWidth={8} strokeLinejoin="round" />
    <rect x={-14} y={44} width={28} height={40} fill="#ffc928" stroke={OUT} strokeWidth={7} />
    <rect x={-50} y={80} width={100} height={26} rx={8} fill="#b87a14" stroke={OUT} strokeWidth={7} />
    <Spark x={0} y={-30} s={0.7} />
  </g>
);

// ---------- background ----------
const Background: React.FC<{ f: number; tint: number; rain: number }> = ({ f, tint, rain }) => (
  <g>
    <defs>
      <linearGradient id="bgM" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor={BG1} />
        <stop offset="1" stopColor={BG2} />
      </linearGradient>
    </defs>
    <rect width={1080} height={1920} fill="url(#bgM)" />
    <g transform={`translate(540 900) rotate(${f * 0.2})`} opacity={0.14} fill="#fff">
      {Array.from({ length: 14 }).map((_, i) => {
        const a0 = (i / 14) * Math.PI * 2;
        const a1 = a0 + Math.PI / 14;
        return <path key={i} d={`M0 0 L${Math.cos(a0) * 1800} ${Math.sin(a0) * 1800} L${Math.cos(a1) * 1800} ${Math.sin(a1) * 1800}Z`} />;
      })}
    </g>
    <rect width={1080} height={1920} fill={RED} opacity={tint * 0.2} />
    <rect width={1080} height={1920} fill="#2c4a7a" opacity={rain * 0.4} />
    {Array.from({ length: 12 }).map((_, i) => {
      const by = 1700 - ((f * (0.8 + rnd(i) * 1.4) + rnd(i + 9) * 1700) % 1700);
      return <circle key={i} cx={rnd(i + 3) * 1080 + Math.sin(f / 25 + i) * 18} cy={by} r={5 + rnd(i + 5) * 10} fill="#fff" opacity={0.35} />;
    })}
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

// ---------- main ----------
export const Mie: React.FC = () => {
  const f = useCurrentFrame();
  let sc = 1;
  for (let i = 1; i < CUT.length - 1; i++) if (f >= CUT[i]) sc = i + 1;
  const lf = f - CUT[sc - 1];
  const BY = 1300;

  let hero: React.ReactNode = null;
  let overlay: React.ReactNode = null;
  let behind: React.ReactNode = null;
  let tint = 0;
  let rain = 0;
  const punches: number[] = [...CUT];

  if (sc === 1) {
    const fG = F(0, "goreng");
    const fK = F(0, "kuah");
    const fB = F(0, "bubar");
    punches.push(fG, fK, fB);
    const crack = f >= fB;
    tint = crack ? 0.6 + 0.4 * Math.sin(f / 3) : 0;
    hero = (
      <g>
        <Bowl x={265} y={BY} s={0.95} f={f} kind="goreng" expr={crack ? "angry" : "smug"} look={[1, 0]} wobble={crack ? 3 : 0} />
        <Bowl x={815} y={BY} s={0.95} f={f + 17} kind="kuah" expr={crack ? "angry" : "smug"} look={[-1, 0]} wobble={crack ? 3 : 0} />
      </g>
    );
    const zig = "M540 760 L500 900 L590 1040 L490 1180 L590 1320 L520 1560";
    overlay = (
      <g>
        <T f={f} t0={6} x={540} y={310} size={100} text="SATU MIE" fill={YEL} rot={-3} />
        <T f={f} t0={14} x={540} y={450} size={100} text="SEUMUR HIDUP?" fill="#fff" rot={2} />
        <Tag f={f} t0={fG} x={265} y={720} size={64} text="GORENG" box={GOR} ink="#fff" rot={-3} />
        <Tag f={f} t0={fK} x={815} y={720} size={64} text="KUAH" box={KUA} ink="#fff" rot={3} />
        {crack && (
          <g>
            <path d={zig} fill="none" stroke={OUT} strokeWidth={24} strokeLinejoin="round" strokeLinecap="round" opacity={prog(f, fB, fB + 6)} />
            <path d={zig} fill="none" stroke={YEL} strokeWidth={11} strokeLinejoin="round" strokeLinecap="round" opacity={prog(f, fB, fB + 6)} />
            <T f={f} t0={fB} x={540} y={980} size={130} text="BUBAR?!" fill={RED} rot={-6} />
          </g>
        )}
      </g>
    );
  } else if (sc === 2) {
    const fSp = F(1, "goreng");
    const fWar = F(1, "warung");
    const fMem = F(1, "membongkar");
    punches.push(fWar, fSp, fMem);
    const split = f >= fSp;
    const k = prog(f, fSp, fSp + 10);
    hero = (
      <g>
        <Bowl x={split ? 270 + (1 - k) * -300 : 270} y={BY + 30} s={0.78} f={f} kind="goreng" expr={split ? "angry" : "smug"} look={[1, 0]} />
        <Bowl x={split ? 810 + (1 - k) * 300 : 810} y={BY + 30} s={0.78} f={f + 17} kind="kuah" expr={split ? "angry" : "smug"} look={[-1, 0]} />
      </g>
    );
    const zig = "M540 180 L500 420 L590 600 L490 800 L590 1000 L500 1200 L560 1560";
    overlay = (
      <g>
        <Awning f={f} />
        {!split && <Tag f={f} t0={fWar - 2} x={540} y={420} size={58} text="DI WARUNG MANA PUN" box="#fff" />}
        {!split && (
          <g>
            <T f={f} t0={fWar + 10} x={270} y={1040} size={150} text="?" fill={YEL} rot={-8} />
            <T f={f} t0={fWar + 16} x={810} y={1040} size={150} text="?" fill={YEL} rot={8} />
          </g>
        )}
        {split && (
          <g>
            <path d={zig} fill="none" stroke={OUT} strokeWidth={26} strokeLinejoin="round" strokeLinecap="round" opacity={prog(f, fSp, fSp + 6)} />
            <path d={zig} fill="none" stroke={YEL} strokeWidth={12} strokeLinejoin="round" strokeLinecap="round" opacity={prog(f, fSp, fSp + 6)} />
            <Tag f={f} t0={fSp + 6} x={270} y={420} size={52} text="TIM GORENG" box={GOR} ink="#fff" rot={-3} />
            <Tag f={f} t0={fSp + 10} x={810} y={420} size={52} text="TIM KUAH" box={KUA} ink="#fff" rot={3} />
            <T f={f} t0={fSp + 4} x={540} y={800} size={150} text="VS" fill={YEL} rot={-6} dur={8} />
          </g>
        )}
        <Tag f={f} t0={fMem} x={540} y={980} size={54} text="KETAHUAN KARAKTERMU!" box={YEL} rot={-2} />
      </g>
    );
  } else if (sc === 3) {
    const fKc = F(2, "kecap");
    const fTe = F(2, "telur");
    const fSy = F(2, "sayur");
    const fWj = F(2, "wajannya");
    const fPr = F(2, "praktis");
    const fDb = F(2, "dibungkus");
    punches.push(F(2, "nendang"), fKc, fTe, fSy, fWj, fPr, fDb);
    if (f < fPr) {
      hero = (
        <Wok
          x={480}
          y={1250}
          s={1.05}
          f={f}
          kecap={prog(f, fKc, fKc + 40)}
          pour={f >= fKc && f < fKc + 30}
          egg={clamp((f - fTe) / 18, 0, 1)}
          veg={clamp((f - fSy) / 12, 0, 1)}
          flare={f >= fWj ? 1 : 0.2}
        />
      );
    } else {
      hero = <Bowl x={540} y={BY} s={1.4} f={f} kind="goreng" expr="happy" wobble={f < fPr + 20 ? 2 : 0} />;
    }
    overlay = (
      <g>
        <Tag f={f} t0={CUT[2] + 6} x={540} y={340} size={80} text="TIM GORENG" box={GOR} ink="#fff" rot={-2} />
        <T f={f} t0={F(2, "nendang")} x={540} y={520} size={84} text="BUMBU NENDANG!" />
        {slot(f, [
          [fKc, <T key="1" f={f} t0={fKc} x={540} y={700} size={96} text="KECAP MANIS" fill={YEL} rot={-2} />],
          [fTe, <T key="2" f={f} t0={fTe} x={540} y={700} size={100} text="TELUR" fill={YEL} rot={2} />],
          [fSy, <T key="3" f={f} t0={fSy} x={540} y={700} size={100} text="SAYUR" fill={YEL} rot={-2} />],
          [fWj, <T key="4" f={f} t0={fWj} x={540} y={700} size={96} text="WANGI WAJAN!" fill="#fff" rot={2} />],
        ])}
        {slot(f, [
          [fPr, <Tag key="a" f={f} t0={fPr} x={540} y={900} size={80} text="PRAKTIS!" box={GOR} ink="#fff" rot={2} />],
          [fDb, <Tag key="b" f={f} t0={fDb} x={540} y={900} size={68} text="BISA DIBUNGKUS" box={YEL} rot={-2} />],
        ])}
        {f >= fWj && f < fPr && <T f={f} t0={fWj + 4} x={800} y={1000} size={70} text="WUSH!" fill={YEL} rot={12} />}
      </g>
    );
  } else if (sc === 4) {
    const fTe = F(3, "terima");
    const fBk = F(3, "berkuah");
    const fHu = F(3, "hujan-hujan");
    const fSm = F(3, "semangkuk");
    const fDs = F(3, "diseruput");
    const fHb = F(3, "habis");
    punches.push(fTe, fBk, fHu, fSm, fDs, fHb);
    rain = prog(f, fHu - 10, fHu + 15) * (f < fHb ? 1 : 1 - prog(f, fHb, fHb + 20));
    const empty = prog(f, fHb - 6, fHb + 24);
    const expr: Expr = f >= fHb ? "happy" : f >= fSm ? "happy" : f >= fTe ? "angry" : "smug";
    behind = <RainWindow f={f} show={rain} />;
    hero = <Bowl x={540} y={BY} s={1.4} f={f} kind="kuah" expr={f >= fBk && f < fHu ? "smug" : expr} empty={empty} chop={f >= fDs && f < fHb ? fDs : -1} />;
    overlay = (
      <g>
        <Tag f={f} t0={CUT[3] + 6} x={540} y={340} size={80} text="TIM KUAH" box={KUA} ink="#fff" rot={2} />
        {slot(f, [
          [fTe, <T key="1" f={f} t0={fTe} x={540} y={520} size={76} text="NGGAK TERIMA!" fill={RED} rot={-3} />],
          [fBk, <T key="2" f={f} t0={fBk} x={540} y={520} size={90} text="HARUS BERKUAH!" fill="#fff" rot={2} />],
          [fHu, <T key="3" f={f} t0={fHu} x={540} y={520} size={96} text="HUJAN-HUJAN" fill={YEL} rot={-2} />],
          [fSm, <T key="4" f={f} t0={fSm} x={540} y={520} size={84} text="MIE PANAS!" fill="#fff" rot={2} />],
          [fDs, <T key="5" f={f} t0={fDs} x={540} y={520} size={100} text="SRUUUP!" fill={YEL} rot={-3} />],
          [fHb, <T key="6" f={f} t0={fHb} x={540} y={520} size={90} text="SAMPAI HABIS!" fill="#fff" rot={2} />],
        ])}
        {f >= fHb &&
          [[240, 1130, 1], [850, 1110, 1.2], [210, 1320, 0.8], [880, 1310, 0.9]].map(([sx, sy, ss], i) => (
            <Spark key={i} x={sx} y={sy + Math.sin(f / 8 + i) * 8} s={popS(f, fHb + i * 3) * ss} rot={f * 3} />
          ))}
      </g>
    );
  } else if (sc === 5) {
    const fTg = F(4, "tergantung");
    const fCu = F(4, "cuaca");
    const fDo = F(4, "dompet");
    const fHu = F(4, "hujan");
    const fBu = F(4, "buru-buru");
    const fDu = F(4, "dua-duanya");
    punches.push(fTg, fCu, fDo, fHu, fBu, fDu);
    const happy = f >= fDu;
    hero = (
      <g>
        <Bowl x={270} y={BY + 30} s={0.82} f={f} kind="goreng" expr={happy ? "happy" : "smug"} look={[1, 0]} />
        <Bowl x={810} y={BY + 30} s={0.82} f={f + 17} kind="kuah" expr={happy ? "happy" : "smug"} look={[-1, 0]} />
      </g>
    );
    overlay = (
      <g>
        <T f={f} t0={fTg} x={540} y={340} size={92} text="TERGANTUNG..." fill={YEL} rot={-3} />
        {f < fDu &&
          slot(f, [
            [fCu, <Tag key="1" f={f} t0={fCu} x={540} y={540} size={84} text="CUACA" box={KUA} ink="#fff" rot={-2} />],
            [fDo, <Tag key="2" f={f} t0={fDo} x={540} y={540} size={84} text="ISI DOMPET" box={YEL} rot={2} />],
          ])}
        {f >= fHu && f < fDu && (
          <g transform={`scale(${popS(f, fHu)})`} style={{ transformOrigin: "810px 1010px" }}>
            <Cloud x={810} y={1010} s={1} f={f} />
          </g>
        )}
        {f >= fHu && f < fDu && <T f={f} t0={fHu} x={540} y={720} size={76} text="HUJAN = KUAH" fill="#fff" rot={-2} />}
        {f >= fBu && f < fDu && (
          <g transform={`scale(${popS(f, fBu)})`} style={{ transformOrigin: "270px 1040px" }}>
            <Clock x={270} y={1040} s={1} f={f} />
          </g>
        )}
        {f >= fBu && f < fDu && <T f={f} t0={fBu} x={540} y={880} size={66} text="BURU-BURU = GORENG" fill={YEL} rot={2} />}
        {f >= fDu && (
          <g>
            <T f={f} t0={fDu} x={540} y={540} size={76} text="DUA-DUANYA JUARA!" fill={YEL} rot={-2} />
            <g transform={`scale(${popS(f, fDu + 4)})`} style={{ transformOrigin: "540px 1170px" }}>
              <Trophy x={540} y={1170} s={1.2} />
            </g>
            {Array.from({ length: 8 }).map((_, i) => {
              const u = clamp((f - fDu) / 45, 0, 1);
              const ang = (i / 8) * Math.PI * 2;
              return <Heart key={i} x={540 + Math.cos(ang) * (80 + 280 * ease(u))} y={1100 + Math.sin(ang) * (50 + 140 * ease(u)) - u * 50} s={0.8 * (1 - u * 0.5)} rot={(rnd(i) - 0.5) * 50} />;
            })}
          </g>
        )}
      </g>
    );
  } else {
    const fG = F(5, "giliran");
    const fA = F(5, "a");
    const fB = F(5, "b");
    const fTg = F(5, "tag");
    const fFo = F(5, "follow");
    const fTe = F(5, "telur");
    const fClick = F(5, "telur", 1) + 14;
    punches.push(fG, fA, fB, fTg, fFo, fClick);
    const click = f >= fClick;
    const press = f >= fClick - 3 && f < fClick + 6 ? 0.92 : 1;
    hero = (
      <g>
        <Bowl x={280} y={1400} s={0.75} f={f} kind="goreng" expr="happy" />
        <Bowl x={800} y={1400} s={0.75} f={f + 17} kind="kuah" expr="happy" />
      </g>
    );
    const btn = (cx: number, color: string, letter: string, l1: string, l2: string, t0: number, ph: number) => {
      const s = popS(f, t0) * (1 + 0.04 * Math.sin(f / 6 + ph));
      if (s <= 0) return null;
      const tx = { fontFamily: FONT, fontWeight: 900, fill: "#fff", stroke: OUT, paintOrder: "stroke", strokeLinejoin: "round" as const };
      return (
        <g transform={`translate(${cx} 560) scale(${s})`}>
          <rect x={-220 + 8} y={-100 + 10} width={440} height={200} rx={40} fill={OUT} />
          <rect x={-220} y={-100} width={440} height={200} rx={40} fill={color} stroke={OUT} strokeWidth={7} />
          <text x={-130} y={44} textAnchor="middle" fontSize={140} strokeWidth={14} {...tx}>
            {letter}
          </text>
          <text x={70} y={-6} textAnchor="middle" fontSize={50} strokeWidth={8} {...tx}>
            {l1}
          </text>
          <text x={70} y={52} textAnchor="middle" fontSize={50} strokeWidth={8} {...tx}>
            {l2}
          </text>
        </g>
      );
    };
    const bubbles = [
      { x: 150, y: 860, l: "A", c: GOR, d: 0 },
      { x: 930, y: 900, l: "B", c: KUA, d: 6 },
      { x: 330, y: 1010, l: "B", c: KUA, d: 12 },
      { x: 760, y: 1020, l: "A", c: GOR, d: 18 },
      { x: 540, y: 930, l: "A", c: GOR, d: 24 },
    ];
    const bub = 1 - prog(f, fFo - 6, fFo);
    const cx = lerp(820, 640, prog(f, fClick - 24, fClick - 6));
    const cy = lerp(1100, 880, prog(f, fClick - 24, fClick - 6));
    overlay = (
      <g>
        <T f={f} t0={fG} x={540} y={340} size={100} text="GILIRAN KAMU!" fill={YEL} rot={-3} />
        {btn(280, GOR, "A", "TIM", "GORENG", fA, 0)}
        {btn(800, KUA, "B", "TIM", "KUAH", fB, 2)}
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
            <rect x={-300} y={-80} width={600} height={160} rx={80} fill={click ? KUA : YEL} stroke={OUT} strokeWidth={7} />
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
        <T f={f} t0={fTe} x={540} y={1060} size={44} text="BESOK: TELUR VS TANPA TELUR" fill="#fff" />
        {click &&
          Array.from({ length: 9 }).map((_, i) => {
            const u = clamp((f - fClick) / 40, 0, 1);
            const ang = (i / 9) * Math.PI * 2 + rnd(i) * 0.5;
            const dist = 60 + rnd(i + 3) * 200;
            return <Heart key={i} x={540 + Math.cos(ang) * (360 + dist * ease(u))} y={880 + Math.sin(ang) * (130 + dist * ease(u) * 0.9) - u * 60} s={0.7 * (1 - u * 0.6)} rot={(rnd(i + 5) - 0.5) * 50} />;
          })}
      </g>
    );
  }

  let punch = 0;
  for (const p of punches) if (f >= p && f < p + 14) punch = Math.max(punch, 0.07 * Math.exp(-(f - p) / 4));
  const zoom = 1 + punch + (lf < 8 ? 0.1 * (1 - prog(lf, 0, 8)) : 0);
  const flash = CUT.slice(1, CUT.length - 1).reduce((m, c) => (f >= c && f < c + 6 ? Math.max(m, 0.55 * (1 - (f - c) / 6)) : m), 0);

  return (
    <AbsoluteFill style={{ backgroundColor: BG1 }}>
      <Audio src={staticFile("mie-mix.wav")} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <g transform={`translate(540 960) scale(${zoom}) translate(-540 -960)`}>
          <Background f={f} tint={tint} rain={rain} />
          {behind}
          {hero}
          {overlay}
        </g>
        <Subtitle f={f} />
        <rect width={1080} height={1920} fill="#fff" opacity={flash} />
      </svg>
    </AbsoluteFill>
  );
};
