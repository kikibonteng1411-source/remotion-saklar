import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ====================== Konstanta rangkaian ======================
const L = 400;
const R = 1520;
const T = 380;
const B = 800;
const W = R - L;
const H = B - T;
const PERIM = 2 * (W + H);
const MID_Y = (T + B) / 2;
const SW_X1 = 860; // kontak kiri saklar (engsel tuas)
const SW_X2 = 1060; // kontak kanan saklar
const BAT_GAP = 70;
const BULB_R = 80;

// ====================== Timeline (30 fps) ======================
const T_CLOSE = 270; // saklar ditutup
const T_OPEN = 500; // saklar dibuka lagi

// ====================== Warna ======================
const FONT = 'Arial, Helvetica, sans-serif';
const BG = '#0b1220';
const WIRE = '#64748b';
const GOLD = '#facc15';
const CYAN = '#38bdf8';

const clamp = {
  extrapolateLeft: 'clamp',
  extrapolateRight: 'clamp',
} as const;

// Titik di sepanjang kabel (searah jarum jam, mulai dari pojok kiri atas)
const pointAt = (dist: number) => {
  let d = ((dist % PERIM) + PERIM) % PERIM;
  if (d < W) return {x: L + d, y: T};
  d -= W;
  if (d < H) return {x: R, y: T + d};
  d -= H;
  if (d < W) return {x: R - d, y: B};
  d -= W;
  return {x: L, y: B - d};
};

// Garis zig-zag (untuk pegas dan filamen)
const zigzag = (
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  n: number,
  amp: number
) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [`${x1},${y1}`];
  for (let i = 1; i < n; i++) {
    const t = i / n;
    const s = i % 2 === 0 ? -amp : amp;
    pts.push(`${x1 + dx * t + nx * s},${y1 + dy * t + ny * s}`);
  }
  pts.push(`${x2},${y2}`);
  return pts.join(' ');
};

// ====================== Callout (label dengan garis) ======================
type CalloutProps = {
  px: number;
  py: number;
  tx: number;
  ty: number;
  title: string;
  sub?: string;
  from: number;
  to: number;
  size?: number;
  anchor?: 'start' | 'middle' | 'end';
};

const Callout: React.FC<CalloutProps> = ({
  px,
  py,
  tx,
  ty,
  title,
  sub,
  from,
  to,
  size = 30,
  anchor = 'start',
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [from, from + 10, to - 10, to], [0, 1, 1, 0], clamp);
  if (o <= 0) return null;
  const ex = anchor === 'start' ? tx - 8 : anchor === 'end' ? tx + 8 : tx;
  return (
    <g opacity={o}>
      <line x1={px} y1={py} x2={ex} y2={ty - size * 0.3} stroke={CYAN} strokeWidth={size / 10} />
      <circle cx={px} cy={py} r={size / 5} fill={CYAN} />
      <text x={tx} y={ty} fill="white" fontSize={size} fontWeight={700} fontFamily={FONT} textAnchor={anchor}>
        {title}
      </text>
      {sub ? (
        <text x={tx} y={ty + size * 0.9} fill="#94a3b8" fontSize={size * 0.75} fontFamily={FONT} textAnchor={anchor}>
          {sub}
        </text>
      ) : null}
    </g>
  );
};

// ====================== Keterangan di bawah layar ======================
const Caption: React.FC<{title: string; sub: string; from: number; to: number}> = ({
  title,
  sub,
  from,
  to,
}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [from, from + 10, to - 10, to], [0, 1, 1, 0], clamp);
  const y = interpolate(frame, [from, from + 10], [24, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        left: 210,
        width: 1500,
        bottom: 56,
        padding: '22px 36px',
        borderRadius: 24,
        background: 'rgba(15,23,42,0.88)',
        border: '2px solid #334155',
        fontFamily: FONT,
        textAlign: 'center',
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{fontSize: 52, fontWeight: 800, color: 'white'}}>{title}</div>
      <div style={{fontSize: 32, color: '#cbd5e1', marginTop: 8}}>{sub}</div>
    </div>
  );
};

// ====================== Penanda langkah di atas ======================
const STEPS = [
  {label: '1. Saklar terbuka', from: 90, to: 210},
  {label: '2. Di dalam saklar', from: 210, to: 285},
  {label: '3. Arus mengalir', from: 285, to: 500},
  {label: '4. Saklar dibuka', from: 500, to: 601},
];

const StepChips: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [90, 110], [0, 1], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        top: 36,
        left: 0,
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        gap: 20,
        opacity: o,
        fontFamily: FONT,
      }}
    >
      {STEPS.map((s) => {
        const active = frame >= s.from && frame < s.to;
        return (
          <div
            key={s.label}
            style={{
              padding: '10px 26px',
              borderRadius: 999,
              fontSize: 28,
              fontWeight: 700,
              color: active ? '#0b1220' : '#94a3b8',
              background: active ? GOLD : 'rgba(30,41,59,0.9)',
              border: '2px solid ' + (active ? GOLD : '#334155'),
            }}
          >
            {s.label}
          </div>
        );
      })}
    </div>
  );
};

// ====================== Ringkasan energi ======================
const Summary: React.FC = () => {
  const frame = useCurrentFrame();
  const items = [
    {t: 'Baterai', s: 'energi kimia', c: '#38bdf8'},
    {t: 'Kabel', s: 'energi listrik', c: GOLD},
    {t: 'Lampu', s: 'cahaya + panas', c: '#fb923c'},
  ];
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        width: '100%',
        bottom: 70,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 30,
        fontFamily: FONT,
      }}
    >
      {items.map((it, i) => {
        const from = 548 + i * 8;
        const o = interpolate(frame, [from, from + 12], [0, 1], clamp);
        const y = interpolate(frame, [from, from + 12], [30, 0], clamp);
        return (
          <React.Fragment key={it.t}>
            <div
              style={{
                width: 380,
                padding: '20px 0',
                textAlign: 'center',
                borderRadius: 22,
                background: 'rgba(15,23,42,0.9)',
                border: '3px solid ' + it.c,
                opacity: o,
                transform: `translateY(${y}px)`,
              }}
            >
              <div style={{fontSize: 46, fontWeight: 800, color: 'white'}}>{it.t}</div>
              <div style={{fontSize: 30, color: it.c, marginTop: 6}}>{it.s}</div>
            </div>
            {i < items.length - 1 ? (
              <div style={{fontSize: 64, color: '#94a3b8', opacity: o}}>{'→'}</div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ====================== Komposisi utama ======================
export const SaklarLampu: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // --- Posisi saklar: 0 = terbuka, 1 = tertutup ---
  const s1 = spring({frame: frame - T_CLOSE, fps, config: {damping: 12, stiffness: 140, mass: 0.6}});
  const s2 = spring({frame: frame - T_OPEN, fps, config: {damping: 20, stiffness: 120}});
  const closeP = Math.min(1, Math.max(0, s1 - s2));
  const leverDeg = interpolate(closeP, [0, 1], [-32, 0]);
  const leverRad = (leverDeg * Math.PI) / 180;

  // --- Nyala lampu ---
  const glow = interpolate(closeP, [0.92, 1], [0, 1], clamp);
  const flick =
    interpolate(frame, [T_CLOSE + 10, T_CLOSE + 26], [1, 0], clamp) *
    Math.abs(Math.sin(frame * 1.7));
  const lampGlow = glow * (1 - 0.35 * flick);

  // --- Kamera (zoom ke dalam saklar lalu keluar lagi) ---
  const ease = Easing.inOut(Easing.cubic);
  const zoom = interpolate(frame, [210, 245, 345, 385], [1, 2.8, 2.8, 1], {...clamp, easing: ease});
  const fy = interpolate(frame, [210, 245, 345, 385], [590, 340, 340, 590], {...clamp, easing: ease});
  const camera = `translate(960 540) scale(${zoom}) translate(-960 ${-fy})`;

  // --- Elektron yang mengalir ---
  const flowDist = Math.max(0, frame - T_CLOSE) * 9;
  const DOTS = 32;
  const halos: React.ReactNode[] = [];
  const dots: React.ReactNode[] = [];
  if (glow > 0) {
    for (let i = 0; i < DOTS; i++) {
      const d = flowDist + (i * PERIM) / DOTS;
      const p = pointAt(d);
      halos.push(<circle key={'h' + i} cx={p.x} cy={p.y} r={18} fill={GOLD} opacity={glow * 0.45} />);
      [1, 2, 3].forEach((k) => {
        const q = pointAt(d - k * 13);
        dots.push(
          <circle key={`t${i}-${k}`} cx={q.x} cy={q.y} r={9 - k * 2} fill={GOLD} opacity={(glow * 0.5) / k} />
        );
      });
      dots.push(<circle key={'d' + i} cx={p.x} cy={p.y} r={9} fill="#fde047" opacity={glow} />);
    }
  }

  // --- Elektron yang "antri" saat saklar terbuka ---
  const idleO = (1 - closeP) * interpolate(frame, [100, 130], [0, 1], clamp);
  const idle: React.ReactNode[] = [];
  if (idleO > 0.02) {
    for (let i = 0; i < 10; i++) {
      const p = pointAt(440 - i * 52 + 4 * Math.sin(frame * 0.2 + i));
      idle.push(
        <circle
          key={'i' + i}
          cx={p.x}
          cy={p.y + 3 * Math.cos(frame * 0.25 + i * 2)}
          r={8}
          fill={CYAN}
          opacity={idleO * 0.9}
        />
      );
    }
  }

  // --- Percikan saat tuas menyentuh kontak ---
  const sp = frame - (T_CLOSE + 9);
  const sparks: React.ReactNode[] = [];
  if (sp >= 0 && sp < 12) {
    for (let i = 0; i < 8; i++) {
      const a = ((i * 45 + 10) * Math.PI) / 180;
      const r1 = 10 + sp * 3;
      const r2 = r1 + 16;
      sparks.push(
        <line
          key={'s' + i}
          x1={SW_X2 + Math.cos(a) * r1}
          y1={T + Math.sin(a) * r1}
          x2={SW_X2 + Math.cos(a) * r2}
          y2={T + Math.sin(a) * r2}
          stroke="#fde047"
          strokeWidth={4}
          strokeLinecap="round"
          opacity={1 - sp / 12}
        />
      );
    }
  }

  // --- Sinar lampu ---
  const rays: React.ReactNode[] = [];
  if (lampGlow > 0.01) {
    for (let i = 0; i < 14; i++) {
      const a = ((i * 360) / 14 + frame * 0.6) * (Math.PI / 180);
      const r1 = BULB_R + 16;
      const r2 = r1 + 34 + 16 * Math.sin(frame * 0.2 + i);
      rays.push(
        <line
          key={'r' + i}
          x1={R + Math.cos(a) * r1}
          y1={MID_Y + Math.sin(a) * r1}
          x2={R + Math.cos(a) * r2}
          y2={MID_Y + Math.sin(a) * r2}
          stroke="#fde047"
          strokeWidth={6}
          strokeLinecap="round"
          opacity={lampGlow * 0.8}
        />
      );
    }
  }

  // --- Posisi pegas (menempel di tengah tuas) ---
  const midX = SW_X1 + 100 * Math.cos(leverRad);
  const midY = T + 100 * Math.sin(leverRad);

  // --- Partikel latar ---
  const particles = Array.from({length: 24}).map((_, i) => {
    const x = (i * 173) % 1920;
    const y = (i * 97 + frame * (0.3 + (i % 5) * 0.1)) % 1080;
    return <circle key={i} cx={x} cy={y} r={1.5 + (i % 3)} fill="#475569" opacity={0.35} />;
  });

  const circuitO = interpolate(frame, [60, 100], [0, 1], clamp);
  const titleO = interpolate(frame, [0, 15, 70, 90], [0, 1, 1, 0], clamp);

  return (
    <AbsoluteFill style={{backgroundColor: BG, fontFamily: FONT}}>
      {/* Latar: grid + partikel */}
      <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{position: 'absolute'}}>
        <defs>
          <pattern id="gridPattern" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 L 0 80" fill="none" stroke="#1e293b" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="1920" height="1080" fill="url(#gridPattern)" opacity={0.7} />
        {particles}
      </svg>

      {/* Rangkaian */}
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{position: 'absolute', opacity: circuitO}}
      >
        <defs>
          <radialGradient id="warmGlow">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bulbHalo">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="bulbFill">
            <stop offset="0%" stopColor="#fef9c3" />
            <stop offset="100%" stopColor="#f59e0b" />
          </radialGradient>
          <filter id="dotBlur">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>

        <g transform={camera}>
          {/* Cahaya hangat menerangi ruangan */}
          <circle cx={R} cy={MID_Y} r={1000} fill="url(#warmGlow)" opacity={lampGlow * 0.6} />

          {/* Kabel (terputus di baterai, saklar, dan lampu) */}
          <path
            d={`M ${SW_X2} ${T} L ${R} ${T} L ${R} ${MID_Y - BULB_R}
                M ${R} ${MID_Y + BULB_R} L ${R} ${B} L ${L} ${B} L ${L} ${MID_Y + BAT_GAP}
                M ${L} ${MID_Y - BAT_GAP} L ${L} ${T} L ${SW_X1} ${T}`}
            fill="none"
            stroke={WIRE}
            strokeWidth={8}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Lampu */}
          <circle cx={R} cy={MID_Y} r={260} fill="url(#bulbHalo)" opacity={lampGlow * 0.55} />
          {rays}
          <circle cx={R} cy={MID_Y} r={BULB_R} fill="rgba(255,255,255,0.05)" stroke="#cbd5e1" strokeWidth={6} />
          <circle cx={R} cy={MID_Y} r={BULB_R - 4} fill="url(#bulbFill)" opacity={lampGlow * 0.85} />
          <polyline
            points={zigzag(R, MID_Y - BULB_R, R, MID_Y + BULB_R, 12, 22)}
            fill="none"
            stroke={interpolateColors(lampGlow, [0, 1], ['#64748b', '#fffbeb'])}
            strokeWidth={6}
            strokeLinejoin="round"
          />

          {/* Saklar: rumah */}
          <rect
            x={800}
            y={T - 150}
            width={320}
            height={220}
            rx={18}
            fill="rgba(148,163,184,0.08)"
            stroke="#475569"
            strokeWidth={4}
          />
          <line x1={800} y1={T} x2={SW_X1} y2={T} stroke={WIRE} strokeWidth={8} />
          <line x1={SW_X2} y1={T} x2={1120} y2={T} stroke={WIRE} strokeWidth={8} />

          {/* Saklar: pegas */}
          <line x1={925} y1={T - 150} x2={975} y2={T - 150} stroke="#94a3b8" strokeWidth={8} strokeLinecap="round" />
          <polyline
            points={zigzag(950, T - 150, midX, midY, 9, 14)}
            fill="none"
            stroke="#94a3b8"
            strokeWidth={4}
            strokeLinejoin="round"
          />

          {/* Saklar: kontak dan tuas */}
          <circle cx={SW_X1} cy={T} r={16} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={3} />
          <circle cx={SW_X2} cy={T} r={16} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={3} />
          <g transform={`rotate(${leverDeg} ${SW_X1} ${T})`}>
            <line
              x1={SW_X1}
              y1={T}
              x2={SW_X2}
              y2={T}
              stroke={interpolateColors(closeP, [0, 1], ['#f87171', GOLD])}
              strokeWidth={12}
              strokeLinecap="round"
            />
          </g>
          {sparks}

          {/* Elektron mengalir (di atas kabel, saklar, dan lampu) */}
          <g filter="url(#dotBlur)">{halos}</g>
          {dots}
          {idle}

          {/* Baterai (di atas elektron supaya terlihat keluar dari kutub) */}
          <rect
            x={L - 60}
            y={MID_Y - BAT_GAP}
            width={120}
            height={BAT_GAP * 2}
            rx={14}
            fill="#111c33"
            stroke={GOLD}
            strokeOpacity={0.25 + glow * 0.75}
            strokeWidth={4}
          />
          <line x1={L - 45} y1={MID_Y - 22} x2={L + 45} y2={MID_Y - 22} stroke="white" strokeWidth={8} />
          <line x1={L - 25} y1={MID_Y + 22} x2={L + 25} y2={MID_Y + 22} stroke="white" strokeWidth={14} />
          <text x={L + 38} y={MID_Y - 32} fill="#fca5a5" fontSize={26} fontWeight={700} fontFamily={FONT} textAnchor="middle">
            +
          </text>
          <text x={L + 38} y={MID_Y + 58} fill="#93c5fd" fontSize={26} fontWeight={700} fontFamily={FONT} textAnchor="middle">
            {'−'}
          </text>

          {/* Label: pandangan keseluruhan */}
          <Callout px={L - 60} py={MID_Y} tx={L - 150} ty={MID_Y - 70} title="Baterai" sub="sumber energi" from={100} to={210} anchor="end" />
          <Callout px={960} py={T - 150} tx={960} ty={T - 215} title="Saklar" sub="penyambung dan pemutus" from={115} to={210} anchor="middle" />
          <Callout px={R + 57} py={MID_Y - 57} tx={R + 110} ty={MID_Y - 110} title="Lampu" sub="listrik jadi cahaya" from={130} to={210} />

          {/* Label: di dalam saklar (zoom) */}
          <Callout px={SW_X1} py={T} tx={790} ty={495} title="Kontak logam" size={20} from={232} to={285} anchor="end" />
          <Callout px={SW_X2} py={T} tx={1130} ty={495} title="Kontak logam" size={20} from={232} to={285} />
          <Callout px={948} py={T - 100} tx={1180} ty={T - 120} title="Pegas" sub="menahan tuas" size={20} from={238} to={285} />
          <Callout px={1045} py={T - 55} tx={1180} ty={T - 30} title="Celah udara" sub="isolator" size={20} from={244} to={285} />
          <Callout px={SW_X2} py={T} tx={1285} ty={T + 125} title="Tuas menyentuh kontak" sub="logam menghantarkan listrik" size={20} from={286} to={345} anchor="end" />
        </g>
      </svg>

      {/* Judul pembuka */}
      <AbsoluteFill
        style={{justifyContent: 'center', alignItems: 'center', opacity: titleO, color: 'white'}}
      >
        <div style={{fontSize: 104, fontWeight: 800}}>Cara Kerja Saklar Lampu</div>
        <div style={{fontSize: 44, color: '#94a3b8', marginTop: 16}}>
          Dari tuas sampai lampu menyala
        </div>
      </AbsoluteFill>

      <StepChips />

      <Caption title="Saklar terbuka" sub="Ada celah udara antara dua kontak logam. Udara tidak menghantarkan listrik, jadi arus berhenti." from={90} to={210} />
      <Caption title="Di dalam saklar" sub="Dua kontak logam dan sebuah pegas yang menahan tuas tetap terangkat." from={210} to={285} />
      <Caption title="Saklar ditutup, rangkaian tersambung" sub="Elektron mengalir dari baterai, lewat tuas, dan membuat filamen lampu berpijar." from={285} to={500} />
      <Caption title="Saklar dibuka lagi" sub="Celah muncul, aliran terputus, lampu padam." from={500} to={545} />
      <Summary />
    </AbsoluteFill>
  );
};
