import type { ReactElement, ReactNode } from 'react';
import { getGeometry, H, headXs, jointY, N, R, rowTop, T, W } from '../data/geometry';
import type { Crack, Kin, MasonryConfig, Span, Zone } from '../types/masonry';

// ---------- colours: strength is shown by colour so every control is visible ----------
const BRICK = { weak: '#e2b595', strong: '#a5462d' };
const MORTAR = { weak: '#ebe6da', strong: '#6c6963' };
const BLUE = '#1d4ed8';
const AMBER = '#b45309';

// ---------- small helpers ----------
/** value of a 5-entry stage array at a (possibly fractional) stage */
const at = (a: number[], s: number): number => {
  const i = Math.min(4, Math.max(0, Math.floor(s)));
  const j = Math.min(4, i + 1);
  const f = s - i;
  return a[i] * (1 - f) + a[j] * f;
};
const spanAt = (sp: Span[], s: number): Span => {
  const i = Math.min(4, Math.max(0, Math.floor(s)));
  const j = Math.min(4, i + 1);
  const f = s - i;
  return [sp[i][0] * (1 - f) + sp[j][0] * f, sp[i][1] * (1 - f) + sp[j][1] * f];
};
const mix = (a: string, b: string, t: number): string => {
  const pa = [1, 3, 5].map((k) => parseInt(a.slice(k, k + 2), 16));
  const pb = [1, 3, 5].map((k) => parseInt(b.slice(k, k + 2), 16));
  return `rgb(${pa.map((v, k) => Math.round(v + (pb[k] - v) * t)).join(',')})`;
};
const zoneLevel = (z: Zone, s: number) => at(z.lv, s);

/** transform of the group holding course j and everything above it (nested, so movements add up) */
function jointTransform(kin: Kin, s: number, j: number, pivotX: number): string {
  let dx = at(kin.shear, s) / N;
  for (const sl of kin.slides) if (sl.joint === j) dx += at(sl.d, s);
  let phi = 0;
  if (kin.rock && kin.rock.joint === j) phi += at(kin.rock.phi, s);
  for (const o of kin.open) if (o.joint === j) phi += at(o.phi, s);
  if (j > 0) phi += at(kin.bend, s);
  return `translate(${dx.toFixed(3)} 0) rotate(${phi.toFixed(3)} ${pivotX} ${jointY(j)})`;
}

// ---------- crack drawing ----------
function CrackLine({ c, s }: { c: Crack; s: number }) {
  const [a, b] = spanAt(c.rev, s);
  if (b - a < 0.004) return null;
  const d = 'M' + c.pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L');
  // pathLength=1 lets the dash pattern reveal exactly the fraction [a, b] of the crack
  const dash = a <= 0.0005 ? `${b} 2` : `0 ${a} ${b - a} 2`;
  return (
    <g fill="none" strokeLinejoin="round">
      <path d={d} pathLength={1} strokeDasharray={dash} stroke="#fff" strokeOpacity={0.6} strokeWidth={4.6} />
      <path
        d={d}
        pathLength={1}
        strokeDasharray={dash}
        stroke={c.kind === 'joint' ? '#d4001f' : '#111827'}
        strokeWidth={c.kind === 'joint' ? 2.4 : 2.7}
      />
    </g>
  );
}

function ZoneOverlay({ zones, s, r }: { zones: Zone[]; s: number; r: number }) {
  return (
    <>
      {zones.map((z, i) => {
        const lv = zoneLevel(z, s);
        if (lv < 0.02) return null;
        if (z.y > rowTop(r) + R || z.y + z.h < rowTop(r)) return null;
        return <rect key={i} x={z.x} y={z.y} width={z.w} height={z.h} fill="url(#crush)" opacity={Math.min(1, lv)} />;
      })}
    </>
  );
}

// ---------- nesting of the 13 courses ----------
function Nest({
  r,
  tf,
  course,
  top,
}: {
  r: number;
  tf: (j: number) => string;
  course: (r: number) => ReactNode;
  top: ReactNode;
}): ReactElement {
  return (
    <g transform={tf(r)}>
      {course(r)}
      {r < N - 1 ? <Nest r={r + 1} tf={tf} course={course} top={top} /> : top}
    </g>
  );
}

// ---------- arrows ----------
function Arrow({ x1, y1, x2, y2, color, w = 3 }: { x1: number; y1: number; x2: number; y2: number; color: string; w?: number }) {
  const ang = Math.atan2(y2 - y1, x2 - x1);
  const hs = 8 + w * 1.6;
  const hx = x2 - Math.cos(ang) * hs;
  const hy = y2 - Math.sin(ang) * hs;
  const nx = -Math.sin(ang) * hs * 0.55;
  const ny = Math.cos(ang) * hs * 0.55;
  return (
    <g>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={w} />
      <polygon points={`${x2},${y2} ${hx + nx},${hy + ny} ${hx - nx},${hy - ny}`} fill={color} />
    </g>
  );
}

function AxialArrows({ high, x0, width, count, label = true }: { high: boolean; x0: number; width: number; count?: number; label?: boolean }) {
  const n = count ?? (high ? 7 : 3);
  const len = high ? 54 : 26;
  const w = high ? 5 : 2.2;
  const xs = Array.from({ length: n }, (_, i) => x0 + (width * (i + 0.5)) / n);
  return (
    <g>
      {xs.map((x, i) => (
        <Arrow key={i} x1={x} y1={-len - 6} x2={x} y2={-4} color={AMBER} w={w} />
      ))}
      {label && (
        <text x={x0 + width / 2} y={-len - 14} textAnchor="middle" fontSize={13} fill={AMBER} fontWeight={600}>
          {high ? 'High axial precompression' : 'Low axial precompression'}
        </text>
      )}
    </g>
  );
}

// ---------- shared SVG definitions ----------
function Defs({ id, width }: { id: string; width: number }) {
  return (
    <defs>
      <pattern id="crush" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width={6} height={6} fill="#5b1a10" opacity={0.45} />
        <line x1={0} y1={0} x2={0} y2={6} stroke="#2a0805" strokeWidth={2} />
      </pattern>
      <pattern id="ground" width={8} height={8} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width={8} height={8} fill="#cbd5e1" />
        <line x1={0} y1={0} x2={0} y2={8} stroke="#64748b" strokeWidth={1.5} />
      </pattern>
      {Array.from({ length: N }, (_, r) => (
        <clipPath key={r} id={`${id}-${r}`}>
          <rect x={-30} y={rowTop(r) - 2} width={width + 60} height={R + 4} />
        </clipPath>
      ))}
    </defs>
  );
}


// ---------- labels for the three bending actions of a wall supported on three sides ----------
function BendingLabels({ s, hj, xIn, xv, rD }: { s: number; hj: number; xIn: number; xv: number; rD: number }) {
  const op = Math.max(0, Math.min(1, s - 1.6)); // fade in once cracks start
  if (op <= 0) return null;
  const tag = (x: number, y: number, text: string, anchor: 'start' | 'middle' | 'end' = 'middle') => (
    <g>
      <text x={x} y={y} textAnchor={anchor} fontSize={13} fontWeight={700} fill="#111827" stroke="#fff" strokeWidth={4} paintOrder="stroke">
        {text}
      </text>
    </g>
  );
  const yDiag = (jointY(hj) + jointY(rD)) / 2;
  const xDiag = xIn + ((xv - xIn) * (yDiag - jointY(hj))) / (jointY(rD) - jointY(hj));
  return (
    <g opacity={op}>
      {tag(W / 2, jointY(hj) + 24, 'Vertical bending')}
      {tag(xDiag + 28, yDiag + 5, 'Diagonal bending', 'start')}
      {tag(xv + 30, 18, 'Horizontal bending', 'start')}
    </g>
  );
}

// ---------- face (elevation) view of the wall ----------
function brickRects(r: number): { x: number; w: number }[] {
  const hs = headXs(r);
  const out: { x: number; w: number }[] = [];
  for (let i = 0; i < hs.length - 1; i++) out.push({ x: hs[i], w: hs[i + 1] - hs[i] });
  return out;
}

function FaceWall({ config, s }: { config: MasonryConfig; s: number }) {
  const g = getGeometry(config);
  const inPlane = config.loadingType === 'in-plane';
  const high = config.precompression === 'high';
  const mortar = MORTAR[config.mortarStrength];
  const brick = BRICK[config.brickStrength];

  const course = (r: number) => (
    <g>
      <rect x={0} y={rowTop(r)} width={W} height={R} fill={mortar} />
      {brickRects(r).map((b, i) => {
        const cx = b.x + b.w / 2;
        const cy = rowTop(r) + R / 2;
        let lv = 0;
        for (const z of g.face.zones) {
          if (cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h) lv = Math.max(lv, zoneLevel(z, s));
        }
        return (
          <rect
            key={i}
            x={b.x + 1.5}
            y={rowTop(r) + 1.5}
            width={b.w - 3}
            height={R - 3}
            rx={1.5}
            fill={lv > 0 ? mix(brick, '#4a1a12', Math.min(1, lv) * 0.75) : brick}
          />
        );
      })}
      <ZoneOverlay zones={g.face.zones} s={s} r={r} />
      <g clipPath={`url(#f-${r})`}>
        {g.face.cracks.map((c, i) => (
          <CrackLine key={i} c={c} s={s} />
        ))}
      </g>
    </g>
  );

  // loads that move with the top of the wall
  const top = (
    <g>
      <AxialArrows high={high} x0={0} width={W} />
      {inPlane && (
        <g>
          <Arrow x1={-100} y1={R / 2} x2={-4} y2={R / 2} color={BLUE} w={5} />
          <text x={-104} y={R / 2 - 18} textAnchor="end" fontSize={13} fill={BLUE} fontWeight={600}>
            <tspan x={-104}>Lateral load</tspan>
            <tspan x={-104} dy={15}>(in-plane)</tspan>
          </text>
        </g>
      )}
    </g>
  );

  const tf = (j: number) => (inPlane ? jointTransform(g.kin, s, j, W) : '');

  return (
    <g>
      <Nest r={0} tf={tf} course={course} top={top} />
      {/* footing / support */}
      <rect x={-40} y={H} width={W + 80} height={22} fill="url(#ground)" stroke="#475569" />
      <text x={W / 2} y={H + 44} textAnchor="middle" fontSize={13} fill="#334155">
        {inPlane ? 'Base restrained by the foundation (toe at right, heel at left)' : 'Supported at both sides and at the base, top free'}
      </text>

      {!inPlane && (
        <path d={`M-3 -2 V${H + 3} H${W + 3} V-2`} fill="none" stroke="#111827" strokeWidth={6} strokeLinejoin="miter" />
      )}
      {!inPlane && g.panel && <BendingLabels s={s} hj={g.panel.hj} xIn={g.panel.xIn} xv={g.panel.xv} rD={g.panel.rD} />}
      {!inPlane && (
        <g stroke="#2563eb" fill="none" opacity={0.85}>
          {[0, 1, 2, 3, 4].map((ri) =>
            [0, 1, 2, 3, 4].map((ci) => (
              <g key={`${ri}-${ci}`} transform={`translate(${60 + ci * 114} ${34 + ri * 70})`}>
                <circle r={10} fill="#fff" fillOpacity={0.8} strokeWidth={2} />
                <path d="M-6 -6 L6 6 M6 -6 L-6 6" strokeWidth={2} />
              </g>
            ))
          )}
        </g>
      )}
    </g>
  );
}

// ---------- side (cross-section) view, used for out-of-plane loading ----------
function SideWall({ config, s }: { config: MasonryConfig; s: number }) {
  const g = getGeometry(config);
  const side = g.side!;
  const high = config.precompression === 'high';
  const mortar = MORTAR[config.mortarStrength];
  const brick = BRICK[config.brickStrength];

  const course = (r: number) => {
    let lv = 0;
    for (const z of side.zones) {
      if (z.y < rowTop(r) + R && z.y + z.h > rowTop(r)) lv = Math.max(lv, zoneLevel(z, s));
    }
    return (
      <g>
        <rect x={0} y={rowTop(r)} width={T} height={R} fill={mortar} />
        <rect
          x={1.5}
          y={rowTop(r) + 1.5}
          width={T - 3}
          height={R - 3}
          rx={1.5}
          fill={lv > 0 ? mix(brick, '#4a1a12', Math.min(1, lv) * 0.6) : brick}
        />
        <ZoneOverlay zones={side.zones} s={s} r={r} />
        <g clipPath={`url(#s-${r})`}>
          {side.cracks.map((c, i) => (
            <CrackLine key={i} c={c} s={s} />
          ))}
        </g>
      </g>
    );
  };

  const top = (
    <g>
      <AxialArrows high={high} x0={4} width={T - 8} count={high ? 4 : 2} label={false} />
    </g>
  );

  const tf = (j: number) => jointTransform(g.kin, s, j, T);

  return (
    <g>
      {/* pressure on the left face */}
      {Array.from({ length: 8 }, (_, i) => (
        <Arrow key={i} x1={-92} y1={24 + i * 44} x2={-6} y2={24 + i * 44} color={BLUE} w={3} />
      ))}
      <text x={-50} y={-6} textAnchor="middle" fontSize={13} fill={BLUE} fontWeight={600}>
        Out-of-plane pressure
      </text>
      <Nest r={0} tf={tf} course={course} top={top} />
      <text x={T / 2} y={-68} textAnchor="middle" fontSize={13} fill={AMBER} fontWeight={600}>
        {high ? 'High axial precompression' : 'Low axial precompression'}
      </text>
      <rect x={-24} y={H} width={T + 48} height={22} fill="url(#ground)" stroke="#475569" />
      <text x={-4} y={H + 44} textAnchor="start" fontSize={12} fill="#334155">
        Tension face (loaded)
      </text>
      <text x={T + 4} y={H + 60} textAnchor="end" fontSize={12} fill="#334155">
        Compression face
      </text>
    </g>
  );
}

// ---------- main component ----------
export default function MasonryWallView({ config, stage }: { config: MasonryConfig; stage: number }) {
  const inPlane = config.loadingType === 'in-plane';
  return (
    <svg
      viewBox={inPlane ? '0 0 920 540' : '0 0 1140 560'}
      className="h-full w-full"
      role="img"
      aria-label="2D masonry wall visualization"
    >
      <Defs id="f" width={W} />
      <Defs id="s" width={T} />
      {inPlane ? (
        <g transform="translate(190 92)">
          <FaceWall config={config} s={stage} />
        </g>
      ) : (
        <>
          <g transform="translate(70 118)">
            <FaceWall config={config} s={stage} />
          </g>
          <g transform="translate(820 118)">
            <SideWall config={config} s={stage} />
          </g>
          <text x={358} y={22} textAnchor="middle" fontSize={14} fontWeight={700} fill="#0f172a">
            Face view (crack pattern)
          </text>
          <text x={856} y={22} textAnchor="middle" fontSize={14} fontWeight={700} fill="#0f172a">
            Side view (section through the middle)
          </text>
        </>
      )}
    </svg>
  );
}
