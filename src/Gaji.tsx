import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame } from "remotion";

export const GAJI_TOTAL = 1981; // 66.04s @ 30fps
const FONT = "'Segoe UI Black','Arial Black',Impact,sans-serif";
const EMOJI = "'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',sans-serif";
const RED = "#ff4d6d";
const GREEN = "#3dff8a";
const GOLD = "#ffd84d";
const CYAN = "#38c8ff";
const PURPLE = "#b58cff";

// ---------- helpers ----------
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const ease = (x: number) => x * x * (3 - 2 * x);
const sub = (t: number, a: number, b: number) => ease(clamp((t - a) / (b - a), 0, 1));
const lerp = (a: number, b: number, x: number) => a + (b - a) * x;
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const back = (x: number) => {
  const c = 1.9;
  const u = clamp(x, 0, 1) - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};
const popS = (t: number, t0: number, d = 0.35) => (t < t0 ? 0 : back((t - t0) / d));
const stroke = (c = "#000", w = 8): React.CSSProperties => ({ WebkitTextStroke: `${w}px ${c}`, paintOrder: "stroke fill" });

// ---------- spoken words (seconds, read from the original captions) ----------
const WORDS: [number, string][] = [
  [0.5, "KEMBALI"], [0.75, "LAGI"], [1.0, "DI"], [1.25, "GUA"], [1.75, "KAYA"], [2.25, "DAN"], [2.5, "ELU MISKIN"],
  [3.0, "HARI"], [3.25, "INI"], [3.5, "GUA"], [4.0, "BAHAS"], [4.75, "MENGENAI"],
  [5.25, "JANGAN"], [5.75, "ADANYA"], [6.25, "GENGSI"], [7.0, "DI"], [7.25, "LU APALAGI"], [7.75, "LU"], [8.25, "UDAH"],
  [8.5, "MISKIN YA"], [8.75, "JANGAN"], [9.0, "ADA"], [9.25, "GENGSI"],
  [9.75, "CONTOHNYA"], [10.25, "PENGEN"], [10.75, "IPHONE"], [11.25, "BARU"], [11.75, "PENGEN"], [12.25, "BELI"],
  [12.5, "KENDARAAN"], [13.5, "BARU"], [14.5, "YANG"], [14.75, "BARU"], [15.0, "PENGENNYA"], [16.0, "SEMUANYA"],
  [17.25, "ITU"], [17.5, "HASIL"], [17.75, "NYICIL"],
  [18.25, "JANGAN"], [19.0, "TEMAN-TEMAN"], [20.25, "ITU"], [20.75, "SAMA"], [21.0, "AJA"], [21.25, "MEMATIKAN"],
  [22.0, "KONDISI"], [22.75, "KEUANGAN"], [23.25, "KALIAN"],
  [23.75, "LU"], [24.0, "KALAU"], [24.25, "UDAH"], [24.5, "DAPAT"], [24.75, "GAJI"], [25.75, "JANGAN"], [26.25, "PENGEN"],
  [26.75, "APA-APA"], [27.25, "BARU"], [27.5, "LU"], [27.75, "HARUS"], [28.0, "BISA"], [28.25, "SIMPAN"],
  [29.25, "BAGAIMANA"], [29.75, "BISA"], [30.0, "INVESTASIKAN"], [30.75, "DUIT"], [31.0, "ITU"], [31.5, "DAN"],
  [32.0, "BAGAIMANA"], [32.5, "BISA"], [32.75, "PUTAR"], [33.0, "DUIT"], [33.25, "ITU"], [33.5, "DAN"],
  [34.25, "LU"], [34.5, "BAKAL"], [34.75, "JADI"], [35.75, "LIHAT"], [36.25, "DI"], [36.75, "GUA"],
  [37.75, "NGGAK PEDULI"], [38.5, "KALAU"], [39.75, "MANAPUN"], [40.25, "GITU"], [41.0, "YANG"], [41.25, "PENTING"],
  [41.5, "GUA"], [41.75, "BISA"], [42.0, "MENGHASILKAN"], [42.5, "VIDEO"], [42.75, "YANG"], [43.0, "BAIK"],
  [43.75, "DENGAN"], [44.0, "GUA"], [44.25, "YAPING"], [44.75, "DENGAN"], [45.0, "BAIK"], [45.5, "SAMA-SAMA"],
  [46.0, "MEMBANGUN"], [46.5, "KUALITAS"], [47.0, "GUA"], [47.5, "SENDIRI"], [47.75, "BUAT"], [48.0, "PRIBADI"],
  [48.5, "DAN"], [49.0, "BISA"], [49.5, "SAMA-SAMA"], [50.0, "MENGAJAK"], [50.25, "UNTUK"], [50.75, "TEMAN-TEMAN"],
  [51.25, "SUKSES"], [52.0, "BARENG"], [52.25, "DI"], [52.5, "MASA"], [53.0, "PERCAYA"],
  [53.75, "KALAU"], [54.25, "GENGSINYA"], [55.0, "MATIKAN"], [55.5, "NGGAK"], [55.75, "USAH"], [56.0, "PERLU"],
  [56.25, "DENGERIN"], [56.75, "OMONGAN"], [57.0, "KANAN"], [57.5, "KIRI"], [57.75, "ORANG"], [58.0, "LAIN"],
  [58.75, "GUE"], [59.0, "YAKIN"], [59.5, "PASTI"], [60.0, "DIRI"], [60.25, "BISA"], [60.75, "UP"],
  [61.5, "BISA"], [62.0, "MAKIN"], [62.5, "MAJU"], [63.25, "POKOKNYA"], [64.5, "SUKSES"], [65.5, "SITU"], [65.75, "AJA"],
];

const KW: Record<string, string> = {
  GENGSI: RED, GENGSINYA: RED, MISKIN: RED, "ELU MISKIN": RED, "MISKIN YA": RED, NYICIL: RED, MEMATIKAN: RED, MATIKAN: RED,
  KAYA: GOLD, KEUANGAN: GOLD, PASTI: GOLD, SUKSES: GOLD, PERCAYA: GOLD,
  GAJI: GREEN, SIMPAN: GREEN, INVESTASIKAN: GREEN, DUIT: GREEN, PUTAR: GREEN, MAJU: GREEN, UP: GREEN, YAKIN: GREEN, MAKIN: GREEN,
  IPHONE: CYAN, KENDARAAN: CYAN, VIDEO: CYAN, KUALITAS: CYAN, PRIBADI: CYAN,
};

// emphasis beats -> small camera punch (keep in sync with scripts/make-gaji-audio.mjs where relevant)
const PUNCH = [6.25, 10.75, 12.5, 17.75, 21.25, 24.75, 28.25, 30.0, 32.75, 37.75, 42.0, 46.0, 50.0, 55.0, 59.0, 62.0, 63.25];

// ---------- building blocks ----------
type ShowProps = {
  t: number; a: number; b: number; x: number; y: number;
  from?: "top" | "left" | "right" | "bottom" | "none";
  s0?: number; rot?: number; children: React.ReactNode;
};
const Show: React.FC<ShowProps> = ({ t, a, b, x, y, from = "top", s0 = 0, rot = 0, children }) => {
  if (t < a || t > b + 0.35) return null;
  const enter = popS(t, a, 0.42);
  const exit = sub(t, b, b + 0.3);
  const d = (1 - clamp(enter, 0, 1)) * 260;
  const dx = from === "left" ? -d : from === "right" ? d : 0;
  const dy = from === "top" ? -d : from === "bottom" ? d : 0;
  const sc = lerp(s0, 1, enter) * (1 - exit * 0.35);
  return (
    <div
      style={{
        position: "absolute", left: x, top: y,
        transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate(${rot}deg)`,
        opacity: clamp((t - a) / 0.1, 0, 1) * (1 - exit),
      }}
    >
      {children}
    </div>
  );
};

const Card: React.FC<{ w: number; h: number; accent: string; row?: boolean; gap?: number; children: React.ReactNode }> = ({ w, h, accent, row, gap = 24, children }) => (
  <div
    style={{
      width: w, height: h, boxSizing: "border-box", borderRadius: 44, border: `7px solid ${accent}`,
      background: "linear-gradient(145deg, rgba(24,28,66,.95), rgba(10,12,32,.95))",
      boxShadow: `0 0 50px ${accent}88, 0 18px 40px #0008`,
      display: "flex", flexDirection: row ? "row" : "column", alignItems: "center", justifyContent: "center",
      gap, fontFamily: FONT, color: "#fff", textAlign: "center", position: "relative",
    }}
  >
    {children}
  </div>
);
const Emo: React.FC<{ size: number; children: string; style?: React.CSSProperties }> = ({ size, children, style }) => (
  <span style={{ fontFamily: EMOJI, fontSize: size, lineHeight: 1, ...style }}>{children}</span>
);

// ---------- confetti / coins ----------
const Confetti: React.FC<{ t: number; t0: number }> = ({ t, t0 }) => {
  if (t < t0) return null;
  const lt = t - t0;
  const cols = [GOLD, RED, CYAN, GREEN, "#fff", PURPLE];
  return (
    <>
      {Array.from({ length: 70 }, (_, i) => {
        const x0 = rnd(i + 1) * 1080;
        const vx = (rnd(i + 90) - 0.5) * 380;
        const vy = 300 + rnd(i + 40) * 520;
        const y = -60 + lt * vy * (0.55 + lt * 0.25);
        const x = x0 + vx * lt + Math.sin(lt * 5 + i) * 30;
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, width: 18 + rnd(i) * 14, height: 10 + rnd(i + 5) * 12, background: cols[i % cols.length], transform: `rotate(${lt * (200 + rnd(i) * 500)}deg)`, borderRadius: 3 }} />
        );
      })}
    </>
  );
};
const CoinRain: React.FC<{ t: number; a: number; b: number }> = ({ t, a, b }) => {
  if (t < a || t > b) return null;
  const k = clamp(Math.min((t - a) / 0.5, (b - t) / 0.5), 0, 1);
  return (
    <div style={{ opacity: k }}>
      {Array.from({ length: 16 }, (_, i) => {
        const left = i % 2 === 0 ? 4 + rnd(i) * 80 : 976 + rnd(i) * 80;
        const sp = 0.25 + rnd(i + 3) * 0.3;
        const y = ((t * sp + rnd(i + 7)) % 1) * 1500 - 80;
        return <Emo key={i} size={46 + rnd(i + 2) * 30} style={{ position: "absolute", left, top: y, transform: `rotate(${t * 120 + i * 40}deg)` }}>🪙</Emo>;
      })}
    </div>
  );
};

// ---------- caption ----------
const Caption: React.FC<{ t: number }> = ({ t }) => {
  let idx = -1;
  for (let i = 0; i < WORDS.length; i++) if (WORDS[i][0] <= t) idx = i;
  if (idx < 0) return null;
  const [s, w] = WORDS[idx];
  const next = WORDS[idx + 1]?.[0] ?? s + 0.8;
  if (t > Math.min(next, s + 0.9) + 0.04) return null;
  const col = KW[w] ?? "#fff";
  const lt = t - s;
  const sc = 0.65 + 0.35 * popS(lt, 0, 0.16);
  const big = KW[w] ? 1.1 : 1;
  const len = w.length;
  const fs = Math.min(128, 1000 / Math.max(5, len * 0.62)) * big;
  return (
    <div style={{ position: "absolute", left: 0, width: 1080, top: 1372, height: 190, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          fontFamily: FONT, fontSize: fs, color: col, transform: `scale(${sc})`, whiteSpace: "nowrap",
          letterSpacing: 2, textShadow: `0 6px 0 #0007, 0 0 ${KW[w] ? 28 : 0}px ${col}aa`, ...stroke("#000", 12),
        }}
      >
        {w}
      </div>
    </div>
  );
};

// ---------- main ----------
export const Gaji: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / 30;

  let zoom = 1.02 + 0.015 * Math.sin(t * 0.7);
  for (const p of PUNCH) if (t >= p) zoom += 0.045 * Math.exp(-(t - p) * 7);

  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {/* base video + caption cover bar, zooming together */}
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: "50% 42%" }}>
        <OffthreadVideo src={staticFile("gaji/src.mp4")} style={{ width: 1080, height: 1920, objectFit: "cover" }} />
        <div style={{ position: "absolute", left: -20, width: 1120, top: 1368, height: 198, background: "linear-gradient(180deg, #0a0c1e, #060816)", borderTop: `5px solid ${GOLD}`, borderBottom: `5px solid ${RED}` }} />
      </AbsoluteFill>
      <Audio src={staticFile("gaji/mix.wav")} />

      {/* readability gradient behind the graphics */}
      <div style={{ position: "absolute", left: 0, top: 0, width: 1080, height: 780, background: "linear-gradient(180deg, rgba(5,6,20,.72), rgba(5,6,20,0))" }} />

      {/* progress line */}
      <div style={{ position: "absolute", left: 0, top: 0, width: (t / 66.04) * 1080, height: 10, background: `linear-gradient(90deg, ${RED}, ${GOLD}, ${GREEN})` }} />

      {/* ---- A: intro ---- */}
      <Show t={t} a={0.2} b={4.6} x={90} y={150}>
        <Card w={900} h={250} accent={GOLD} row>
          <Emo size={130}>💰</Emo>
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 98, color: GOLD, ...stroke("#000", 10) }}>GUA KAYA</div>
            <div style={{ fontSize: 60, ...stroke("#000", 8) }}>DAN ELU MISKIN</div>
          </div>
        </Card>
      </Show>

      <Show t={t} a={5.2} b={10.0} x={90} y={120}>
        <Card w={900} h={400} accent={RED}>
          <div style={{ fontSize: 66, ...stroke("#000", 8) }}>JANGAN ADA</div>
          <div style={{ position: "relative", height: 210 }}>
            <div
              style={{
                fontSize: 200, color: RED, lineHeight: 1, ...stroke("#000", 14),
                transform: `scale(${popS(t, 6.25, 0.3)}) translateX(${t > 6.25 && t < 7.0 ? Math.sin(t * 80) * 8 : 0}px)`,
              }}
            >
              GENGSI
            </div>
            <div style={{ position: "absolute", left: -20, top: 92, height: 26, borderRadius: 13, background: "#fff", border: `6px solid ${RED}`, width: 590 * sub(t, 7.0, 7.4), transform: "rotate(-7deg)", transformOrigin: "left center" }} />
          </div>
        </Card>
      </Show>

      {/* ---- B: cicilan ---- */}
      <Show t={t} a={10.7} b={18.4} x={40} y={130} from="left">
        <Card w={480} h={390} accent={CYAN}>
          <Emo size={170}>📱</Emo>
          <div style={{ fontSize: 52, lineHeight: 1.05, ...stroke("#000", 7) }}>IPHONE<br />BARU</div>
        </Card>
      </Show>
      <Show t={t} a={12.45} b={18.4} x={560} y={130} from="right">
        <Card w={480} h={390} accent={GOLD}>
          <Emo size={170}>🚗</Emo>
          <div style={{ fontSize: 46, lineHeight: 1.05, ...stroke("#000", 7) }}>KENDARAAN<br />BARU</div>
        </Card>
      </Show>
      <Show t={t} a={17.5} b={18.4} x={190} y={345} s0={2.6} rot={-9} from="none">
        <div style={{ padding: "4px 40px", border: `14px solid ${RED}`, borderRadius: 28, background: "rgba(25,0,6,.85)", color: RED, fontFamily: FONT, fontSize: 130, ...stroke("#000", 10), boxShadow: `0 0 70px ${RED}` }}>NYICIL!</div>
      </Show>

      {/* ---- C: kondisi keuangan ---- */}
      {(() => {
        const k = sub(t, 21.25, 23.3);
        const shake = k > 0 && k < 1 ? Math.sin(t * 90) * 5 : 0;
        return (
          <Show t={t} a={18.4} b={24.0} x={70} y={130}>
            <Card w={940} h={400} accent={GOLD}>
              <div style={{ fontSize: 60, ...stroke("#000", 8) }}>KONDISI KEUANGAN</div>
              <div style={{ width: 800, height: 80, borderRadius: 40, background: "#0006", border: "5px solid #fff3", overflow: "hidden", transform: `translateX(${shake}px)` }}>
                <div style={{ width: 800 * (1 - k * 0.93), height: "100%", borderRadius: 40, background: `hsl(${lerp(130, 0, k)}, 92%, 54%)`, boxShadow: `0 0 30px hsl(${lerp(130, 0, k)}, 92%, 54%)` }} />
              </div>
              <div style={{ display: "flex", gap: 30, alignItems: "center" }}>
                <Emo size={84} style={{ transform: `translateY(${k * 14}px)` }}>📉</Emo>
                <div style={{ fontSize: 80, color: k > 0.6 ? RED : GREEN, ...stroke("#000", 9) }}>{Math.round(100 - k * 93)}%</div>
                {k > 0.9 ? <Emo size={84}>💀</Emo> : null}
              </div>
            </Card>
          </Show>
        );
      })()}

      {/* ---- D: gaji -> simpan, investasi, putar ---- */}
      <Show t={t} a={24.3} b={27.9} x={90} y={130} from="left">
        <Card w={900} h={170} accent={GREEN} row>
          <Emo size={100}>💵</Emo>
          <div style={{ fontSize: 76, ...stroke("#000", 9) }}>DAPAT GAJI</div>
        </Card>
      </Show>
      <Show t={t} a={25.75} b={27.9} x={90} y={330} from="right">
        <Card w={900} h={170} accent={RED} row>
          <Emo size={90}>🛍️</Emo>
          <div style={{ fontSize: 56, ...stroke("#000", 8) }}>JANGAN PENGEN<br />YANG BARU</div>
          <Emo size={90}>🚫</Emo>
        </Card>
      </Show>
      {[
        { a: 28.1, y: 110, c: GREEN, e: "🏦", l: "SIMPAN", n: "1" },
        { a: 29.9, y: 250, c: CYAN, e: "📈", l: "INVESTASI", n: "2" },
        { a: 32.6, y: 390, c: GOLD, e: "🔄", l: "PUTAR DUIT", n: "3" },
      ].map((s) => (
        <Show key={s.n} t={t} a={s.a} b={36.3} x={90} y={s.y} from="left">
          <Card w={900} h={124} accent={s.c} row gap={30}>
            <div style={{ width: 80, height: 80, borderRadius: 40, background: s.c, color: "#000", fontSize: 54, display: "flex", alignItems: "center", justifyContent: "center" }}>{s.n}</div>
            <Emo size={80}>{s.e}</Emo>
            <div style={{ fontSize: 68, ...stroke("#000", 8) }}>{s.l}</div>
          </Card>
        </Show>
      ))}
      <CoinRain t={t} a={29.0} b={36.3} />

      {/* ---- E: nggak peduli ---- */}
      <Show t={t} a={37.4} b={41.8} x={90} y={130}>
        <Card w={900} h={380} accent={PURPLE}>
          <Emo size={160} style={{ transform: `rotate(${Math.sin(t * 8) * 8}deg)` }}>🤷</Emo>
          <div style={{ fontSize: 100, ...stroke("#000", 10) }}>NGGAK PEDULI</div>
        </Card>
      </Show>

      {/* ---- F: bangun kualitas, sukses bareng ---- */}
      <Show t={t} a={41.9} b={45.9} x={90} y={140} from="right">
        <Card w={900} h={320} accent={CYAN} row gap={34}>
          <Emo size={150}>🎬</Emo>
          <div style={{ fontSize: 76, lineHeight: 1.05, textAlign: "left", ...stroke("#000", 9) }}>VIDEO<br />YANG BAIK</div>
        </Card>
      </Show>
      <Show t={t} a={45.9} b={50.1} x={90} y={140} from="left">
        <Card w={900} h={320} accent={PURPLE} row gap={34}>
          <Emo size={150} style={{ transform: `scale(${1 + Math.sin(t * 6) * 0.06})` }}>💎</Emo>
          <div style={{ fontSize: 76, lineHeight: 1.05, textAlign: "left", ...stroke("#000", 9) }}>BANGUN<br />KUALITAS</div>
        </Card>
      </Show>
      <Show t={t} a={50.1} b={53.7} x={90} y={140} from="right">
        <Card w={900} h={320} accent={GOLD} row gap={34}>
          <Emo size={150}>🤝</Emo>
          <div style={{ fontSize: 76, lineHeight: 1.05, textAlign: "left", ...stroke("#000", 9) }}>SUKSES<br />BARENG</div>
        </Card>
      </Show>

      {/* ---- G: matikan gengsi ---- */}
      {(() => {
        const k = sub(t, 55.0, 55.18);
        return (
          <Show t={t} a={54.3} b={56.2} x={90} y={130}>
            <Card w={900} h={300} accent={k > 0.5 ? "#9aa" : GREEN} row gap={50}>
              <div style={{ fontSize: 100, ...stroke("#000", 10) }}>GENGSI</div>
              <div style={{ width: 280, height: 140, borderRadius: 70, background: k > 0.5 ? "#555a66" : GREEN, position: "relative", boxShadow: "inset 0 6px 14px #0006" }}>
                <div style={{ position: "absolute", top: 12, left: lerp(150, 12, k), width: 116, height: 116, borderRadius: 58, background: "#fff", boxShadow: "0 6px 14px #0007" }} />
              </div>
              <div style={{ fontSize: 66, color: k > 0.5 ? RED : GREEN, ...stroke("#000", 8) }}>{k > 0.5 ? "OFF" : "ON"}</div>
            </Card>
          </Show>
        );
      })()}

      <Show t={t} a={56.2} b={58.9} x={70} y={130}>
        <Card w={940} h={330} accent={RED}>
          <div style={{ fontSize: 64, lineHeight: 1.05, ...stroke("#000", 8) }}>OMONGAN<br />ORANG LAIN</div>
          {[0, 1, 2, 3].map((i) => {
            const k = sub(t, 57.0 + i * 0.12, 58.5);
            const dir = i % 2 === 0 ? -1 : 1;
            return (
              <Emo key={i} size={90} style={{ position: "absolute", left: 425 + dir * k * (i < 2 ? 520 : 330), top: lerp(210, 20, k) + (i < 2 ? 0 : 40), opacity: 1 - k * 0.7, transform: `rotate(${dir * k * 40}deg)` }}>💬</Emo>
            );
          })}
          <Emo size={110} style={{ position: "absolute", right: 36, bottom: 24, transform: `scale(${popS(t, 57.6, 0.3)})` }}>❌</Emo>
        </Card>
      </Show>

      <Show t={t} a={58.9} b={62.0} x={90} y={140}>
        <Card w={900} h={300} accent={GREEN} row gap={30}>
          <div style={{ fontSize: 86, lineHeight: 1.05, textAlign: "left", ...stroke("#000", 9) }}>YAKIN<br /><span style={{ color: GREEN }}>BISA UP</span></div>
          <Emo size={120} style={{ transform: `translateY(${-sub(t, 60.7, 61.6) * 8}px)` }}>⬆️</Emo>
        </Card>
      </Show>
      {t > 59 && t < 62.4 ? (
        <Emo size={150} style={{ position: "absolute", left: 790 + Math.sin(t * 9) * 12, top: lerp(1650, -120, sub(t, 59.0, 62.2)), transform: "rotate(-8deg)" }}>🚀</Emo>
      ) : null}

      <Show t={t} a={62.0} b={63.3} x={90} y={130}>
        <Card w={900} h={400} accent={GOLD}>
          <div style={{ fontSize: 100, ...stroke("#000", 10) }}>MAKIN <span style={{ color: GREEN }}>MAJU</span></div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 26, height: 170 }}>
            {[0.3, 0.5, 0.65, 0.82, 1].map((h, i) => (
              <div key={i} style={{ width: 90, height: 170 * h * sub(t, 62.05 + i * 0.1, 62.5 + i * 0.1), background: `linear-gradient(180deg, ${GREEN}, #12a85a)`, borderRadius: 14 }} />
            ))}
          </div>
        </Card>
      </Show>

      {/* ---- outro ---- */}
      <Show t={t} a={63.2} b={70} x={90} y={150} s0={0.2}>
        <Card w={900} h={420} accent={GOLD}>
          <Emo size={150} style={{ transform: `rotate(${Math.sin(t * 7) * 6}deg)` }}>🏆</Emo>
          <div style={{ fontSize: 170, color: GOLD, lineHeight: 1, ...stroke("#000", 14), textShadow: `0 0 50px ${GOLD}` }}>SUKSES!</div>
        </Card>
      </Show>
      <Confetti t={t} t0={63.25} />

      {/* ---- captions (cover old burned-in ones) ---- */}
      <Caption t={t} />
    </AbsoluteFill>
  );
};
