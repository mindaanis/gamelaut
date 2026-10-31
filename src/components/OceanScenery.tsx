import React from 'react';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../game/constants.ts';

/**
 * Living, layered underwater scenery for the 3000x2000 gameplay world.
 * Everything is static markup animated purely with CSS (transform/opacity),
 * and the component is memoized so the 60fps game loop never re-renders it.
 */

// Deterministic pseudo-random generator so the layout is stable between renders
function seeded(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

interface ZonePalette {
  sandTop: string;
  sandBottom: string;
  duneBack: string;
  kelp: [string, string];
  kelpCount: number;
  rays: number;
  rayColor: string;
  snowCount: number;
  snowColor: string;
  depthShade: string;
}

const PALETTES: Record<number, ZonePalette> = {
  1: {
    sandTop: '#8fb8a8',
    sandBottom: '#41665f',
    duneBack: '#2f6a73',
    kelp: ['#3fae5a', '#14532d'],
    kelpCount: 30,
    rays: 8,
    rayColor: 'rgba(255, 252, 220, 0.55)',
    snowCount: 30,
    snowColor: 'rgba(230, 250, 255, 0.8)',
    depthShade: 'rgba(0, 18, 40, 0.45)'
  },
  2: {
    sandTop: '#4f6670',
    sandBottom: '#1b2a33',
    duneBack: '#1d3a4f',
    kelp: ['#3c8f7c', '#163d36'],
    kelpCount: 18,
    rays: 4,
    rayColor: 'rgba(190, 230, 255, 0.35)',
    snowCount: 60,
    snowColor: 'rgba(210, 230, 240, 0.75)',
    depthShade: 'rgba(0, 8, 22, 0.6)'
  },
  3: {
    sandTop: '#2a1f42',
    sandBottom: '#08040f',
    duneBack: '#160c2b',
    kelp: ['#7e22ce', '#2e1065'],
    kelpCount: 0,
    rays: 0,
    rayColor: 'transparent',
    snowCount: 90,
    snowColor: 'rgba(200, 210, 255, 0.65)',
    depthShade: 'rgba(2, 0, 10, 0.55)'
  }
};

/* ─────────────── Small building blocks ─────────────── */

const BubbleColumn: React.FC<{ x: number; y: number; count?: number; rise?: number; seed: number }> = ({
  x,
  y,
  count = 8,
  rise = 900,
  seed
}) => {
  const r = seeded(seed);
  return (
    <div className="absolute pointer-events-none" style={{ left: x, top: y }}>
      {Array.from({ length: count }).map((_, i) => {
        const size = 6 + r() * 12;
        const duration = 5 + r() * 3;
        return (
          <span
            key={i}
            className="ocean-bubble absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: (r() - 0.5) * 18,
              animationDuration: `${duration}s`,
              animationDelay: `-${(i / count) * duration}s`,
              ['--rise' as any]: `${rise}px`
            }}
          />
        );
      })}
    </div>
  );
};

const Kelp: React.FC<{ x: number; height: number; level: number; delay: number; duration: number; seed: number }> = ({
  x,
  height,
  level,
  delay,
  duration,
  seed
}) => {
  const r = seeded(seed);
  const leaves = Array.from({ length: 6 }).map((_, k) => {
    const y = 185 - k * 30 - r() * 8;
    const side = k % 2 === 0 ? 1 : -1;
    const len = 14 + r() * 8;
    return `M20 ${y} q ${side * len} -8 ${side * (len + 4)} -26 q ${-side * (len - 6)} 6 ${-side * (len + 4)} 26 z`;
  });
  return (
    <div
      className="ocean-kelp absolute pointer-events-none"
      style={{
        left: x,
        bottom: 30,
        height,
        width: height * 0.26,
        animationDuration: `${duration}s`,
        animationDelay: `-${delay}s`
      }}
    >
      <svg viewBox="0 0 40 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
        <path
          d="M20 200 C 14 160, 26 130, 19 95 S 24 35, 20 0"
          stroke={`url(#kelp-grad-${level})`}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
        {leaves.map((d, i) => (
          <path key={i} d={d} fill={`url(#kelp-grad-${level})`} opacity={0.9} />
        ))}
      </svg>
    </div>
  );
};

const Anemone: React.FC<{ x: number; y: number; scale?: number; color: string; tip: string; seed: number }> = ({
  x,
  y,
  scale = 1,
  color,
  tip,
  seed
}) => {
  const r = seeded(seed);
  return (
    <svg
      className="absolute pointer-events-none overflow-visible"
      viewBox="0 0 120 100"
      style={{ left: x, top: y, width: 120 * scale, height: 100 * scale }}
    >
      {Array.from({ length: 14 }).map((_, i) => {
        const bx = 22 + i * 5.6;
        const lean = (i - 6.5) * 4;
        const h = 45 + r() * 25;
        return (
          <g
            key={i}
            className="ocean-tentacle"
            style={{ animationDelay: `-${r() * 2.8}s`, animationDuration: `${2.4 + r() * 1.2}s` }}
          >
            <path
              d={`M${bx} 88 Q ${bx + lean * 0.5} ${88 - h * 0.6} ${bx + lean} ${88 - h}`}
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              fill="none"
            />
            <circle cx={bx + lean} cy={88 - h} r="3.4" fill={tip} />
          </g>
        );
      })}
      <ellipse cx="60" cy="90" rx="42" ry="10" fill={color} opacity="0.95" />
    </svg>
  );
};

const BranchCoral: React.FC<{ x: number; y: number; color: string; scale?: number }> = ({ x, y, color, scale = 1 }) => (
  <svg
    className="absolute pointer-events-none overflow-visible"
    viewBox="0 0 140 130"
    style={{ left: x, top: y, width: 140 * scale, height: 130 * scale }}
  >
    <g stroke={color} strokeWidth="9" strokeLinecap="round" fill="none">
      <path d="M70 130 L70 80 L40 45 L35 10" />
      <path d="M70 80 L100 50 L108 15" />
      <path d="M40 45 L15 30" />
      <path d="M100 50 L128 38" />
      <path d="M70 95 L52 70 L58 40" />
      <path d="M70 100 L88 78 L84 30" />
    </g>
    <g fill="#fff" opacity="0.35">
      <circle cx="35" cy="10" r="3" />
      <circle cx="108" cy="15" r="3" />
      <circle cx="84" cy="30" r="3" />
    </g>
  </svg>
);

const BrainCoral: React.FC<{ x: number; y: number; color: string; scale?: number }> = ({ x, y, color, scale = 1 }) => (
  <svg
    className="absolute pointer-events-none"
    viewBox="0 0 120 70"
    style={{ left: x, top: y, width: 120 * scale, height: 70 * scale }}
  >
    <ellipse cx="60" cy="45" rx="56" ry="28" fill={color} />
    <g stroke="rgba(0,0,0,0.25)" strokeWidth="3" fill="none" strokeLinecap="round">
      <path d="M14 45 q 8 -14 18 0 t 18 0 t 18 0 t 18 0 t 18 0" />
      <path d="M24 32 q 8 -12 16 0 t 16 0 t 16 0 t 16 0" />
      <path d="M22 58 q 8 -10 16 0 t 16 0 t 16 0 t 16 0 t 16 0" />
    </g>
    <ellipse cx="44" cy="28" rx="22" ry="7" fill="rgba(255,255,255,0.18)" />
  </svg>
);

const FanCoral: React.FC<{ x: number; y: number; color: string; scale?: number }> = ({ x, y, color, scale = 1 }) => (
  <svg
    className="ocean-kelp absolute pointer-events-none overflow-visible"
    viewBox="0 0 150 140"
    style={{ left: x, top: y, width: 150 * scale, height: 140 * scale, animationDuration: '6s' }}
  >
    <g stroke={color} strokeWidth="2.5" fill="none" opacity="0.9">
      {Array.from({ length: 11 }).map((_, i) => {
        const a = (-80 + i * 16) * (Math.PI / 180);
        return <path key={i} d={`M75 140 Q ${75 + Math.sin(a) * 40} ${110 - Math.cos(a) * 40} ${75 + Math.sin(a) * 70} ${140 - Math.cos(a) * 120}`} />;
      })}
      <path d="M20 70 Q75 20 130 70" />
      <path d="M30 100 Q75 60 120 100" />
      <path d="M12 45 Q75 -10 138 45" />
    </g>
  </svg>
);

/** Simple side-view fish (faces right) */
const FishShape: React.FC<{ color: string; belly?: string; glow?: string }> = ({ color, belly, glow }) => (
  <svg viewBox="0 0 32 14" className="w-full h-full overflow-visible">
    <polygon points="9,7 0,1 2,7 0,13" fill={color} />
    <ellipse cx="19" cy="7" rx="11" ry="5.2" fill={color} />
    {belly && <ellipse cx="20" cy="9" rx="8" ry="2.2" fill={belly} opacity="0.7" />}
    <circle cx="26" cy="5.8" r="1.2" fill={glow || '#0b1020'} />
    {glow && <circle cx="26" cy="5.8" r="3.5" fill={glow} opacity="0.35" />}
  </svg>
);

const FishSchool: React.FC<{
  y: number;
  count: number;
  color: string;
  belly?: string;
  glow?: string;
  duration: number;
  delay: number;
  seed: number;
}> = ({ y, count, color, belly, glow, duration, delay, seed }) => {
  const r = seeded(seed);
  return (
    <div
      className="ocean-swim-across absolute left-0 pointer-events-none"
      style={{ top: y, animationDuration: `${duration}s`, animationDelay: `-${delay}s` }}
    >
      <div className="ocean-swim-bob relative" style={{ animationDuration: '7s', width: 260, height: 140 }}>
        {Array.from({ length: count }).map((_, i) => {
          const size = 22 + r() * 12;
          return (
            <div
              key={i}
              className="absolute"
              style={{ left: r() * 220, top: r() * 110, width: size, height: size * 0.45 }}
            >
              <div className="ocean-fish-wiggle w-full h-full" style={{ animationDelay: `-${r()}s` }}>
                <FishShape color={color} belly={belly} glow={glow} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/** Large slow silhouette crossing the far background */
const Silhouette: React.FC<{ kind: 'manta' | 'shark' | 'whale'; y: number; width: number; duration: number; delay: number; color: string }> = ({
  kind,
  y,
  width,
  duration,
  delay,
  color
}) => (
  <div
    className="ocean-swim-across absolute left-0 pointer-events-none"
    style={{ top: y, animationDuration: `${duration}s`, animationDelay: `-${delay}s` }}
  >
    <div className="ocean-swim-bob" style={{ animationDuration: '11s', width }}>
      {kind === 'manta' && (
        <svg viewBox="0 0 260 120" className="ocean-manta-flap w-full overflow-visible">
          <path d="M150 60 Q 120 0 40 6 Q 95 40 92 60 Q 95 80 40 114 Q 120 120 150 60 Z" fill={color} />
          <path d="M150 60 Q 200 40 240 52 Q 250 60 240 68 Q 200 80 150 60 Z" fill={color} />
          <path d="M92 60 L 0 62" stroke={color} strokeWidth="3" />
        </svg>
      )}
      {kind === 'shark' && (
        <svg viewBox="0 0 300 110" className="w-full overflow-visible">
          <path
            d="M296 58 Q 260 40 210 38 Q 196 14 182 6 Q 186 26 178 36 Q 110 34 60 50 L 22 20 Q 34 50 30 58 Q 34 68 20 98 L 62 68 Q 120 82 175 80 Q 182 92 196 100 Q 196 88 204 78 Q 260 74 296 58 Z"
            fill={color}
          />
        </svg>
      )}
      {kind === 'whale' && (
        <svg viewBox="0 0 420 140" className="w-full overflow-visible">
          <path
            d="M415 70 Q 400 30 320 26 Q 200 20 110 56 L 40 30 Q 56 62 52 72 Q 56 84 36 112 L 112 86 Q 220 120 330 112 Q 405 104 415 70 Z"
            fill={color}
          />
          <circle cx="370" cy="62" r="3" fill="#7dd3fc" opacity="0.8" />
        </svg>
      )}
    </div>
  </div>
);

/* ─────────────── Zone specific set pieces ─────────────── */

const Shipwreck: React.FC<{ x: number; y: number; width: number; rotate: number; flip?: boolean }> = ({ x, y, width, rotate, flip }) => (
  <svg
    className="absolute pointer-events-none overflow-visible"
    viewBox="0 0 720 360"
    style={{ left: x, top: y, width, transform: `rotate(${rotate}deg) ${flip ? 'scaleX(-1)' : ''}` }}
  >
    <defs>
      <linearGradient id="wreck-wood" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#3b2e25" />
        <stop offset="1" stopColor="#120d0a" />
      </linearGradient>
    </defs>
    {/* Broken mast & torn sail */}
    <rect x="300" y="20" width="14" height="230" fill="#2a211b" transform="rotate(14 307 250)" />
    <path d="M330 40 Q 410 70 395 140 Q 360 120 335 150 Z" fill="#5b6b6e" opacity="0.45" />
    <rect x="250" y="60" width="150" height="8" fill="#2a211b" transform="rotate(10 325 64)" />
    {/* Hull */}
    <path
      d="M20 180 Q 60 320 170 335 L 560 335 Q 660 315 700 160 L 650 170 Q 615 250 545 258 L 170 258 Q 95 248 72 175 Z"
      fill="url(#wreck-wood)"
    />
    <path d="M72 175 L 650 170 L 640 190 L 80 196 Z" fill="#4a3a2e" />
    <g stroke="rgba(0,0,0,0.45)" strokeWidth="3">
      <path d="M60 230 L 670 220" />
      <path d="M95 280 L 640 272" />
      <path d="M140 315 L 600 310" />
    </g>
    {/* Hole in the hull */}
    <path d="M430 230 Q 470 210 500 245 Q 480 290 440 280 Z" fill="#05080c" />
    {/* Portholes with faint glow */}
    {[180, 260, 340].map((cx) => (
      <g key={cx}>
        <circle cx={cx} cy="225" r="11" fill="#0a1118" stroke="#7c6a4f" strokeWidth="3" />
        <circle cx={cx} cy="225" r="7" fill="#ffd27f" className="ocean-twinkle" style={{ animationDuration: '5s', transformBox: 'fill-box', transformOrigin: 'center' }} opacity="0.4" />
      </g>
    ))}
    {/* Hanging seaweed */}
    <g stroke="#2f6b55" strokeWidth="4" fill="none" opacity="0.8">
      <path d="M120 200 q 6 30 -4 60" />
      <path d="M560 195 q -8 26 4 58" />
      <path d="M610 190 q 6 22 -3 40" />
    </g>
  </svg>
);

const Vent: React.FC<{ x: number; height: number; seed: number }> = ({ x, height, seed }) => {
  const r = seeded(seed);
  return (
    <div className="absolute pointer-events-none" style={{ left: x, bottom: 40, width: 90, height }}>
      {/* Smoke plume */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ top: 0 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <span
            key={i}
            className="ocean-vent-smoke absolute rounded-full"
            style={{
              width: 46,
              height: 46,
              left: -23,
              top: -10,
              background: 'radial-gradient(circle, rgba(70,60,90,0.75) 0%, rgba(40,30,60,0.35) 50%, transparent 70%)',
              animationDuration: `${5 + r() * 2}s`,
              animationDelay: `-${i * 0.9}s`,
              ['--drift' as any]: `${(r() - 0.3) * 60}px`
            }}
          />
        ))}
      </div>
      {/* Glowing mouth */}
      <span
        className="ocean-vent-glow absolute left-1/2 -translate-x-1/2 rounded-full"
        style={{ top: -12, width: 40, height: 24, background: 'radial-gradient(circle, rgba(255,140,40,0.95), rgba(255,60,0,0.25) 60%, transparent 70%)' }}
      />
      {/* Chimney */}
      <svg viewBox="0 0 90 200" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path d="M30 0 L 60 0 L 66 60 L 58 90 L 74 140 L 90 200 L 0 200 L 14 140 L 30 92 L 24 50 Z" fill="#140b20" />
        <path d="M34 4 L 44 4 L 40 80 L 30 120 Z" fill="#ff7a2a" opacity="0.18" />
      </svg>
    </div>
  );
};

const Anglerfish: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <div className="absolute pointer-events-none ocean-swim-bob" style={{ left: x, top: y, width: 150, animationDuration: '9s' }}>
    <svg viewBox="0 0 150 100" className="w-full overflow-visible">
      <path d="M20 55 Q 40 15 95 25 Q 135 35 140 60 Q 130 85 90 88 Q 45 90 20 55 Z" fill="#0d0a18" />
      <path d="M20 55 L 0 35 L 4 55 L 0 78 Z" fill="#0d0a18" />
      <path d="M118 70 L 140 62 L 120 78" fill="none" stroke="#cbd5e1" strokeWidth="2" opacity="0.6" />
      <circle cx="112" cy="45" r="4" fill="#e0f2fe" opacity="0.7" />
      <path d="M100 26 Q 118 -10 140 6" stroke="#1e1530" strokeWidth="3" fill="none" />
      <g className="ocean-lure-bob">
        <circle cx="140" cy="8" r="14" fill="#67e8f9" opacity="0.25" />
        <circle cx="140" cy="8" r="6" fill="#a5f3fc" className="ocean-twinkle" style={{ animationDuration: '2.4s', transformBox: 'fill-box', transformOrigin: 'center' }} />
      </g>
    </svg>
  </div>
);

/* ─────────────── Main scenery ─────────────── */

const OceanSceneryInner: React.FC<{ level: number }> = ({ level }) => {
  const p = PALETTES[level] || PALETTES[1];
  const r = seeded(level * 9973);

  const rays = Array.from({ length: p.rays }).map((_, i) => ({
    left: (i + 0.3 + r() * 0.4) * (WORLD_WIDTH / Math.max(1, p.rays)),
    width: 120 + r() * 160,
    height: 1100 + r() * 500,
    skew: -10 - r() * 12,
    duration: 7 + r() * 6,
    delay: r() * 8
  }));

  const kelps = Array.from({ length: p.kelpCount }).map((_, i) => ({
    x: (i / Math.max(1, p.kelpCount)) * WORLD_WIDTH + r() * 70,
    height: 160 + r() * 260,
    delay: r() * 6,
    duration: 4.5 + r() * 3
  }));

  const snow = Array.from({ length: p.snowCount }).map(() => ({
    x: r() * WORLD_WIDTH,
    y: r() * (WORLD_HEIGHT - 300),
    size: 1.5 + r() * 2.5,
    duration: 14 + r() * 14,
    delay: r() * 28
  }));

  const plankton =
    level === 3
      ? Array.from({ length: 110 }).map(() => ({
          x: r() * WORLD_WIDTH,
          y: 150 + r() * (WORLD_HEIGHT - 350),
          size: 2 + r() * 4,
          color: r() > 0.5 ? '#67e8f9' : r() > 0.5 ? '#c084fc' : '#86efac',
          duration: 2 + r() * 4,
          delay: r() * 6
        }))
      : [];

  // Bubble vents along the seabed (also escaping from the wreck / hydrothermal vents)
  const bubbleVents =
    level === 1
      ? [380, 980, 1540, 2080, 2620].map((x) => ({ x, y: 1880 }))
      : level === 2
      ? [{ x: 780, y: 1720 }, { x: 980, y: 1760 }, { x: 2250, y: 1790 }, { x: 1600, y: 1880 }]
      : [{ x: 560, y: 1700 }, { x: 1700, y: 1640 }, { x: 2560, y: 1720 }];

  // Dune silhouettes (two depth layers)
  const duneFront = `M0 120 C 250 60, 450 150, 700 100 S 1150 40, 1450 95 S 1950 150, 2250 85 S 2750 40, 3000 110 L 3000 260 L 0 260 Z`;
  const duneBack = `M0 90 C 300 20, 600 110, 900 60 S 1500 0, 1800 70 S 2400 120, 2700 40 S 2950 60, 3000 50 L 3000 260 L 0 260 Z`;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Shared gradient defs */}
      <svg width="0" height="0" className="absolute">
        <defs>
          <linearGradient id={`kelp-grad-${level}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.kelp[0]} />
            <stop offset="1" stopColor={p.kelp[1]} />
          </linearGradient>
          <linearGradient id={`sand-grad-${level}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={p.sandTop} />
            <stop offset="1" stopColor={p.sandBottom} />
          </linearGradient>
        </defs>
      </svg>

      {/* Depth: water darkens the deeper you go */}
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, transparent 0%, transparent 25%, ${p.depthShade} 100%)` }}
      />

      {/* Water surface seen from below (zones 1 & 2) */}
      {level !== 3 && (
        <div className="absolute top-0 left-0 h-[70px] overflow-hidden" style={{ width: WORLD_WIDTH }}>
          <div
            className="ocean-surface absolute top-0 left-0 h-full"
            style={{
              width: WORLD_WIDTH + 480,
              opacity: level === 1 ? 0.55 : 0.3,
              background:
                'repeating-radial-gradient(ellipse 120px 26px at 60px 0px, rgba(255,255,255,0.75) 0 6px, rgba(160,220,255,0.25) 7px 14px, transparent 15px 30px)',
              backgroundSize: '240px 70px'
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-b from-transparent to-transparent" />
        </div>
      )}

      {/* Sunlight god rays */}
      {rays.map((ray, i) => (
        <div
          key={`ray-${i}`}
          className="ocean-god-ray absolute top-0"
          style={{
            left: ray.left,
            width: ray.width,
            height: ray.height,
            background: `linear-gradient(to bottom, ${p.rayColor} 0%, rgba(255,255,255,0.08) 55%, transparent 100%)`,
            filter: 'blur(14px)',
            animationDuration: `${ray.duration}s`,
            animationDelay: `-${ray.delay}s`,
            ['--ray-skew' as any]: `${ray.skew}deg`
          }}
        />
      ))}

      {/* Far background silhouettes */}
      {level === 1 && (
        <>
          <Silhouette kind="manta" y={520} width={300} duration={95} delay={10} color="rgba(0, 25, 50, 0.45)" />
          <Silhouette kind="whale" y={260} width={520} duration={160} delay={90} color="rgba(0, 30, 60, 0.28)" />
        </>
      )}
      {level === 2 && (
        <>
          <Silhouette kind="shark" y={640} width={360} duration={80} delay={20} color="rgba(0, 10, 25, 0.55)" />
          <Silhouette kind="shark" y={1180} width={260} duration={110} delay={75} color="rgba(0, 10, 25, 0.4)" />
        </>
      )}
      {level === 3 && (
        <Silhouette kind="whale" y={700} width={640} duration={180} delay={40} color="rgba(10, 4, 25, 0.75)" />
      )}

      {/* Fish schools */}
      {level === 1 && (
        <>
          <FishSchool y={360} count={16} color="#facc15" belly="#fff7cc" duration={48} delay={5} seed={11} />
          <FishSchool y={980} count={14} color="#38bdf8" belly="#e0f2fe" duration={62} delay={30} seed={23} />
          <FishSchool y={1400} count={10} color="#fb923c" belly="#ffedd5" duration={55} delay={44} seed={37} />
        </>
      )}
      {level === 2 && (
        <>
          <FishSchool y={820} count={20} color="#94a3b8" belly="#e2e8f0" duration={58} delay={12} seed={41} />
          <FishSchool y={1420} count={12} color="#64748b" belly="#cbd5e1" duration={75} delay={50} seed={53} />
        </>
      )}
      {level === 3 && (
        <>
          <FishSchool y={540} count={14} color="#0b1022" glow="#67e8f9" duration={70} delay={8} seed={61} />
          <FishSchool y={1260} count={12} color="#0b1022" glow="#c084fc" duration={88} delay={45} seed={67} />
        </>
      )}

      {/* Seabed: back dunes, front dunes */}
      <svg
        className="absolute left-0"
        viewBox={`0 0 ${WORLD_WIDTH} 260`}
        preserveAspectRatio="none"
        style={{ top: WORLD_HEIGHT - 300, width: WORLD_WIDTH, height: 300 }}
      >
        <path d={duneBack} fill={p.duneBack} opacity="0.85" />
      </svg>
      <svg
        className="absolute left-0"
        viewBox={`0 0 ${WORLD_WIDTH} 260`}
        preserveAspectRatio="none"
        style={{ top: WORLD_HEIGHT - 230, width: WORLD_WIDTH, height: 230 }}
      >
        <path d={duneFront} fill={`url(#sand-grad-${level})`} />
        {/* Pebbles & rocks */}
        {Array.from({ length: 26 }).map((_, i) => (
          <ellipse
            key={i}
            cx={(i / 26) * WORLD_WIDTH + 40 + ((i * 53) % 70)}
            cy={175 + ((i * 37) % 60)}
            rx={8 + ((i * 7) % 22)}
            ry={5 + ((i * 5) % 10)}
            fill="rgba(0,0,0,0.25)"
          />
        ))}
      </svg>

      {/* Caustic light net on the sand (shallow zones) */}
      {level !== 3 && (
        <div className="absolute left-0 overflow-hidden" style={{ top: WORLD_HEIGHT - 190, width: WORLD_WIDTH, height: 190, opacity: level === 1 ? 0.35 : 0.15 }}>
          <div
            className="ocean-caustic-a absolute -inset-y-10 left-0"
            style={{
              width: WORLD_WIDTH + 320,
              background: 'radial-gradient(ellipse 34px 14px, rgba(255,255,240,0.9) 0 30%, transparent 70%)',
              backgroundSize: '80px 46px'
            }}
          />
          <div
            className="ocean-caustic-b absolute -inset-y-10 left-0"
            style={{
              width: WORLD_WIDTH + 320,
              background: 'radial-gradient(ellipse 26px 18px, rgba(200,245,255,0.8) 0 30%, transparent 70%)',
              backgroundSize: '110px 60px'
            }}
          />
        </div>
      )}

      {/* ZONA 1 — living coral reef */}
      {level === 1 && (
        <>
          <BranchCoral x={140} y={1720} color="#f472b6" />
          <BrainCoral x={330} y={1850} color="#f59e0b" />
          <FanCoral x={600} y={1700} color="#c084fc" />
          <Anemone x={820} y={1800} color="#fb7185" tip="#fde68a" seed={3} />
          <BranchCoral x={1180} y={1740} color="#fb923c" scale={0.85} />
          <BrainCoral x={1360} y={1860} color="#a3e635" scale={0.9} />
          <FanCoral x={1650} y={1720} color="#f43f5e" scale={0.9} />
          <Anemone x={1900} y={1810} color="#a78bfa" tip="#fbcfe8" seed={7} scale={0.9} />
          <BranchCoral x={2180} y={1730} color="#38bdf8" />
          <BrainCoral x={2420} y={1855} color="#fb7185" />
          <Anemone x={2620} y={1795} color="#fb923c" tip="#fff7ed" seed={13} />
          <FanCoral x={2820} y={1710} color="#facc15" scale={0.8} />
        </>
      )}

      {/* ZONA 2 — sunken galleon & wreckage */}
      {level === 2 && (
        <>
          <Shipwreck x={430} y={1500} width={760} rotate={-7} />
          <Shipwreck x={2050} y={1640} width={460} rotate={12} flip />
          <Anemone x={1300} y={1830} color="#5eead4" tip="#ccfbf1" seed={17} scale={0.8} />
          <FanCoral x={1700} y={1740} color="#64748b" scale={0.9} />
          <BrainCoral x={2700} y={1870} color="#475569" scale={0.9} />
        </>
      )}

      {/* ZONA 3 — abyssal trench, vents & bioluminescence */}
      {level === 3 && (
        <>
          <Vent x={520} height={260} seed={5} />
          <Vent x={1660} height={330} seed={9} />
          <Vent x={2520} height={240} seed={15} />
          <Anglerfish x={980} y={1300} />
          <Anglerfish x={2200} y={880} />
          {plankton.map((pl, i) => (
            <span
              key={`pl-${i}`}
              className="ocean-twinkle absolute rounded-full"
              style={{
                left: pl.x,
                top: pl.y,
                width: pl.size,
                height: pl.size,
                background: pl.color,
                boxShadow: `0 0 ${pl.size * 3}px ${pl.color}`,
                animationDuration: `${pl.duration}s`,
                animationDelay: `-${pl.delay}s`
              }}
            />
          ))}
        </>
      )}

      {/* Kelp forest (in front of dunes) */}
      {kelps.map((k, i) => (
        <Kelp key={`kelp-${i}`} x={k.x} height={k.height} level={level} delay={k.delay} duration={k.duration} seed={i + level * 100} />
      ))}

      {/* Bubble columns */}
      {bubbleVents.map((v, i) => (
        <BubbleColumn key={`bv-${i}`} x={v.x} y={v.y} seed={i * 31 + level} rise={level === 3 ? 700 : 1000} />
      ))}

      {/* Marine snow / suspended particles */}
      {snow.map((s, i) => (
        <span
          key={`snow-${i}`}
          className="ocean-snow absolute rounded-full"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            background: p.snowColor,
            animationDuration: `${s.duration}s`,
            animationDelay: `-${s.delay}s`
          }}
        />
      ))}
    </div>
  );
};

export const OceanScenery = React.memo(OceanSceneryInner);
