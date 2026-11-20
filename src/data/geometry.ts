import type { Crack, Geometry, Kin, MasonryConfig, Pt, Span, Zone } from '../types/masonry';
import { getConfigKey } from './mechanisms';

// ---------- wall dimensions (SVG units) ----------
export const W = 576; // wall length: 9 bricks of 64
export const H = 351; // wall height: 13 courses of 27
export const R = 27; // course pitch = 24 brick + 3 mortar
export const N = 13; // number of courses
export const T = 72; // wall thickness shown in the side (cross-section) view

export const rowTop = (r: number) => H - R * (r + 1);
export const rowBot = (r: number) => H - R * r;
/** y of bed joint number j (joint 0 = base, joint j = bottom of course j) */
export const jointY = (j: number) => H - R * j;

/** x positions of head joints in a course (running bond: odd courses shifted by half a brick) */
export function headXs(r: number): number[] {
  const a: number[] = [];
  if (r % 2 === 0) {
    for (let x = 0; x <= W; x += 64) a.push(x);
  } else {
    a.push(0);
    for (let x = 32; x < W; x += 64) a.push(x);
    a.push(W);
  }
  return a;
}

// ---------- crack path builders (all deterministic) ----------

/** Horizontal crack along bed joint j between x0 and x1 */
const bed = (j: number, x0: number, x1: number, rev: Span[], kind: Crack['kind'] = 'joint'): Crack => ({
  pts: [[x0, jointY(j)], [x1, jointY(j)]],
  kind,
  rev,
});

/** Stair-stepped crack that follows head and bed joints along the line a -> b (starts at the lower point) */
function stairPts(a: Pt, b: Pt): Pt[] {
  const [lo, hi] = a[1] > b[1] ? [a, b] : [b, a];
  const rowOf = (y: number) => Math.max(0, Math.min(N - 1, Math.floor((H - y) / R)));
  const pts: Pt[] = [];
  for (let r = rowOf(lo[1]); r <= rowOf(hi[1]); r++) {
    const ymid = rowTop(r) + R / 2;
    const t = (lo[1] - ymid) / (lo[1] - hi[1]);
    const x = lo[0] + (hi[0] - lo[0]) * t;
    const hs = headXs(r).filter((h) => h > 0 && h < W);
    const xh = hs.reduce((best, h) => (Math.abs(h - x) < Math.abs(best - x) ? h : best), hs[0]);
    pts.push([xh, rowBot(r)], [xh, rowTop(r)]);
  }
  return pts;
}
const stair = (a: Pt, b: Pt, rev: Span[]): Crack => ({ pts: stairPts(a, b), kind: 'joint', rev });

/** Jagged crack that cuts through brick units from a to b (fixed pseudo-random offsets, same every time) */
function jag(a: Pt, b: Pt, rev: Span[], amp = 3): Crack {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const n = Math.max(2, Math.round(len / 14));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const off = i === 0 || i === n ? 0 : amp * Math.sin(i * 2.7 + a[0] * 0.13 + a[1] * 0.07);
    pts.push([a[0] + dx * t + (-dy / len) * off, a[1] + dy * t + (dx / len) * off]);
  }
  return { pts, kind: 'unit', rev };
}

/** Visible span per stage, centred at c; widths w2..w4 are for stages 2, 3 and 4 (stage 0 and 1 show no crack) */
const rv = (c: number, w2: number, w3: number, w4: number): Span[] => {
  const sp = (w: number): Span => (w <= 0 ? [0, 0] : [Math.max(0, c - w / 2), Math.min(1, c + w / 2)]);
  return [[0, 0], [0, 0], sp(w2), sp(w3), sp(w4)];
};


/** One crack that climbs course by course, using the head joint nearest to the target x of each course */
function stepRows(r0: number, r1: number, xt: (r: number) => number): Pt[] {
  const pts: Pt[] = [];
  for (let r = r0; r <= r1; r++) {
    const hs = headXs(r).filter((h) => h > 0 && h < W);
    const x = xt(r);
    const xh = hs.reduce((best, h) => (Math.abs(h - x) < Math.abs(best - x) ? h : best), hs[0]);
    pts.push([xh, rowBot(r)], [xh, rowTop(r)]);
  }
  return pts;
}

/** Jagged crack through bricks along a chain of points */
function jagPoly(chain: Pt[], rev: Span[], amp = 3): Crack {
  const pts: Pt[] = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const seg = jag(chain[i], chain[i + 1], rev, amp).pts;
    pts.push(...(i === 0 ? seg : seg.slice(1)));
  }
  return { pts, kind: 'unit', rev };
}

interface PanelOpts {
  hj: number; // joint number of the horizontal crack (bending about a horizontal axis)
  xIn: number; // x of the left end of the horizontal crack
  xv?: number; // x of the near-vertical cracks beside the side supports
  rD?: number; // course where the diagonals turn into the vertical cracks
  mode: 'joint' | 'unit'; // crack follows the mortar joints, or cuts through the bricks
  hRev: Span[]; // reveal of the horizontal crack
  dRev: Span[]; // reveal of the diagonal and vertical cracks
}

/**
 * Crack pattern of a wall supported at both sides and at the base, with a free top (out-of-plane pressure):
 * a horizontal crack above the base, stair-stepped diagonal cracks from its ends up to the top corners,
 * and short near-vertical cracks beside the side supports.
 */
function panel(o: PanelOpts): Crack[] {
  const xv = o.xv ?? 64;
  const rD = o.rD ?? 8;
  const xt = (r: number) => (r <= rD ? o.xIn + ((xv - o.xIn) * (r - o.hj)) / (rD - o.hj) : xv);
  const yj = jointY(o.hj);
  if (o.mode === 'joint') {
    const left = stepRows(o.hj, N - 1, xt);
    const right = stepRows(o.hj, N - 1, (r) => W - xt(r));
    return [
      { pts: [[left[0][0], yj], [right[0][0], yj]], kind: 'joint', rev: o.hRev },
      { pts: left, kind: 'joint', rev: o.dRev },
      { pts: right, kind: 'joint', rev: o.dRev },
    ];
  }
  const diag = (m: number): Pt[] => [
    [m === 1 ? o.xIn : W - o.xIn, yj],
    [m === 1 ? xv + 22 : W - xv - 22, jointY(rD + 1)],
    [m === 1 ? xv : W - xv, 0],
  ];
  return [
    jag([o.xIn, yj], [W - o.xIn, yj], o.hRev),
    jagPoly(diag(1), o.dRev),
    jagPoly(diag(-1), o.dRev),
  ];
}

const sideCrack = (j: number, rev: Span[], kind: Crack['kind'] = 'joint'): Crack => ({
  pts: [[0, jointY(j)], [T, jointY(j)]],
  kind,
  rev,
});

const zone = (x: number, y: number, w: number, h: number, lv: number[]): Zone => ({ x, y, w, h, lv });
const kin = (p: Partial<Kin>): Kin => ({
  shear: [0, 0, 0, 0, 0],
  slides: [],
  rock: null,
  open: [],
  bend: [0, 0, 0, 0, 0],
  ...p,
});

const TOE: Pt = [W, H];

// ---------- the 16 geometries, in matrix order (#1 ... #16) ----------
const GEOMS: Geometry[] = [
  // 1 In-plane / Low / Weak / Weak : bed-joint sliding + minor stair-stepping + weak-brick corner chipping
  {
    kin: kin({ shear: [0, 1, 2, 3, 5], slides: [{ joint: 3, d: [0, 2, 7, 16, 30] }] }),
    face: {
      cracks: [
        bed(3, 0, W, rv(0.5, 0.3, 0.8, 2)),
        bed(6, 110, W - 50, rv(0.5, 0, 0.5, 1.4)),
        stair([140, H - 110], [330, 90], rv(0.5, 0, 0.4, 1)),
      ],
      zones: [zone(W - 64, H - R, 64, R, [0, 0, 0, 0.3, 0.55])],
    },
    side: null,
    panel: null,
  },
  // 2 In-plane / Low / Weak / Strong : clean horizontal bed-joint slip, bricks intact
  {
    kin: kin({
      shear: [0, 0.8, 1.5, 3, 5],
      slides: [
        { joint: 6, d: [0, 2, 6, 14, 26] },
        { joint: 0, d: [0, 1, 3, 7, 12] },
      ],
    }),
    face: {
      cracks: [bed(6, 0, W, rv(0.5, 0.3, 0.8, 2)), bed(0, 0, W, rv(0.5, 0, 0.6, 2))],
      zones: [],
    },
    side: null,
    panel: null,
  },
  // 3 In-plane / Low / Strong / Weak : rocking with cracks through weak bricks along the compression strut
  {
    kin: kin({ shear: [0, 0.5, 1, 2, 3], rock: { joint: 0, phi: [0, 0.3, 0.8, 1.8, 3.2] } }),
    face: {
      cracks: [
        jag([W - 20, H - 10], [W - 200, H - 160], rv(0.5, 0.3, 0.8, 1.5)),
        jag([W - 40, H - 6], [W - 280, H - 270], rv(0.5, 0, 0.4, 1.2)),
        jag([W - 170, H - 3], [W - 160, H - 130], rv(0.5, 0, 0.5, 1.3)),
      ],
      zones: [zone(W - 150, H - 2 * R, 150, 2 * R, [0, 0, 0.4, 0.8, 1])],
    },
    side: null,
    panel: null,
  },
  // 4 In-plane / Low / Strong / Strong : rocking about the toe, minimal unit cracking
  {
    kin: kin({ shear: [0, 0.3, 0.7, 1, 1.5], rock: { joint: 0, phi: [0, 0.25, 0.7, 1.4, 2.4] } }),
    face: {
      cracks: [bed(0, 0, W, rv(0, 0, 0.8, 2.4))],
      zones: [zone(W - 70, H - R, 70, R, [0, 0, 0, 0.15, 0.5])],
    },
    side: null,
    panel: null,
  },
  // 5 In-plane / High / Weak / Weak : stair-stepped cracks turning into a diagonal through bricks + toe crushing
  {
    kin: kin({ shear: [0, 2, 5, 11, 22] }),
    face: {
      cracks: [
        stair([330, 200], [60, 40], rv(0.5, 0.35, 0.9, 1.5)),
        jag([330, 200], [W - 40, H - 8], rv(0.5, 0, 0.6, 1.4)),
      ],
      zones: [zone(W - 130, H - 3 * R, 130, 3 * R, [0, 0, 0.35, 0.7, 1])],
    },
    side: null,
    panel: null,
  },
  // 6 In-plane / High / Weak / Strong : stair-stepped diagonal along joints + toe crushing
  {
    kin: kin({ shear: [0, 2, 5, 10, 18] }),
    face: {
      cracks: [
        stair([60, 40], [W - 60, H - 8], rv(0.5, 0.3, 0.8, 1.5)),
        stair([220, 25], [W - 20, H - 120], rv(0.5, 0, 0.5, 1.2)),
      ],
      zones: [zone(W - 110, H - 2 * R, 110, 2 * R, [0, 0, 0.25, 0.55, 0.85])],
    },
    side: null,
    panel: null,
  },
  // 7 In-plane / High / Strong / Weak : diagonal cracks cutting through weak bricks + toe crushing
  {
    kin: kin({ shear: [0, 1.5, 3.5, 7, 12], rock: { joint: 0, phi: [0, 0, 0.2, 0.5, 0.9] } }),
    face: {
      cracks: [
        jag([50, 35], [W - 45, H - 6], rv(0.5, 0.3, 0.75, 1.5)),
        jag([160, 20], [W - 20, H - 150], rv(0.5, 0, 0.5, 1.2)),
      ],
      zones: [zone(W - 150, H - 3 * R, 150, 3 * R, [0, 0, 0.3, 0.7, 1])],
    },
    side: null,
    panel: null,
  },
  // 8 In-plane / High / Strong / Strong : toe crushing first, diagonal compression distress near the end
  {
    kin: kin({ shear: [0, 1, 2, 3.5, 6], rock: { joint: 0, phi: [0, 0, 0.1, 0.3, 0.6] } }),
    face: {
      cracks: [jag([50, 35], [W - 45, H - 6], rv(0.5, 0, 0.5, 1.2))],
      zones: [zone(W - 120, H - 2 * R, 120, 2 * R, [0, 0, 0.35, 0.7, 1])],
    },
    side: null,
    panel: null,
  },
  // 9 Out-of-plane / Low / Weak / Weak : horizontal crack low in the wall, stair-stepped diagonals along joints, weak bricks crumble
  {
    kin: kin({ bend: [0, 0.05, 0.12, 0.2, 0.3], open: [{ joint: 3, phi: [0, 0.4, 1.4, 3.5, 7] }] }),
    face: {
      cracks: panel({ hj: 3, xIn: 190, mode: 'joint', hRev: rv(0.5, 0.5, 1.2, 2), dRev: rv(0, 0, 0.9, 2.1) }),
      zones: [],
    },
    side: {
      cracks: [sideCrack(3, rv(0, 0.8, 1.6, 2.4))],
      zones: [zone(T - 26, jointY(3) - 16, 26, 32, [0, 0, 0, 0.3, 0.6])],
    },
    panel: { hj: 3, xIn: 190, xv: 64, rD: 8 },
  },
  // 10 Out-of-plane / Low / Weak / Strong : same stepped pattern along joints, central block rocks far out (overturning risk)
  {
    kin: kin({ bend: [0, 0.03, 0.06, 0.1, 0.15], open: [{ joint: 3, phi: [0, 0.4, 1.6, 4.5, 10] }] }),
    face: {
      cracks: panel({ hj: 3, xIn: 170, mode: 'joint', hRev: rv(0.5, 0.6, 1.3, 2), dRev: rv(0, 0, 1, 2.2) }),
      zones: [],
    },
    side: { cracks: [sideCrack(3, rv(0, 0.8, 1.6, 2.4))], zones: [] },
    panel: { hj: 3, xIn: 170, xv: 64, rD: 8 },
  },
  // 11 Out-of-plane / Low / Strong / Weak : cracks cut through the weak bricks as straighter diagonals
  {
    kin: kin({ bend: [0, 0.08, 0.2, 0.35, 0.5], open: [{ joint: 3, phi: [0, 0.2, 0.8, 2.2, 5] }] }),
    face: {
      cracks: panel({ hj: 3, xIn: 200, mode: 'unit', hRev: rv(0.5, 0.6, 1.4, 2), dRev: rv(0, 0, 0.9, 2.1) }),
      zones: [],
    },
    side: {
      cracks: [sideCrack(3, rv(0, 0.8, 1.6, 2.4), 'unit')],
      zones: [zone(T - 28, jointY(3) - 14, 28, 28, [0, 0, 0.2, 0.6, 1])],
    },
    panel: { hj: 3, xIn: 200, xv: 64, rD: 8 },
  },
  // 12 Out-of-plane / Low / Strong / Strong : mostly bending; thin horizontal crack late, diagonals only at the end
  {
    kin: kin({ bend: [0, 0.1, 0.25, 0.45, 0.7], open: [{ joint: 3, phi: [0, 0, 0.2, 0.8, 2.2] }] }),
    face: {
      cracks: panel({ hj: 3, xIn: 210, mode: 'joint', hRev: rv(0.5, 0, 0.6, 1.5), dRev: rv(0, 0, 0, 1.2) }),
      zones: [],
    },
    side: { cracks: [sideCrack(3, rv(0, 0, 0.8, 1.6))], zones: [] },
    panel: { hj: 3, xIn: 210, xv: 64, rD: 8 },
  },
  // 13 Out-of-plane / High / Weak / Weak : horizontal crack higher up, stepped diagonals, weak bricks crushed on the compression side
  {
    kin: kin({ bend: [0, 0.04, 0.08, 0.14, 0.2], open: [{ joint: 5, phi: [0, 0.3, 1, 2.4, 4.5] }] }),
    face: {
      cracks: panel({ hj: 5, xIn: 170, mode: 'joint', hRev: rv(0.5, 0.5, 1.2, 2), dRev: rv(0, 0, 0.9, 2.1) }),
      zones: [],
    },
    side: {
      cracks: [sideCrack(5, rv(0, 0.8, 1.6, 2.4))],
      zones: [
        zone(T - 26, jointY(5) - 16, 26, 32, [0, 0, 0.2, 0.6, 1]),
        zone(T - 24, H - R, 24, R, [0, 0, 0, 0.3, 0.7]),
      ],
    },
    panel: { hj: 5, xIn: 170, xv: 64, rD: 9 },
  },
  // 14 Out-of-plane / High / Weak / Strong : long horizontal crack along a weak bed joint, stepped diagonals, arching distress
  {
    kin: kin({ bend: [0, 0.04, 0.08, 0.12, 0.18], open: [{ joint: 5, phi: [0, 0.3, 1, 2.4, 4.5] }] }),
    face: {
      cracks: panel({ hj: 5, xIn: 140, mode: 'joint', hRev: rv(0.5, 0.5, 1.2, 2), dRev: rv(0, 0, 1, 2.2) }),
      zones: [],
    },
    side: {
      cracks: [sideCrack(5, rv(0, 0.8, 1.6, 2.4))],
      zones: [zone(T - 24, jointY(5) - 14, 24, 28, [0, 0, 0, 0.3, 0.6])],
    },
    panel: { hj: 5, xIn: 140, xv: 64, rD: 9 },
  },
  // 15 Out-of-plane / High / Strong / Weak : cracks through the weak bricks, crushing on the compression face
  {
    kin: kin({ bend: [0, 0.05, 0.1, 0.18, 0.26], open: [{ joint: 5, phi: [0, 0.25, 0.8, 2, 4] }] }),
    face: {
      cracks: panel({ hj: 5, xIn: 180, mode: 'unit', hRev: rv(0.5, 0.5, 1.3, 2), dRev: rv(0, 0, 0.9, 2.1) }),
      zones: [],
    },
    side: {
      cracks: [sideCrack(5, rv(0, 0.8, 1.6, 2.4), 'unit')],
      zones: [zone(T - 30, jointY(5) - 18, 30, 36, [0, 0, 0.25, 0.65, 1])],
    },
    panel: { hj: 5, xIn: 180, xv: 64, rD: 9 },
  },
  // 16 Out-of-plane / High / Strong / Strong : stiff; thin cracks only late, compression-zone distress near the crack and base
  {
    kin: kin({ bend: [0, 0.06, 0.14, 0.26, 0.4], open: [{ joint: 5, phi: [0, 0, 0.2, 0.7, 1.8] }] }),
    face: {
      cracks: panel({ hj: 5, xIn: 190, mode: 'joint', hRev: rv(0.5, 0, 0.5, 1.6), dRev: rv(0, 0, 0, 1.3) }),
      zones: [],
    },
    side: {
      cracks: [sideCrack(5, rv(0, 0, 1, 2))],
      zones: [
        zone(T - 22, jointY(5) - 12, 22, 24, [0, 0, 0, 0.3, 0.8]),
        zone(T - 30, H - R, 30, R, [0, 0, 0, 0.2, 0.5]),
      ],
    },
    panel: { hj: 5, xIn: 190, xv: 64, rD: 9 },
  },
];

// Matrix order: index = loading*8 + precompression*4 + mortar*2 + brick (0 = in-plane/low/weak)
export const MATRIX_ORDER: MasonryConfig[] = [];
for (const l of ['in-plane', 'out-of-plane'] as const)
  for (const p of ['low', 'high'] as const)
    for (const m of ['weak', 'strong'] as const)
      for (const b of ['weak', 'strong'] as const)
        MATRIX_ORDER.push({ loadingType: l, precompression: p, mortarStrength: m, brickStrength: b });

const GEOM_BY_KEY: Record<string, Geometry> = {};
MATRIX_ORDER.forEach((c, i) => {
  GEOM_BY_KEY[getConfigKey(c)] = GEOMS[i];
});

export function getGeometry(config: MasonryConfig): Geometry {
  const g = GEOM_BY_KEY[getConfigKey(config)];
  if (!g) throw new Error(`Missing geometry for ${getConfigKey(config)}`);
  return g;
}

export { TOE };
