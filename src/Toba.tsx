import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from "remotion";

export const TOTAL = 1570;
const OUT = "#3b2342";
const SKIN = "#f2b27a";

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
const mix = (c1: number[], c2: number[], t: number) =>
  `rgb(${Math.round(lerp(c1[0], c2[0], t))},${Math.round(lerp(c1[1], c2[1], t))},${Math.round(lerp(c1[2], c2[2], t))})`;

// shot boundaries (frames) from the voiceover timing
const CUT = [0, 153, 332, 456, 639, 770, 927, 1068, 1121, 1278, 1359, TOTAL];

// ---------- camera ----------
type CamP = {
  f: number;
  dur: number;
  z0?: number;
  z1?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
  roll?: number;
  shake?: number;
  children: React.ReactNode;
};
const Cam: React.FC<CamP> = ({ f, dur, z0 = 1, z1 = 1.1, x0 = 0, x1 = 0, y0 = 0, y1 = 0, roll = 0, shake = 0, children }) => {
  const t = ease(clamp(f / dur, 0, 1));
  const z = lerp(z0, z1, t) + Math.sin(f / 37) * 0.004;
  const sx = shake ? (rnd(f * 3.1) - 0.5) * shake : 0;
  const sy = shake ? (rnd(f * 7.7) - 0.5) * shake : 0;
  const x = lerp(x0, x1, t) + sx + Math.sin(f / 53) * 4;
  const y = lerp(y0, y1, t) + sy + Math.cos(f / 61) * 4;
  return (
    <g transform={`translate(540 960) rotate(${roll + Math.sin(f / 71) * 0.4}) scale(${z}) translate(${-540 + x} ${-960 + y})`}>{children}</g>
  );
};

// ---------- small pieces ----------
const Sparkle: React.FC<{ x: number; y: number; s: number; rot?: number; color?: string }> = ({ x, y, s, rot = 0, color = "#fff3a0" }) => (
  <path
    transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}
    d="M0 -30 Q4 -4 30 0 Q4 4 0 30 Q-4 4 -30 0 Q-4 -4 0 -30Z"
    fill={color}
    stroke={OUT}
    strokeWidth={2.5 / Math.max(s, 0.3)}
  />
);

const Cloud: React.FC<{ x: number; y: number; s: number; color?: string }> = ({ x, y, s, color = "#ffffff" }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill={color} stroke={OUT} strokeWidth={5 / s}>
    <path d="M-110 30 Q-130 -10 -85 -15 Q-80 -60 -30 -50 Q10 -85 55 -45 Q110 -50 115 -5 Q145 15 115 30 Z" />
  </g>
);

const Bird: React.FC<{ x: number; y: number; f: number; s?: number }> = ({ x, y, f, s = 1 }) => {
  const w = Math.sin(f / 3) * 12;
  return (
    <path
      transform={`translate(${x} ${y}) scale(${s})`}
      d={`M-26 ${w} Q-12 ${-14 - w} 0 0 Q12 ${-14 - w} 26 ${w}`}
      fill="none"
      stroke={OUT}
      strokeWidth={5}
      strokeLinecap="round"
    />
  );
};

const Tree: React.FC<{ x: number; y: number; s: number; f: number; c?: string }> = ({ x, y, s, f, c = "#2f9e4f" }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${Math.sin(f / 30 + x) * 1.5})`} stroke={OUT} strokeWidth={5 / s} strokeLinejoin="round">
    <rect x={-9} y={-70} width={18} height={70} fill="#8a5a33" />
    <circle cx={0} cy={-100} r={46} fill={c} />
    <circle cx={-30} cy={-78} r={32} fill={c} />
    <circle cx={30} cy={-78} r={32} fill={c} />
  </g>
);

// ---------- person ----------
type Expr = "happy" | "surprised" | "angry" | "worried" | "shout" | "sad" | "chew" | "shh";
type PersonP = {
  x: number;
  y: number;
  s?: number;
  flip?: boolean;
  kind: "toba" | "wife" | "child";
  expr?: Expr;
  f: number;
  armL?: [number, number];
  armR?: [number, number];
  walk?: number;
  look?: [number, number];
  tilt?: number;
  held?: React.ReactNode;
  heldAt?: "L" | "R";
  tint?: number;
};

const Person: React.FC<PersonP> = ({ x, y, s = 1, flip, kind, expr = "happy", f, armL, armR, walk = 0, look = [0, 0], tilt = 0, held, heldAt = "R", tint = 0 }) => {
  const isChild = kind === "child";
  const hs = isChild ? 1.12 : 1;
  const bodyW = isChild ? 120 : 150;
  const bodyTop = isChild ? -190 : -260;
  const headY = isChild ? -255 : -350;
  const idle = Math.sin(f / 14 + x) * 3;
  const step = walk ? Math.sin(f / 4) : 0;
  const bob = walk ? Math.abs(Math.sin(f / 4)) * -10 : idle * 0.6;
  const shoulderY = bodyTop + 30;
  const aL = armL ?? [-bodyW / 2 - 25, shoulderY + 90 + idle];
  const aR = armR ?? [bodyW / 2 + 25, shoulderY + 90 - idle];
  const blink = (f + x * 3) % 120 < 4;
  const skin = tint ? mix([242, 178, 122], [235, 90, 70], tint) : SKIN;
  const shirt = kind === "toba" ? "#8b5a2b" : kind === "wife" ? "#c2304f" : "#f2c230";
  const arm = (a: [number, number], side: number) => {
    const sx = side * (bodyW / 2 - 8);
    const mx = (sx + a[0]) / 2 + side * 14;
    const my = (shoulderY + a[1]) / 2 + 18;
    const d = `M${sx} ${shoulderY} Q${mx} ${my} ${a[0]} ${a[1]}`;
    return (
      <g>
        <path d={d} fill="none" stroke={OUT} strokeWidth={38} strokeLinecap="round" />
        <path d={d} fill="none" stroke={kind === "child" ? shirt : shirt} strokeWidth={26} strokeLinecap="round" />
        <circle cx={a[0]} cy={a[1]} r={19} fill={skin} stroke={OUT} strokeWidth={6} />
      </g>
    );
  };
  const eye = (cx: number) => (
    <g transform={`translate(${cx} -6)`}>
      <ellipse rx={expr === "surprised" || expr === "shout" ? 22 : 17} ry={blink ? 2 : expr === "surprised" ? 26 : 20} fill="#fff" stroke={OUT} strokeWidth={4} />
      {!blink && <circle cx={look[0]} cy={look[1]} r={expr === "surprised" ? 6 : 9} fill={OUT} />}
    </g>
  );
  const chewT = Math.abs(Math.sin(f / 3));
  const mouth = () => {
    switch (expr) {
      case "happy":
        return <path d="M-26 38 Q0 66 26 38" fill="#fff" stroke={OUT} strokeWidth={6} strokeLinecap="round" />;
      case "shh":
        return <path d="M-14 46 Q0 54 14 46" fill="none" stroke={OUT} strokeWidth={6} strokeLinecap="round" />;
      case "surprised":
        return <ellipse cx={0} cy={50} rx={15} ry={22} fill="#7a2a3a" stroke={OUT} strokeWidth={5} />;
      case "angry":
        return <path d="M-28 60 Q0 36 28 60" fill="none" stroke={OUT} strokeWidth={7} strokeLinecap="round" />;
      case "shout":
        return (
          <g>
            <ellipse cx={0} cy={56} rx={42} ry={32 + Math.sin(f / 1.5) * 4} fill="#7a1f2f" stroke={OUT} strokeWidth={6} />
            <ellipse cx={0} cy={70} rx={22} ry={11} fill="#e0707f" />
          </g>
        );
      case "worried":
        return <path d="M-26 56 Q-13 40 0 54 Q13 68 26 52" fill="none" stroke={OUT} strokeWidth={6} strokeLinecap="round" />;
      case "sad":
        return <path d="M-24 62 Q0 38 24 62" fill="none" stroke={OUT} strokeWidth={6} strokeLinecap="round" />;
      case "chew":
        return <ellipse cx={0} cy={48} rx={20} ry={6 + chewT * 10} fill="#7a2a3a" stroke={OUT} strokeWidth={5} />;
    }
  };
  const brows = () => {
    const col = kind === "toba" ? OUT : OUT;
    if (expr === "angry" || expr === "shout")
      return (
        <g stroke={col} strokeWidth={9} strokeLinecap="round">
          <path d="M-52 -42 L-14 -26" />
          <path d="M52 -42 L14 -26" />
        </g>
      );
    if (expr === "worried" || expr === "sad")
      return (
        <g stroke={col} strokeWidth={7} strokeLinecap="round">
          <path d="M-52 -26 L-16 -44" />
          <path d="M52 -26 L16 -44" />
        </g>
      );
    if (expr === "surprised")
      return (
        <g stroke={col} strokeWidth={7} strokeLinecap="round" fill="none">
          <path d="M-50 -52 Q-34 -64 -18 -52" />
          <path d="M50 -52 Q34 -64 18 -52" />
        </g>
      );
    return null;
  };
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(${tilt})`}>
      <ellipse cx={0} cy={4} rx={bodyW * 0.7} ry={14} fill="#00000030" />
      <g transform={`translate(0 ${bob})`}>
        {/* legs */}
        <g stroke={OUT} strokeWidth={6} strokeLinejoin="round">
          <rect x={-bodyW / 2 + 14 + step * 10} y={-72} width={34} height={72} rx={14} fill={kind === "wife" ? "#8f2038" : "#5b3a22"} />
          <rect x={bodyW / 2 - 48 - step * 10} y={-72} width={34} height={72} rx={14} fill={kind === "wife" ? "#8f2038" : "#5b3a22"} />
        </g>
        {/* back hair for wife */}
        {kind === "wife" && (
          <path
            transform={`translate(0 ${headY}) scale(${hs})`}
            d="M-100 -20 Q-110 -130 0 -128 Q110 -130 100 -20 Q112 90 78 150 L-78 150 Q-112 90 -100 -20Z"
            fill="#1d1420"
            stroke={OUT}
            strokeWidth={6}
          />
        )}
        {/* arms behind */}
        {arm(aL, -1)}
        {/* body */}
        <path
          d={`M${-bodyW / 2} -62 L${-bodyW / 2 + 6} ${bodyTop + 30} Q${-bodyW / 2 + 6} ${bodyTop} 0 ${bodyTop} Q${bodyW / 2 - 6} ${bodyTop} ${bodyW / 2 - 6} ${bodyTop + 30} L${bodyW / 2} -62 Z`}
          fill={shirt}
          stroke={OUT}
          strokeWidth={7}
          strokeLinejoin="round"
        />
        {kind === "toba" && (
          <g>
            <rect x={-bodyW / 2 + 2} y={-120} width={bodyW - 4} height={26} fill="#1d1420" stroke={OUT} strokeWidth={4} />
            <rect x={-bodyW / 2 + 2} y={-112} width={bodyW - 4} height={7} fill="#e8d8b8" />
            <path d={`M${-bodyW / 2 + 8} ${bodyTop + 14} L${bodyW / 2 - 8} -150`} stroke="#c0392b" strokeWidth={22} />
          </g>
        )}
        {kind === "wife" && (
          <g>
            <path d={`M${-bodyW / 2 + 8} ${bodyTop + 22} Q0 ${bodyTop + 80} ${bodyW / 2 - 8} ${bodyTop + 22} L${bodyW / 2 - 8} ${bodyTop + 52} Q0 ${bodyTop + 110} ${-bodyW / 2 + 8} ${bodyTop + 52}Z`} fill="#f2c230" stroke={OUT} strokeWidth={5} />
            <rect x={-bodyW / 2 + 4} y={-104} width={bodyW - 8} height={30} fill="#1d1420" stroke={OUT} strokeWidth={4} />
            <rect x={-bodyW / 2 + 4} y={-94} width={bodyW - 8} height={7} fill="#f2c230" />
          </g>
        )}
        {kind === "child" && <circle cx={0} cy={-120} r={14} fill="#e0a010" stroke={OUT} strokeWidth={4} />}
        {/* head */}
        <g transform={`translate(0 ${headY}) scale(${hs})`}>
          <ellipse cx={0} cy={0} rx={96} ry={92} fill={skin} stroke={OUT} strokeWidth={7} />
          <ellipse cx={-96} cy={6} rx={12} ry={18} fill={skin} stroke={OUT} strokeWidth={5} />
          <ellipse cx={96} cy={6} rx={12} ry={18} fill={skin} stroke={OUT} strokeWidth={5} />
          {kind === "toba" && (
            <g>
              <path d="M-96 -20 Q-98 -96 0 -96 Q98 -96 96 -20 Q60 -58 0 -54 Q-60 -58 -96 -20Z" fill="#1d1420" stroke={OUT} strokeWidth={6} />
              <rect x={-97} y={-52} width={194} height={22} rx={8} fill="#c0392b" stroke={OUT} strokeWidth={5} />
              <rect x={-97} y={-45} width={194} height={6} fill="#f2c230" />
            </g>
          )}
          {kind === "wife" && (
            <g>
              <path d="M-96 -10 Q-100 -100 0 -98 Q100 -100 96 -10 Q70 -66 0 -64 Q-70 -66 -96 -10Z" fill="#1d1420" stroke={OUT} strokeWidth={6} />
              <g transform="translate(62 -78)">
                {[0, 72, 144, 216, 288].map((r) => (
                  <ellipse key={r} rx={9} ry={16} cy={-14} transform={`rotate(${r})`} fill="#ff8fb0" stroke={OUT} strokeWidth={3} />
                ))}
                <circle r={8} fill="#ffe066" stroke={OUT} strokeWidth={3} />
              </g>
            </g>
          )}
          {kind === "child" && (
            <g>
              <path d="M-96 -18 Q-98 -90 0 -90 Q98 -90 96 -18 Q60 -52 0 -48 Q-60 -52 -96 -18Z" fill="#1d1420" stroke={OUT} strokeWidth={6} />
              <path d="M-6 -90 Q-16 -130 14 -126" fill="none" stroke={OUT} strokeWidth={7} strokeLinecap="round" />
            </g>
          )}
          {eye(-34)}
          {eye(34)}
          {brows()}
          {(expr === "happy" || expr === "chew" || expr === "shh") && (
            <g fill="#ff8fa0" opacity={0.55}>
              <ellipse cx={-62} cy={30} rx={16} ry={10} />
              <ellipse cx={62} cy={30} rx={16} ry={10} />
            </g>
          )}
          {mouth()}
          {expr === "sad" && <path d="M-34 24 Q-40 52 -34 64 Q-26 52 -34 24Z" fill="#7fd0ff" stroke={OUT} strokeWidth={3} />}
        </g>
        {/* arm in front */}
        {arm(aR, 1)}
        {held && <g transform={`translate(${heldAt === "R" ? aR[0] : aL[0]} ${heldAt === "R" ? aR[1] : aL[1]})`}>{held}</g>}
      </g>
    </g>
  );
};

const Fish: React.FC<{ x: number; y: number; s?: number; rot?: number; f: number }> = ({ x, y, s = 1, rot = 0, f }) => {
  const wag = Math.sin(f / 2.2) * 10;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`} stroke={OUT} strokeWidth={6} strokeLinejoin="round">
      <path d={`M-70 0 L-120 ${-36 + wag} L-112 0 L-120 ${36 - wag} Z`} fill="#ffb300" />
      <path d="M-80 0 Q-10 -78 80 0 Q-10 78 -80 0Z" fill="#ffd23f" />
      <path d="M-10 -52 Q10 -92 36 -44Z" fill="#ffb300" />
      <path d="M-30 -24 Q0 -44 30 -20" fill="none" stroke="#fff6b0" strokeWidth={8} strokeLinecap="round" />
      <circle cx={46} cy={-8} r={12} fill="#fff" />
      <circle cx={49} cy={-8} r={6} fill={OUT} />
      <path d="M62 14 Q70 18 76 12" fill="none" />
    </g>
  );
};

const HouseBolon: React.FC<{ x: number; y: number; s?: number; f: number; sink?: number }> = ({ x, y, s = 1, sink = 0 }) => (
  <g transform={`translate(${x} ${y + sink}) scale(${s})`} stroke={OUT} strokeWidth={6} strokeLinejoin="round">
    {[-150, -70, 70, 150].map((px) => (
      <rect key={px} x={px - 10} y={-80} width={20} height={80} fill="#7a4a28" />
    ))}
    <rect x={-190} y={-210} width={380} height={140} fill="#8a4b2a" />
    <rect x={-190} y={-150} width={380} height={22} fill="#1d1420" />
    <rect x={-190} y={-146} width={380} height={7} fill="#f4ead2" />
    <rect x={-190} y={-128} width={380} height={12} fill="#c0392b" />
    <rect x={-40} y={-206} width={80} height={110} rx={8} fill="#5b3a22" />
    <circle cx={22} cy={-150} r={5} fill="#f2c230" />
    <path d="M-190 -210 Q-220 -330 -300 -400 Q-170 -320 0 -320 Q170 -320 300 -400 Q220 -330 190 -210Z" fill="#6b3a1f" />
    <path d="M-250 -395 Q-120 -310 0 -310 Q120 -310 250 -395 L250 -355 Q120 -285 0 -285 Q-120 -285 -250 -355Z" fill="#a8602f" />
    <path d="M-80 -300 L0 -400 L80 -300Z" fill="#f4ead2" />
    <path d="M-48 -300 L0 -364 L48 -300Z" fill="#c0392b" />
  </g>
);

const Terraces: React.FC<{ f: number; y: number }> = ({ f, y }) => (
  <g stroke={OUT} strokeWidth={5}>
    {[0, 1, 2, 3, 4].map((i) => (
      <path
        key={i}
        d={`M-300 ${y + i * 120 + 120} Q300 ${y + i * 120 - 30 + Math.sin(f / 40 + i) * 4} 720 ${y + i * 120 + 40} T1380 ${y + i * 120 + 20} L1380 2300 L-300 2300Z`}
        fill={["#7ed36a", "#5fbf55", "#8fd96b", "#4fae4d", "#6cc65c"][i]}
      />
    ))}
  </g>
);

const Hills: React.FC<{ y: number; c1: string; c2: string; f: number }> = ({ y, c1, c2 }) => (
  <g stroke={OUT} strokeWidth={5}>
    <path d={`M-300 ${y + 60} Q50 ${y - 220} 380 ${y - 20} T900 ${y - 60} T1380 ${y + 40} L1380 2300 L-300 2300Z`} fill={c1} />
    <path d={`M-300 ${y + 200} Q200 ${y - 60} 600 ${y + 110} T1380 ${y + 90} L1380 2300 L-300 2300Z`} fill={c2} />
  </g>
);

const Rain: React.FC<{ f: number; amount: number; tilt?: number }> = ({ f, amount, tilt = 0.25 }) => (
  <g stroke="#cfe6ff" strokeWidth={4} strokeLinecap="round" opacity={0.75}>
    {Array.from({ length: amount }).map((_, i) => {
      const sp = 38 + rnd(i) * 26;
      const y = ((f * sp + rnd(i + 9) * 2400) % 2400) - 240;
      const x = rnd(i + 3) * 1500 - 220 + y * tilt * -1;
      return <line key={i} x1={x} y1={y} x2={x - 24 * tilt * 3} y2={y + 70} />;
    })}
  </g>
);

const Water: React.FC<{ f: number; top: number; c1?: string; c2?: string }> = ({ f, top, c1 = "#3aa7e8", c2 = "#2b86c9" }) => {
  let d = `M-300 ${top}`;
  for (let x = -300; x <= 1400; x += 50) d += ` L${x} ${top + Math.sin(x / 70 + f / 7) * 12 + Math.sin(x / 33 - f / 5) * 5}`;
  d += " L1400 2300 L-300 2300Z";
  return (
    <g>
      <path d={d} fill={c1} stroke={OUT} strokeWidth={6} />
      <rect x={-300} y={top + 90} width={1700} height={2300} fill={c2} opacity={0.5} />
      {Array.from({ length: 8 }).map((_, i) => (
        <path key={i} d={`M${rnd(i) * 900 - 100 + Math.sin(f / 20 + i) * 20} ${top + 60 + i * 80} q40 -14 80 0`} stroke="#d8f2ff" strokeWidth={6} fill="none" strokeLinecap="round" />
      ))}
    </g>
  );
};

// ---------- Lake scene (shots 1, 10, 11) ----------
type LakeP = { f: number; tod: number; island: number; hero?: boolean; kid?: number };
const Lake: React.FC<LakeP> = ({ f, tod, island, hero, kid = 0 }) => {
  const skyTop = mix([95, 190, 255], [255, 140, 110], tod);
  const skyBot = mix([200, 238, 255], [255, 214, 140], tod);
  const lakeA = mix([70, 170, 235], [255, 150, 120], tod * 0.5);
  const lakeB = mix([40, 120, 200], [120, 90, 170], tod * 0.7);
  const ih = island; // 0..1 height of Samosir
  const ix = 560;
  const iy = 1180;
  const hillY = iy - 250 * ih;
  return (
    <g>
      <defs>
        <linearGradient id={`sky${Math.round(tod * 10)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={skyTop} />
          <stop offset="1" stopColor={skyBot} />
        </linearGradient>
        <linearGradient id={`lk${Math.round(tod * 10)}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lakeA} />
          <stop offset="1" stopColor={lakeB} />
        </linearGradient>
      </defs>
      <rect x={-300} y={-300} width={1680} height={2000} fill={`url(#sky${Math.round(tod * 10)})`} />
      {/* sun */}
      <g transform={`translate(${lerp(820, 700, tod)} ${lerp(330, 760, tod)})`}>
        <circle r={95} fill={mix([255, 240, 150], [255, 120, 70], tod)} stroke={OUT} strokeWidth={6} />
        {Array.from({ length: 12 }).map((_, i) => (
          <line key={i} x1={0} y1={-125} x2={0} y2={-160} stroke="#ffe066" strokeWidth={9} strokeLinecap="round" transform={`rotate(${i * 30 + f * 0.5})`} />
        ))}
      </g>
      <Cloud x={(200 + f * 0.6) % 1500 - 200} y={300} s={1.3} />
      <Cloud x={(900 + f * 0.35) % 1500 - 200} y={520} s={1} />
      <Cloud x={(500 + f * 0.45) % 1500 - 200} y={140} s={0.8} />
      <Bird x={300 + Math.sin(f / 40) * 40} y={620 - f * 0.1} f={f} />
      <Bird x={400 + Math.sin(f / 40 + 1) * 40} y={680 - f * 0.1} f={f + 3} s={0.8} />
      {/* far mountains */}
      <path d="M-300 900 L-60 640 L130 820 L330 560 L560 860 L760 600 L1000 820 L1180 620 L1380 900Z" fill={mix([140, 130, 200], [130, 90, 140], tod)} stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
      <path d="M330 560 L290 618 L330 600 L360 630Z M760 600 L725 650 L760 635 L790 660Z" fill="#fff" stroke={OUT} strokeWidth={4} />
      <path d="M-300 960 L-80 760 L180 940 L430 780 L700 960 L960 770 L1380 980 L1380 1200 L-300 1200Z" fill={mix([90, 170, 110], [150, 120, 100], tod)} stroke={OUT} strokeWidth={6} strokeLinejoin="round" />
      {/* lake */}
      <path d="M-300 1000 Q300 930 560 960 T1380 1000 L1380 2300 L-300 2300Z" fill={`url(#lk${Math.round(tod * 10)})`} stroke={OUT} strokeWidth={6} />
      {Array.from({ length: 14 }).map((_, i) => (
        <path key={i} d={`M${rnd(i + 1) * 1000 - 40 + Math.sin(f / 25 + i) * 14} ${1050 + i * 60} q50 -16 100 0`} stroke="#e6f7ff" strokeWidth={6} fill="none" strokeLinecap="round" opacity={0.8} />
      ))}
      {Array.from({ length: 9 }).map((_, i) => {
        const tw = Math.sin(f / 6 + i * 2) > 0.2;
        return tw ? <Sparkle key={i} x={rnd(i + 20) * 900 + 60} y={1060 + rnd(i + 5) * 600} s={0.55} rot={f} /> : null;
      })}
      {/* island Samosir */}
      {ih > 0.02 && (
        <g>
          <ellipse cx={ix} cy={iy + 30} rx={330 * ih + 30} ry={40 * ih + 6} fill="#ffffff55" />
          <path
            d={`M${ix - 340 * ih} ${iy + 20} Q${ix - 220 * ih} ${hillY} ${ix} ${hillY - 10} Q${ix + 240 * ih} ${hillY + 10} ${ix + 340 * ih} ${iy + 20}Z`}
            fill="#58b84f"
            stroke={OUT}
            strokeWidth={7}
          />
          <path
            d={`M${ix - 250 * ih} ${iy + 10} Q${ix - 120 * ih} ${hillY + 80 * ih} ${ix + 60 * ih} ${hillY + 60 * ih} Q${ix + 220 * ih} ${hillY + 90 * ih} ${ix + 290 * ih} ${iy + 10}Z`}
            fill="#7ccf5c"
          />
          {ih > 0.7 && (
            <g>
              <Tree x={ix - 190 * ih} y={iy - 20} s={0.5} f={f} />
              <Tree x={ix + 170 * ih} y={iy - 12} s={0.55} f={f} />
              <Tree x={ix + 60 * ih} y={hillY + 46} s={0.38} f={f} />
              <HouseBolon x={ix - 70 * ih} y={hillY + 70 * ih} s={0.2} f={f} />
            </g>
          )}
          {kid > 0 && (
            <Person kind="child" x={ix + 120 * ih} y={hillY + 30 + (1 - kid) * 40} s={0.36 * kid} f={f} armL={[-86, -250]} armR={[86, -270 - Math.sin(f / 4) * 14]} expr="happy" flip={false} />
          )}
        </g>
      )}
      {/* foreground */}
      <path d="M-300 1700 Q100 1500 420 1650 Q700 1780 1380 1580 L1380 2300 L-300 2300Z" fill="#3f9a45" stroke={OUT} strokeWidth={7} />
      <path d="M-300 1800 Q300 1700 700 1820 T1380 1760 L1380 2300 L-300 2300Z" fill="#2f8238" stroke={OUT} strokeWidth={7} />
      {/* palm leaves */}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          transform={`translate(${-60 + i * 4} 1700) rotate(${-70 + i * 28 + Math.sin(f / 22 + i) * 3})`}
          d="M0 0 Q80 -60 240 -30 Q90 -20 0 0Z"
          fill="#2a9a44"
          stroke={OUT}
          strokeWidth={6}
        />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <path
          key={i}
          transform={`translate(1140 1700) scale(-1 1) rotate(${-70 + i * 28 + Math.sin(f / 22 + i + 2) * 3})`}
          d="M0 0 Q80 -60 240 -30 Q90 -20 0 0Z"
          fill="#2a9a44"
          stroke={OUT}
          strokeWidth={6}
        />
      ))}
      {hero && <g />}
    </g>
  );
};

// ---------- Shot scenes ----------
const Village: React.FC<{ f: number; dusk?: number }> = ({ f, dusk = 0 }) => (
  <g>
    <rect x={-300} y={-300} width={1680} height={2000} fill={mix([140, 210, 255], [255, 190, 130], dusk)} />
    <circle cx={850} cy={330} r={85} fill="#fff3a0" stroke={OUT} strokeWidth={6} />
    <Cloud x={(150 + f * 0.5) % 1500 - 200} y={260} s={1.2} />
    <Cloud x={(800 + f * 0.3) % 1500 - 200} y={470} s={0.9} />
    <Hills y={850} c1="#6fc86a" c2="#59b95a" f={f} />
    <Terraces f={f} y={1000} />
    <Tree x={120} y={1180} s={1.1} f={f} />
    <Tree x={960} y={1150} s={1} f={f} />
    <HouseBolon x={620} y={1250} s={1.15} f={f} />
    <path d="M-300 1400 Q500 1330 1380 1420 L1380 2300 L-300 2300Z" fill="#9ed77a" stroke={OUT} strokeWidth={6} />
  </g>
);

const River: React.FC<{ f: number; bobDip: number }> = ({ f, bobDip }) => (
  <g>
    <rect x={-300} y={-300} width={1680} height={2000} fill="#a8e0ff" />
    <circle cx={200} cy={330} r={80} fill="#fff3a0" stroke={OUT} strokeWidth={6} />
    <Cloud x={(500 + f * 0.5) % 1500 - 200} y={250} s={1.1} />
    <Hills y={780} c1="#6fc86a" c2="#4fae4d" f={f} />
    <Water f={f} top={1180} />
    <path d="M-300 1100 Q300 1010 700 1140 Q900 1210 1380 1180 L1380 1300 L-300 1300Z" fill="#8fd16a" stroke={OUT} strokeWidth={6} />
    <path d="M-300 1100 Q300 1010 700 1140 Q900 1210 1380 1180 L1380 1160 Q900 1190 700 1120 Q300 990 -300 1080Z" fill="#6cb554" />
    {/* reeds */}
    {[40, 110, 960, 1030].map((x, i) => (
      <path key={x} d={`M${x} 1240 q${Math.sin(f / 15 + i) * 14} -120 ${12 + Math.sin(f / 18 + i) * 10} -190`} stroke="#2f8238" strokeWidth={9} fill="none" strokeLinecap="round" />
    ))}
    {/* bobber */}
    <g transform={`translate(660 ${1340 + bobDip})`}>
      <circle r={20} fill="#ff4d4d" stroke={OUT} strokeWidth={5} />
      <path d="M-20 0 A20 20 0 0 0 20 0Z" fill="#fff" stroke={OUT} strokeWidth={4} />
    </g>
  </g>
);

const Storm: React.FC<{ f: number; lvl: number; flash: number }> = ({ f, lvl, flash }) => {
  const waterTop = lerp(1500, 520, lvl);
  return (
    <g>
      <rect x={-300} y={-300} width={1680} height={2000} fill={mix([40, 40, 80], [200, 200, 230], flash)} />
      <Cloud x={150 + Math.sin(f / 50) * 20} y={200} s={2.1} color="#4b4e6e" />
      <Cloud x={760 + Math.sin(f / 60) * 20} y={330} s={2.4} color="#3b3d5c" />
      <Cloud x={420} y={520} s={2} color="#55587a" />
      <Hills y={900} c1="#3d7a58" c2="#2f6548" f={f} />
      <path d="M-300 1400 Q500 1330 1380 1420 L1380 2300 L-300 2300Z" fill="#5a8a58" stroke={OUT} strokeWidth={6} />
      <HouseBolon x={620} y={1300} s={1.15} f={f} sink={0} />
      <Tree x={110} y={1330} s={1.1} f={f * 3} c="#2a6a3f" />
      <Water f={f * 1.5} top={waterTop} c1="#2a6fa8" c2="#1d4f85" />
      <Rain f={f} amount={90} />
    </g>
  );
};

const Bolt: React.FC<{ x: number; show: boolean }> = ({ x, show }) =>
  show ? (
    <path transform={`translate(${x} 0)`} d="M0 -100 L-60 380 L10 380 L-90 900 L90 300 L10 300 L70 -100Z" fill="#fffbd0" stroke="#ffd23f" strokeWidth={8} strokeLinejoin="round" />
  ) : null;

// ---------- main ----------
export const Toba: React.FC = () => {
  const f = useCurrentFrame();
  let shot = 0;
  for (let i = 0; i < CUT.length - 1; i++) if (f >= CUT[i]) shot = i;
  const lf = f - CUT[shot];
  const dur = CUT[shot + 1] - CUT[shot];
  const fadeIn = shot === 0 ? 0 : clamp(1 - lf / 7, 0, 1);

  let overlayFlash = 0;
  let body: React.ReactNode = null;

  switch (shot) {
    case 0: {
      // hook: lake from above, camera pulls back
      body = (
        <Cam f={lf} dur={dur} z0={1.5} z1={1.0} y0={-120} y1={0}>
          <Lake f={f} tod={0} island={1} />
        </Cam>
      );
      break;
    }
    case 1: {
      // village, Toba walks in
      const wx = lerp(-160, 360, prog(lf, 4, 90));
      const walking = lf < 92 && lf > 4;
      body = (
        <Cam f={lf} dur={dur} z0={1.0} z1={1.22} x0={0} x1={-40} y0={0} y1={-160}>
          <Village f={f} />
          <Person kind="toba" x={wx} y={1560} s={1.25} f={f} walk={walking ? 1 : 0} armR={[110, -150]} armL={[-96, -180]} expr="happy" held={
            <g stroke={OUT} strokeWidth={6} strokeLinecap="round">
              <line x1={0} y1={0} x2={150} y2={-380} stroke="#8a5a33" strokeWidth={10} />
              <path d="M150 -380 Q200 -300 170 -190" fill="none" stroke="#fff" strokeWidth={3} />
            </g>
          } />
        </Cam>
      );
      break;
    }
    case 2: {
      // river: bobber dips ~f 40, fish pulled out ~ f 75
      const dip = lf > 36 && lf < 70 ? Math.sin((lf - 36) / 3) * 14 + 16 : 0;
      const pull = prog(lf, 66, 96);
      const arcY = lerp(1400, 780, Math.sin(pull * Math.PI * 0.5)) - Math.sin(pull * Math.PI) * 180;
      const fishX = lerp(660, 380, pull);
      const showFish = lf >= 66;
      const hold = lf > 96;
      body = (
        <Cam f={lf} dur={dur} z0={1.05} z1={1.25} x0={20} x1={-60} y0={0} y1={-120} shake={lf > 66 && lf < 76 ? 14 : 0}>
          <River f={f} bobDip={dip} />
          <Person kind="toba" x={300} y={1390} s={1.2} f={f} look={[hold ? 0 : 6, 4]} expr={hold ? "surprised" : lf > 36 ? "surprised" : "happy"} armR={lf > 60 ? [210, -330 - pull * 40] : [140, -170]} armL={[-80, -170]} held={
            <line x1={0} y1={0} x2={210} y2={-250} stroke="#8a5a33" strokeWidth={10} strokeLinecap="round" />
          } />
          {showFish && !hold && <Fish x={fishX} y={arcY} f={f} s={0.75} rot={lerp(-30, 20, pull) + Math.sin(f / 2) * 8} />}
          {hold && <Fish x={380} y={820 + Math.sin(f / 8) * 14} f={f} s={0.85} rot={Math.sin(f / 5) * 10} />}
          {lf > 66 && lf < 90 && (
            <g fill="#e6f7ff" stroke={OUT} strokeWidth={4}>
              {Array.from({ length: 6 }).map((_, i) => (
                <circle key={i} cx={660 + (i - 3) * 30 + (lf - 66) * (i - 3) * 2} cy={1350 - Math.sin(clamp((lf - 66) / 24, 0, 1) * Math.PI) * (80 + i * 14)} r={10} />
              ))}
            </g>
          )}
          {hold && [0, 1, 2, 3].map((i) => <Sparkle key={i} x={380 + Math.cos(f / 9 + i * 1.6) * 150} y={820 + Math.sin(f / 9 + i * 1.6) * 110} s={0.6 + 0.3 * Math.sin(f / 5 + i)} rot={f * 2} />)}
        </Cam>
      );
      break;
    }
    case 3: {
      // fish -> girl -> wedding
      // 0..40 fish sparkles (Ajaibnya) | 40..78 spin | 78 flash->girl | 110+ wedding
      const flash = lf >= 70 && lf <= 90 ? 1 - Math.abs(lf - 80) / 10 : 0;
      overlayFlash = clamp(flash, 0, 1);
      const girl = lf >= 80;
      const spin = prog(lf, 30, 80);
      body = (
        <Cam f={lf} dur={dur} z0={1.1} z1={1.3} y0={40} y1={-80}>
          <River f={f} bobDip={0} />
          <rect x={-300} y={-300} width={1680} height={2000} fill="#fff3a0" opacity={0.2 + 0.2 * Math.sin(f / 8)} />
          {!girl && <Fish x={540} y={1060 - spin * 140} f={f} s={0.9 + spin * 0.4} rot={spin * 1080} />}
          {!girl && <Person kind="toba" x={180} y={1400} s={1.15} f={f} expr="surprised" look={[8, -4]} armR={[160, -230]} armL={[-90, -230]} />}
          {girl && (
            <g>
              <Person kind="wife" x={640 + (lf < 100 ? (1 - back((lf - 80) / 20)) * -30 : 0)} y={1400} s={1.2 * (0.6 + 0.4 * back((lf - 80) / 20))} f={f} expr="happy" armL={[-90, -150]} armR={[90, -150]} />
              <Person kind="toba" x={290} y={1400} s={1.15} f={f} expr={lf < 105 ? "surprised" : "happy"} look={[8, 0]} armR={lf > 120 ? [90, -160] : [150, -210]} armL={[-80, -160]} />
            </g>
          )}
          {lf > 118 &&
            [0, 1, 2, 3, 4, 5].map((i) => {
              const t = (lf - 118 + i * 12) % 60;
              return (
                <path
                  key={i}
                  transform={`translate(${430 + Math.sin(i * 2.1) * 130} ${1000 - t * 5}) scale(${0.7 + (i % 3) * 0.2})`}
                  d="M0 18 C-40 -14 -22 -40 0 -22 C22 -40 40 -14 0 18Z"
                  fill="#ff5d8f"
                  stroke={OUT}
                  strokeWidth={4}
                  opacity={1 - t / 60}
                />
              );
            })}
          {lf > 20 && lf < 80 && [0, 1, 2, 3, 4, 5].map((i) => <Sparkle key={i} x={540 + Math.cos(f / 7 + i * 1.05) * (160 - spin * 60)} y={1000 + Math.sin(f / 7 + i * 1.05) * 130} s={0.7} rot={f * 3} />)}
        </Cam>
      );
      break;
    }
    case 4: {
      // the promise: wife "shh", fish-with-X bubble
      const bub = back(prog(lf, 8, 28));
      body = (
        <Cam f={lf} dur={dur} z0={1.0} z1={1.4} x0={0} x1={-50} y0={0} y1={-260}>
          <Village f={f} dusk={0.15} />
          <Person kind="toba" x={290} y={1500} s={1.35} f={f} expr={lf > 80 ? "happy" : "worried"} look={[10, 0]} armR={[110, -330 + (lf > 70 ? Math.sin(f / 5) * 8 : 0)]} armL={[-90, -150]} tilt={lf > 70 ? Math.sin(f / 6) * 4 : 0} />
          <Person kind="wife" x={730} y={1500} s={1.35} f={f} expr="shh" look={[-8, 0]} flip armL={[-80, -150]} armR={[-14, -320]} />
          <g transform={`translate(560 ${880}) scale(${bub})`}>
            <path d="M-170 -110 Q-170 -190 -90 -190 L110 -190 Q190 -190 190 -110 Q190 -20 110 -20 L40 -20 L10 50 L-10 -20 L-90 -20 Q-170 -20 -170 -110Z" fill="#fff" stroke={OUT} strokeWidth={7} />
            <g transform="translate(0 -105) scale(0.7)">
              <Fish x={0} y={0} f={f} s={0.8} />
            </g>
            <g stroke="#e0203a" strokeWidth={16} strokeLinecap="round">
              <line x1={-70} y1={-170} x2={70} y2={-40} />
              <line x1={70} y1={-170} x2={-70} y2={-40} />
            </g>
          </g>
        </Cam>
      );
      break;
    }
    case 5: {
      // years pass, child eats father's lunch
      const kidIn = back(prog(lf, 12, 40));
      const eating = lf > 70;
      const worry = prog(lf, 105, 140);
      body = (
        <Cam f={lf} dur={dur} z0={1.0} z1={1.25} x0={20} x1={-30} y0={0} y1={-150}>
          <Village f={f} dusk={0.35 + Math.min(0.4, lf / 400)} />
          {/* petals falling = years pass */}
          {Array.from({ length: 12 }).map((_, i) => (
            <ellipse key={i} cx={((rnd(i) * 1300 + f * (2 + rnd(i + 4) * 2) * (i % 2 ? 1 : -1)) % 1500) - 100} cy={((f * (3 + rnd(i + 2) * 3) + rnd(i + 8) * 2000) % 2200) - 150} rx={10} ry={6} fill="#ff9fc0" stroke={OUT} strokeWidth={2.5} />
          ))}
          <Person kind="wife" x={800} y={1520} s={1.2} f={f} expr="happy" flip armL={[-60, -170]} armR={[-100, -190]} />
          <Person kind="child" x={300} y={1530} s={(1.4 * kidIn) || 0.01} f={f} expr={eating ? "chew" : "happy"} armL={[-50, -140]} armR={[50, -140]} held={
            <g stroke={OUT} strokeWidth={5}>
              <path d="M-50 -10 Q0 60 50 -10Z" fill="#7bc65a" />
              <ellipse cx={0} cy={-12} rx={46} ry={14} fill="#fff" />
            </g>
          } heldAt="R" />
          {eating && Array.from({ length: 5 }).map((_, i) => (
            <circle key={i} cx={330 + (rnd(i) - 0.5) * 120 + Math.sin(f / 4 + i) * 10} cy={1360 + ((f * 3 + i * 25) % 120)} r={5} fill="#fff" stroke={OUT} strokeWidth={2} />
          ))}
          {/* father comes with empty basket */}
          <Person kind="toba" x={lerp(1250, 760, prog(lf, 70, 125))} y={1560} s={1.25} f={f} walk={lf < 125 ? 1 : 0} flip expr={worry > 0.5 ? "worried" : "happy"} armL={[-90, -150]} armR={[-100, -170]} />
        </Cam>
      );
      break;
    }
    case 6: {
      // anger
      const shoutT = lf >= 75;
      const redT = prog(lf, 20, 80);
      body = (
        <Cam f={lf} dur={dur} z0={1.5} z1={1.95} x0={0} x1={0} y0={140} y1={260} roll={shoutT ? 3 : 0} shake={shoutT ? 12 : redT * 4}>
          <rect x={-300} y={-300} width={1680} height={2400} fill={mix([255, 220, 160], [190, 60, 70], redT)} />
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={i} x1={540} y1={900} x2={540 + Math.cos(i * 0.39) * 1500} y2={900 + Math.sin(i * 0.39) * 1500} stroke={mix([255, 240, 200], [220, 80, 80], redT)} strokeWidth={50} opacity={0.5} />
          ))}
          <Person kind="toba" x={540} y={1450} s={2.4} f={f} expr={shoutT ? "shout" : "angry"} tint={redT} armL={[-110, -330]} armR={[110, -330]} tilt={shoutT ? Math.sin(f) * 2.5 : 0} />
          {lf > 30 && [-1, 1].map((sd) => (
            <g key={sd} opacity={0.8}>
              {[0, 1, 2].map((i) => (
                <circle key={i} cx={540 + sd * (270 + i * 18) + Math.sin(f / 3 + i) * 6} cy={1050 - ((f * 5 + i * 40) % 160)} r={20 + i * 8} fill="#fff" stroke={OUT} strokeWidth={4} opacity={1 - ((f * 5 + i * 40) % 160) / 160} />
              ))}
            </g>
          ))}
          {shoutT && (
            <g transform={`translate(540 540) scale(${back(prog(lf, 75, 90)) * 1.1})`}>
              <path d="M-380 -90 L-290 -190 L-200 -110 L-100 -230 L0 -120 L110 -230 L200 -110 L300 -190 L380 -90 L300 20 L360 130 L200 90 L100 200 L0 100 L-110 200 L-200 90 L-360 130 L-300 20Z" fill="#fff" stroke={OUT} strokeWidth={8} strokeLinejoin="round" />
              <Fish x={0} y={-30} f={f} s={0.85} rot={-12} />
              <g stroke="#e0203a" strokeWidth={14} strokeLinecap="round" opacity={0.9}>
                <line x1={-180} y1={-120} x2={180} y2={60} opacity={0} />
              </g>
            </g>
          )}
        </Cam>
      );
      break;
    }
    case 7: {
      // promise breaks
      const split = prog(lf, 6, 30);
      overlayFlash = lf >= 4 && lf <= 14 ? 1 - Math.abs(lf - 9) / 5 : 0;
      body = (
        <Cam f={lf} dur={dur} z0={1.0} z1={1.15} shake={lf < 30 ? 22 * (1 - lf / 30) : 3}>
          <rect x={-300} y={-300} width={1680} height={2400} fill={mix([90, 40, 110], [30, 15, 50], split)} />
          {Array.from({ length: 14 }).map((_, i) => (
            <line key={i} x1={540} y1={960} x2={540 + Math.cos(i * 0.45) * 1400} y2={960 + Math.sin(i * 0.45) * 1400} stroke="#ffffff18" strokeWidth={36} />
          ))}
          <g transform={`translate(540 720) scale(0.9)`}>
            <g transform={`translate(${-split * 70} ${split * 20}) rotate(${-split * 14})`}>
              <path d="M0 220 C-300 -20 -230 -230 -10 -110 L-30 -30 L40 40 L-20 120 Z" fill="#ffd23f" stroke={OUT} strokeWidth={9} strokeLinejoin="round" />
            </g>
            <g transform={`translate(${split * 70} ${split * 40}) rotate(${split * 16})`}>
              <path d="M0 220 C300 -20 230 -230 10 -110 L-10 -30 L50 50 L0 120 Z" fill="#ffc21a" stroke={OUT} strokeWidth={9} strokeLinejoin="round" />
            </g>
            {split > 0.3 && <path d="M-10 -110 L-30 -30 L40 40 L-20 120 L0 220" fill="none" stroke="#e0203a" strokeWidth={5} opacity={0.0} />}
            {Array.from({ length: 8 }).map((_, i) => (
              <Sparkle key={i} x={Math.cos(i * 0.8) * (60 + split * 320 + (lf - 6) * 3)} y={Math.sin(i * 0.8) * (60 + split * 260 + (lf - 6) * 2)} s={0.5 + rnd(i) * 0.5} rot={f * 3 + i * 40} color={i % 2 ? "#ffd23f" : "#fff"} />
            ))}
          </g>
          {lf > 12 && (
            <g transform={`translate(540 1700)`}>
              <Person kind="wife" x={0} y={0} s={0.85} f={f} expr="sad" armL={[-70, -190]} armR={[70, -190]} />
            </g>
          )}
        </Cam>
      );
      break;
    }
    case 8: {
      // storm and flood
      const lvl = prog(lf, 25, 140);
      const bolts = (lf >= 8 && lf <= 14) || (lf >= 58 && lf <= 64) || (lf >= 100 && lf <= 105);
      const flash = bolts ? 0.7 : 0;
      overlayFlash = bolts ? 0.45 : 0;
      body = (
        <Cam f={lf} dur={dur} z0={1.05} z1={1.2} y0={0} y1={-80} shake={4 + lvl * 8}>
          <Storm f={f} lvl={lvl} flash={flash} />
          <Bolt x={lf < 40 ? 250 : lf < 80 ? 830 : 540} show={bolts} />
        </Cam>
      );
      break;
    }
    case 9: {
      // calm lake
      body = (
        <Cam f={lf} dur={dur} z0={1.5} z1={1.1} y0={-100} y1={0}>
          <Lake f={f} tod={0.35} island={0} />
        </Cam>
      );
      break;
    }
    default: {
      // Samosir rises, child waves
      const isl = back(prog(lf, 55, 100));
      const kid = prog(lf, 110, 150);
      body = (
        <Cam f={lf} dur={dur} z0={1.25} z1={1.0} y0={-80} y1={0}>
          <Lake f={f} tod={0.55 + 0.4 * prog(lf, 0, dur)} island={isl} kid={kid} />
        </Cam>
      );
    }
  }

  const fadeOut = f > TOTAL - 20 ? (f - (TOTAL - 20)) / 20 : 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Audio src={staticFile("mix.wav")} />
      <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <rect width={1080} height={1920} fill="#fff8e8" />
        {body}
        {/* vignette */}
        <defs>
          <radialGradient id="vg" cx="50%" cy="50%" r="75%">
            <stop offset="0.6" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#1a0a24" stopOpacity={0.45} />
          </radialGradient>
        </defs>
        <rect width={1080} height={1920} fill="url(#vg)" />
        <rect width={1080} height={1920} fill="#fff" opacity={overlayFlash} />
        <rect width={1080} height={1920} fill="#fff8e8" opacity={fadeIn} />
        <rect width={1080} height={1920} fill="#1a0a24" opacity={fadeOut} />
      </svg>
    </AbsoluteFill>
  );
};
