import React from 'react';
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';

// ====== Pengaturan rangkaian ======
const L = 400;
const R = 1520;
const T = 380;
const B = 800;
const MID_Y = (T + B) / 2;
const W = R - L;
const H = B - T;
const PERIMETER = 2 * (W + H);

// ====== Timeline (dalam frame, 30 fps) ======
const CLOSE_AT = 180; // saat saklar ditutup
const BG = '#0f172a';
const WIRE = '#94a3b8';
const ACCENT = '#facc15';

// Titik di sepanjang kabel (searah jarum jam)
const pointAt = (dist: number) => {
  let d = ((dist % PERIMETER) + PERIMETER) % PERIMETER;
  if (d < W) return {x: L + d, y: T};
  d -= W;
  if (d < H) return {x: R, y: T + d};
  d -= H;
  if (d < W) return {x: R - d, y: B};
  d -= W;
  return {x: L, y: B - d};
};

const Caption: React.FC<{
  text: string;
  sub?: string;
  from: number;
  to: number;
}> = ({text, sub, from, to}) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [from, from + 12, to - 12, to],
    [0, 1, 1, 0],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}
  );
  const y = interpolate(frame, [from, from + 12], [20, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return (
    <div
      style={{
        position: 'absolute',
        top: 110,
        width: '100%',
        textAlign: 'center',
        color: 'white',
        fontFamily: 'Arial, sans-serif',
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{fontSize: 64, fontWeight: 700}}>{text}</div>
      {sub ? (
        <div style={{fontSize: 36, color: '#cbd5e1', marginTop: 12}}>{sub}</div>
      ) : null}
    </div>
  );
};

export const SaklarLampu: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Progres penutupan saklar (0 = terbuka, 1 = tertutup)
  const closeProgress = spring({
    frame: frame - CLOSE_AT,
    fps,
    config: {damping: 14, stiffness: 120},
  });
  const isOn = frame >= CLOSE_AT + 8;
  const leverAngle = interpolate(closeProgress, [0, 1], [-35, 0]);

  // Cahaya lampu menyala halus
  const glow = interpolate(frame, [CLOSE_AT + 8, CLOSE_AT + 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Titik arus listrik
  const DOTS = 28;
  const dots = isOn
    ? Array.from({length: DOTS}).map((_, i) => {
        const p = pointAt((frame - CLOSE_AT) * 9 + (i * PERIMETER) / DOTS);
        return <circle key={i} cx={p.x} cy={p.y} r={9} fill={ACCENT} opacity={glow} />;
      })
    : null;

  const titleOpacity = interpolate(frame, [0, 15, 75, 90], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const SW_X1 = 860;
  const SW_X2 = 1060;

  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      {/* Judul pembuka */}
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          opacity: titleOpacity,
          fontFamily: 'Arial, sans-serif',
          color: 'white',
        }}
      >
        <div style={{fontSize: 96, fontWeight: 800}}>Cara Kerja Saklar Lampu</div>
      </AbsoluteFill>

      {/* Rangkaian listrik */}
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{opacity: interpolate(frame, [70, 100], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}
      >
        <defs>
          <radialGradient id="glow">
            <stop offset="0%" stopColor="#fde047" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fde047" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Kabel */}
        <rect x={L} y={T} width={W} height={H} fill="none" stroke={WIRE} strokeWidth={8} />

        {/* Titik arus */}
        {dots}

        {/* Baterai (kiri) */}
        <rect x={L - 40} y={MID_Y - 70} width={80} height={140} fill={BG} />
        <line x1={L - 40} y1={MID_Y - 25} x2={L + 40} y2={MID_Y - 25} stroke="white" strokeWidth={8} />
        <line x1={L - 20} y1={MID_Y + 25} x2={L + 20} y2={MID_Y + 25} stroke="white" strokeWidth={8} />
        <text x={L - 110} y={MID_Y} fill="#cbd5e1" fontSize={34} fontFamily="Arial" textAnchor="middle">Baterai</text>

        {/* Saklar (atas) */}
        <rect x={SW_X1} y={T - 20} width={SW_X2 - SW_X1} height={40} fill={BG} />
        <circle cx={SW_X1} cy={T} r={14} fill="white" />
        <circle cx={SW_X2} cy={T} r={14} fill="white" />
        <g transform={`rotate(${leverAngle} ${SW_X1} ${T})`}>
          <line x1={SW_X1} y1={T} x2={SW_X2} y2={T} stroke={isOn ? ACCENT : '#f87171'} strokeWidth={10} strokeLinecap="round" />
        </g>
        <text x={(SW_X1 + SW_X2) / 2} y={T - 110} fill="#cbd5e1" fontSize={34} fontFamily="Arial" textAnchor="middle">Saklar</text>

        {/* Lampu (kanan) */}
        <circle cx={R} cy={MID_Y} r={170} fill="url(#glow)" opacity={glow} />
        <circle cx={R} cy={MID_Y} r={70} fill={BG} stroke="white" strokeWidth={8} />
        <circle cx={R} cy={MID_Y} r={62} fill="#fde047" opacity={glow} />
        <path
          d={`M ${R - 35} ${MID_Y + 35} L ${R - 20} ${MID_Y - 10} L ${R} ${MID_Y + 15} L ${R + 20} ${MID_Y - 10} L ${R + 35} ${MID_Y + 35}`}
          fill="none"
          stroke={isOn ? '#b45309' : '#64748b'}
          strokeWidth={5}
        />
        <text x={R + 130} y={MID_Y + 90} fill="#cbd5e1" fontSize={34} fontFamily="Arial" textAnchor="middle">Lampu</text>
      </svg>

      {/* Keterangan */}
      <Caption text="Saklar terbuka" sub="Jalur terputus, arus listrik tidak mengalir" from={90} to={CLOSE_AT + 10} />
      <Caption text="Saklar tertutup" sub="Jalur tersambung, arus mengalir dan lampu menyala" from={CLOSE_AT + 20} to={290} />
      <Caption text="Saklar = pemutus dan penyambung arus" from={290} to={330} />
    </AbsoluteFill>
  );
};
