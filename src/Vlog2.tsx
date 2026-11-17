import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { VLOG2_WORDS } from "./vlog2Words";

export const VLOG2_TOTAL = 2001; // 66.69s @ 30fps
const FONT = "'Segoe UI Black','Arial Black',Impact,sans-serif";
const HEAD = "Impact,'Arial Narrow Bold','Arial Black',sans-serif";
const EMOJI = "'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
const RED = "#ff4d6d";
const GREEN = "#3dff8a";
const GOLD = "#ffd84d";
const CYAN = "#38c8ff";

// ---------- helpers ----------
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (x: number) => x * x * (3 - 2 * x);
const easeOut = (x: number) => 1 - Math.pow(1 - clamp(x, 0, 1), 3);
const sub = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a), 0, 1));
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const back = (x: number) => {
  const c = 1.7;
  const u = clamp(x, 0, 1) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const popS = (t: number, t0: number, d = 0.35) => (t < t0 ? 0 : back((t - t0) / d));
const stroke = (c = "#000", w = 8): React.CSSProperties => ({ WebkitTextStroke: `${w}px ${c}`, paintOrder: "stroke fill" });

// ---------- camera: smooth punch-in between sentences ----------
const SEG = [0, 4.7, 8.7, 15.2, 22.1, 27.8, 33.1, 38.5, 43.9, 48.4, 53.7, 60.3];
const LVL = [1.0, 1.15, 1.0, 1.2, 1.05, 1.22, 1.0, 1.18, 1.05, 1.22, 1.0, 1.14];
const WIPES = [15.2, 27.8, 38.5, 48.4, 60.3];
const TRANS = 0.45;

const camera = (t: number) => {
  let i = 0;
  for (let k = 0; k < SEG.length; k++) if (SEG[k] <= t) i = k;
  const k = ease(clamp((t - SEG[i]) / TRANS, 0, 1));
  const prev = i === 0 ? LVL[0] : LVL[i - 1];
  const next = SEG[i + 1] ?? 66.69;
  const drift = 0.03 * clamp((t - SEG[i]) / (next - SEG[i]), 0, 1);
  const z = lerp(prev, LVL[i], k) + drift;
  const blur = i === 0 ? 0 : Math.sin(Math.PI * k) * 7;
  return { z, blur };
};

// ---------- subtitles (small, 2-3 word chunks) ----------
type Chunk = { s: number; e: number; words: string[] };
const buildChunks = (): Chunk[] => {
  const out: Chunk[] = [];
  let cur: { s: number; e: number; words: string[] } | null = null;
  VLOG2_WORDS.forEach((w, i) => {
    const prev = VLOG2_WORDS[i - 1];
    const chars = cur ? cur.words.join(" ").length + w.w.length : 0;
    if (!cur || cur.words.length >= 3 || chars > 19 || prev?.p || w.s - prev.e > 0.45) {
      if (cur) out.push(cur);
      cur = { s: w.s, e: w.e, words: [] };
    }
    cur.words.push(w.w);
    cur.e = w.e;
  });
  if (cur) out.push(cur);
  out.forEach((c, i) => {
    const nx = out[i + 1]?.s ?? c.e + 0.5;
    c.e = Math.min(Math.max(c.e + 0.12, c.s + 0.4), nx > c.e ? nx : c.e + 0.2);
  });
  return out;
};
const CHUNKS = buildChunks();
const HI: Record<string, string> = {
  KAYA: GOLD, KEKAYAAN: GOLD, SUKSES: GOLD, MILIAR: GOLD, BAREWNG: GOLD, BARENG: GOLD,
  MISKIN: RED, BAWAH: RED, INSTAN: RED,
  PROSES: GREEN, PROSESNYA: GREEN, HUMBLE: GREEN, PERCAYA: GREEN, ATAS: GREEN, STEP: GREEN,
};

const Subtitle: React.FC<{ t: number }> = ({ t }) => {
  const c = CHUNKS.find((x) => t >= x.s && t < x.e);
  if (!c) return null;
  const lt = t - c.s;
  const sc = 0.88 + 0.12 * back(lt / 0.16);
  return (
    <div style={{ position: "absolute", left: 60, width: 960, top: 1430, display: "flex", justifyContent: "center", opacity: clamp(lt / 0.06, 0, 1) }}>
      <div style={{ transform: `scale(${sc})`, fontFamily: FONT, fontSize: 56, letterSpacing: 1, textTransform: "uppercase", textAlign: "center", whiteSpace: "nowrap", textShadow: "0 4px 10px #000a", ...stroke("#000", 9) }}>
        {c.words.map((w, i) => {
          const col = HI[w.toUpperCase()];
          return (
            <span key={i} style={{ color: col ?? "#fff", marginRight: i < c.words.length - 1 ? 16 : 0 }}>
              {w}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---------- building blocks ----------
type ShowProps = { t: number; a: number; b: number; x: number; y: number; from?: "top" | "left" | "right" | "bottom" | "none"; s0?: number; children: React.ReactNode };
const Show: React.FC<ShowProps> = ({ t, a, b, x, y, from = "top", s0 = 0.3, children }) => {
  if (t < a || t > b + 0.35) return null;
  const enter = popS(t, a, 0.42);
  const exit = sub(t, b, b + 0.3);
  const d = (1 - clamp(enter, 0, 1)) * 140;
  const dx = from === "left" ? -d : from === "right" ? d : 0;
  const dy = from === "top" ? -d : from === "bottom" ? d : 0;
  const sc = lerp(s0, 1, enter) * (1 - exit * 0.3);
  return (
    <div style={{ position: "absolute", left: x, top: y, transform: `translate(${dx}px, ${dy}px) scale(${sc})`, opacity: clamp((t - a) / 0.1, 0, 1) * (1 - exit) }}>
      {children}
    </div>
  );
};
const Pill: React.FC<{ accent: string; children: React.ReactNode; size?: number }> = ({ accent, children, size = 50 }) => (
  <div
    style={{
      display: "inline-flex", alignItems: "center", gap: 18, padding: "14px 32px", borderRadius: 999,
      background: "rgba(8,10,28,.80)", border: `3px solid ${accent}`, boxShadow: `0 0 26px ${accent}66, 0 10px 24px #0007`,
      fontFamily: FONT, fontSize: size, color: "#fff", whiteSpace: "nowrap", ...stroke("#000", 6),
    }}
  >
    {children}
  </div>
);
const Panel: React.FC<{ w: number; h: number; accent: string; children: React.ReactNode }> = ({ w, h, accent, children }) => (
  <div style={{ width: w, height: h, position: "relative", boxSizing: "border-box", borderRadius: 36, border: `3px solid ${accent}`, background: "rgba(8,10,28,.80)", boxShadow: `0 0 30px ${accent}55, 0 14px 30px #0008`, fontFamily: FONT, color: "#fff" }}>{children}</div>
);
const Emo: React.FC<{ size: number; children: string; style?: React.CSSProperties }> = ({ size, children, style }) => (
  <span style={{ fontFamily: EMOJI, fontSize: size, lineHeight: 1, ...style }}>{children}</span>
);
const Abs: React.FC<{ x: number; y: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ x, y, children, style }) => (
  <div style={{ position: "absolute", left: x, top: y, ...style }}>{children}</div>
);

const Confetti: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  if (t < t0 || t > t0 + 3.2) return null;
  const lt = t - t0;
  const cols = [GOLD, RED, CYAN, GREEN, "#fff"];
  return (
    <>
      {Array.from({ length: 46 }, (_, i) => (
        <div key={i} style={{ position: "absolute", left: rnd(i + 1) * 1080 + (rnd(i + 90) - 0.5) * 200 * lt, top: -40 + lt * (260 + rnd(i + 40) * 420) * (0.6 + lt * 0.2), width: 14 + rnd(i) * 10, height: 8 + rnd(i + 5) * 8, background: cols[i % cols.length], transform: `rotate(${lt * (200 + rnd(i) * 500)}deg)`, borderRadius: 3, opacity: 1 - sub(t, t0 + 2.4, t0 + 3.2) }} />
      ))}
    </>
  );
};

// ---------- main ----------
export const Vlog2: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const cam = camera(t);

  // hook iris
  const irisK = easeOut(t / 0.8);
  const irisR = irisK * 1700;
  const hookZoom = 1 + 0.4 * (1 - easeOut(t / 1.1));
  const irisDone = t > 0.85;

  // wipes: light sweep + soft flash
  const wipe = WIPES.find((w) => t >= w - 0.05 && t <= w + 0.55);
  const wk = wipe !== undefined ? (t - (wipe - 0.05)) / 0.6 : 0;

  return (
    <AbsoluteFill style={{ background: "#04050d", overflow: "hidden" }}>
      <AbsoluteFill style={{ clipPath: irisDone ? undefined : `circle(${irisR}px at 540px 700px)` }}>
        <AbsoluteFill style={{ transform: `scale(${cam.z * hookZoom})`, transformOrigin: "50% 36%", filter: cam.blur > 0.2 ? `blur(${cam.blur}px)` : undefined }}>
          <OffthreadVideo src={staticFile("vlog2/src.mp4")} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        </AbsoluteFill>
      </AbsoluteFill>
      <Audio src={staticFile("vlog2/mix.wav")} />

      {/* iris ring */}
      {t < 0.9 ? (
        <div style={{ position: "absolute", left: 540 - irisR, top: 700 - irisR, width: irisR * 2, height: irisR * 2, borderRadius: "50%", boxSizing: "border-box", border: `${14 - irisK * 10}px solid #fff`, boxShadow: "0 0 60px #fff, inset 0 0 60px #fff8", opacity: 1 - sub(t, 0.45, 0.9) }} />
      ) : null}

      {/* top readability gradient */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 640, background: "linear-gradient(180deg, rgba(4,5,18,.62), rgba(4,5,18,0))", opacity: irisDone ? 1 : 0 }} />

      {/* ---- hook (0.5 - 3.4) ---- */}
      <Show t={t} a={0.55} b={3.4} x={90} y={110} s0={2.4} from="none">
        <div style={{ width: 900, textAlign: "center", transform: `translateX(${t > 0.7 && t < 1.0 ? Math.sin(t * 90) * 7 : 0}px)` }}>
          <div style={{ fontFamily: FONT, fontSize: 66, color: "#fff", letterSpacing: 4, ...stroke("#000", 9) }}>PENGEN CEPET</div>
          <div style={{ fontFamily: HEAD, fontSize: 330, lineHeight: 0.9, color: GOLD, letterSpacing: 4, ...stroke("#000", 16), textShadow: `0 0 60px ${GOLD}99` }}>KAYA?</div>
        </div>
      </Show>
      {t > 0.85 && t < 3.6
        ? ["💸", "💰", "🤑", "💎", "💵", "🪙"].map((e, i) => {
            const k = easeOut((t - 0.85) / 1.2);
            const ang = (i / 6) * Math.PI * 2 + 0.4;
            return <Emo key={i} size={80} style={{ position: "absolute", left: 500 + Math.cos(ang) * (190 + k * 380), top: 300 + Math.sin(ang) * (90 + k * 150), opacity: 1 - sub(t, 2.6, 3.4), transform: `rotate(${k * 40 * (i % 2 ? 1 : -1)}deg) scale(${0.6 + k * 0.5})` }}>{e}</Emo>;
          })
        : null}

      {/* ---- 8.7: jangan cepet kaya ---- */}
      <Show t={t} a={8.75} b={15.0} x={215} y={150} from="top">
        <Pill accent={RED} size={56}><Emo size={64}>🚫</Emo>JANGAN CEPET KAYA</Pill>
      </Show>
      <Show t={t} a={12.7} b={15.0} x={300} y={270} from="top">
        <Pill accent={GOLD} size={40}><Emo size={44}>💪</Emo>SULIT BANGET</Pill>
      </Show>

      {/* ---- 15.2: stay ---- */}
      <Show t={t} a={17.1} b={21.9} x={120} y={140} from="left"><Pill accent={CYAN}><Emo size={54}>⏳</Emo>STAY PROSES</Pill></Show>
      <Show t={t} a={18.1} b={21.9} x={120} y={248} from="left"><Pill accent={GREEN}><Emo size={54}>🙏</Emo>STAY HUMBLE</Pill></Show>
      <Show t={t} a={19.5} b={21.9} x={120} y={356} from="left"><Pill accent={GOLD}><Emo size={54}>🤝</Emo>JAGA KEPERCAYAAN</Pill></Show>

      {/* ---- 22.1: step by step ---- */}
      <Show t={t} a={22.9} b={27.7} x={160} y={120} from="top">
        <Panel w={760} h={360} accent={GREEN}>
          <Abs x={30} y={18}><span style={{ fontSize: 44, ...stroke("#000", 6) }}>STEP BY STEP</span></Abs>
          {[23.41, 23.71, 23.87, 24.15].map((ts, i) => (
            <div key={i} style={{ position: "absolute", left: 60 + i * 165, bottom: 28, width: 150, height: (i + 1) * 62, background: `linear-gradient(180deg, ${GREEN}, #12a85a)`, borderRadius: "14px 14px 4px 4px", transformOrigin: "bottom", transform: `scaleY(${popS(t, ts, 0.3)})` }} />
          ))}
          {t >= 23.41 ? (() => {
            const idx = t >= 24.15 ? 3 : t >= 23.87 ? 2 : t >= 23.71 ? 1 : 0;
            return <Emo size={74} style={{ position: "absolute", left: 90 + idx * 165, bottom: 28 + (idx + 1) * 62 + 4 }}>🧗</Emo>;
          })() : null}
          <Abs x={455} y={22}>
            <span style={{ fontSize: 40, color: RED, opacity: clamp((t - 26.57) / 0.15, 0, 1), ...stroke("#000", 6) }}>BUKAN INSTAN</span>
          </Abs>
          <Emo size={96} style={{ position: "absolute", right: 40, top: 70, transform: `scale(${popS(t, 27.43, 0.3)})` }}>❌</Emo>
        </Panel>
      </Show>

      {/* ---- 27.8: cepet naik, cepet turun ---- */}
      <Show t={t} a={28.6} b={33.0} x={160} y={120} from="top">
        <Panel w={760} h={360} accent={GOLD}>
          <svg width="760" height="360" style={{ position: "absolute", left: 0, top: 0 }}>
            <line x1="46" y1="320" x2="715" y2="320" stroke="#fff3" strokeWidth="4" />
            <line x1="46" y1="320" x2="46" y2="60" stroke="#fff3" strokeWidth="4" />
            <line x1="60" y1="310" x2="400" y2="90" stroke={GREEN} strokeWidth="14" strokeLinecap="round" strokeDasharray="410" strokeDashoffset={410 * (1 - sub(t, 29.99, 30.84))} />
            <line x1="400" y1="90" x2="670" y2="305" stroke={RED} strokeWidth="14" strokeLinecap="round" strokeDasharray="350" strokeDashoffset={350 * (1 - sub(t, 31.6, 32.65))} />
          </svg>
          <Abs x={70} y={20}><span style={{ fontSize: 38, color: GREEN, opacity: clamp((t - 30.27) / 0.15, 0, 1), ...stroke("#000", 6) }}>CEPET NAIK</span></Abs>
          <Abs x={455} y={20}><span style={{ fontSize: 38, color: RED, opacity: clamp((t - 32.03) / 0.15, 0, 1), ...stroke("#000", 6) }}>CEPET TURUN</span></Abs>
        </Panel>
      </Show>

      {/* ---- 33.1: percaya proses ---- */}
      <Show t={t} a={33.3} b={38.4} x={310} y={110} from="top">
        <Panel w={460} h={420} accent={CYAN}>
          <svg width="460" height="420" style={{ position: "absolute", left: 0, top: 0 }}>
            <circle cx="230" cy="190" r="120" fill="none" stroke="#fff2" strokeWidth="22" />
            <circle cx="230" cy="190" r="120" fill="none" stroke={CYAN} strokeWidth="22" strokeLinecap="round" strokeDasharray={2 * Math.PI * 120} strokeDashoffset={2 * Math.PI * 120 * (1 - sub(t, 33.35, 38.3))} transform="rotate(-90 230 190)" />
          </svg>
          <Emo size={110} style={{ position: "absolute", left: 175, top: 135, transform: `rotate(${Math.sin(t * 3) * 10}deg)` }}>⏳</Emo>
          <Abs x={0} y={345} style={{ width: 460, textAlign: "center" }}><span style={{ fontSize: 42, ...stroke("#000", 6) }}>PERCAYA PROSES</span></Abs>
        </Panel>
      </Show>

      {/* ---- 38.5: 1 tahun != miliarder ---- */}
      <Show t={t} a={43.39} b={48.3} x={70} y={150} from="left"><Pill accent={CYAN} size={54}><Emo size={58}>📅</Emo>1 TAHUN</Pill></Show>
      <Show t={t} a={45.05} b={48.3} x={470} y={150} from="right"><Pill accent={GOLD} size={54}><Emo size={58}>💰</Emo>MILIARDER</Pill></Show>
      {t > 45.0 && t < 48.6 ? (
        <Emo size={150} style={{ position: "absolute", left: 435 - 10, top: 130 + 10, opacity: popS(t, 45.95, 0.25) * (1 - sub(t, 48.3, 48.6)), transform: `scale(${popS(t, 45.95, 0.25)}) rotate(-8deg)` }}>❌</Emo>
      ) : null}
      <Show t={t} a={47.63} b={53.6} x={420} y={310} from="bottom"><Pill accent="#b58cff" size={42}><Emo size={48}>🔮</Emo>DUKUN?</Pill></Show>

      {/* ---- 48.4: timeline 3 / 5 / 10 tahun ---- */}
      <Show t={t} a={52.5} b={60.1} x={160} y={140} from="top">
        <Panel w={760} h={300} accent={GREEN}>
          <div style={{ position: "absolute", left: 70, top: 160, height: 10, borderRadius: 5, width: 620 * sub(t, 52.5, 55.2), background: `linear-gradient(90deg, ${CYAN}, ${GREEN})` }} />
          {[{ x: 130, tt: 54.81, l: "3 TAHUN" }, { x: 340, tt: 52.83, l: "5 TAHUN" }, { x: 620, tt: 53.73, l: "10 TAHUN" }].map((n, i) => (
            <div key={i} style={{ position: "absolute", left: n.x - 70, top: 120, width: 140, textAlign: "center", transform: `scale(${popS(t, n.tt, 0.3)})` }}>
              <div style={{ width: 36, height: 36, borderRadius: 18, background: GOLD, margin: "0 auto", border: "5px solid #fff", boxShadow: `0 0 20px ${GOLD}` }} />
              <div style={{ fontSize: 30, marginTop: 14, ...stroke("#000", 5) }}>{n.l}</div>
            </div>
          ))}
          <Emo size={80} style={{ position: "absolute", left: 640, top: 22, transform: `scale(${popS(t, 57.15, 0.35)})` }}>🏆</Emo>
          <Abs x={40} y={26}><span style={{ fontSize: 40, color: GREEN, opacity: clamp((t - 56.07) / 0.2, 0, 1), ...stroke("#000", 6) }}>PERCAYA + USAHA</span></Abs>
        </Panel>
      </Show>

      {/* ---- outro ---- */}
      <Show t={t} a={63.43} b={70} x={300} y={140} from="top"><Pill accent={CYAN} size={46}><Emo size={50}>👋</Emo>SEE YOU</Pill></Show>
      <Show t={t} a={64.51} b={70} x={175} y={250} from="top" s0={0.2}><Pill accent={GOLD} size={64}><Emo size={70}>🤝</Emo>SUKSES BARENG</Pill></Show>
      <Confetti t={t} t0={64.63} />

      {/* ---- section wipes: light sweep + flash ---- */}
      {wipe !== undefined ? (
        <>
          <div style={{ position: "absolute", top: -100, left: lerp(-400, 1500, easeOut(wk)), width: 260, height: 2200, transform: "skewX(-18deg)", background: "linear-gradient(90deg, transparent, rgba(255,230,140,.85), transparent)", filter: "blur(10px)" }} />
          <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: 0.28 * Math.sin(Math.PI * clamp(wk * 1.6, 0, 1)) }} />
        </>
      ) : null}

      {/* hook flash */}
      <div style={{ position: "absolute", inset: 0, background: "#fff", opacity: t > 0.7 && t < 0.95 ? 0.55 * (1 - (t - 0.7) / 0.25) : 0 }} />

      <Subtitle t={t} />

      {/* progress line */}
      <div style={{ position: "absolute", left: 0, top: 0, width: (t / 66.69) * 1080, height: 6, background: `linear-gradient(90deg, ${CYAN}, ${GOLD})` }} />
    </AbsoluteFill>
  );
};
