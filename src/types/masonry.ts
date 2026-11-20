export type LoadingType = 'in-plane' | 'out-of-plane';
export type PrecompressionLevel = 'low' | 'high';
export type StrengthLevel = 'weak' | 'strong';
export type StageIndex = 0 | 1 | 2 | 3 | 4;

export interface MasonryConfig {
  loadingType: LoadingType;
  precompression: PrecompressionLevel;
  mortarStrength: StrengthLevel;
  brickStrength: StrengthLevel;
}

export type MechanismKind =
  | 'bed-joint-sliding'
  | 'stair-step-cracking'
  | 'through-brick-diagonal'
  | 'rocking'
  | 'toe-crushing'
  | 'flexural-cracking'
  | 'out-of-plane-rocking'
  | 'bending-crushing';

export interface MechanismProfile {
  id: string;
  config: MasonryConfig;
  title: string;
  kind: MechanismKind;
  crackPattern:
    | 'horizontal-joints'
    | 'stair-step'
    | 'diagonal-brick'
    | 'rocking-toe'
    | 'flexural-bending'
    | 'overturning-bending';
  firstDamageLocation: string;
  crackPath: string; // how cracks / damage progress over stages 2-4
  summary: string; // one-line engineering summary
  mechanismExplanation: string;
  materialInfluence: string;
  precompressionInfluence: string;
}

// ---- geometry / animation data used by the 2D drawing ----

export type Pt = [number, number];
/** visible part of a crack path at each stage, as [from, to] fractions of its length */
export type Span = [number, number];

export interface Crack {
  pts: Pt[];
  kind: 'joint' | 'unit'; // along mortar joints, or through brick units
  rev: Span[]; // 5 entries, one per stage
}

export interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
  lv: number[]; // damage level 0..1 at each of the 5 stages
}

export interface Kin {
  shear: number[]; // in-plane lateral drift at the top (px), spread evenly over the courses
  slides: { joint: number; d: number[] }[]; // sliding (px) along a bed joint
  rock: { joint: number; phi: number[] } | null; // rotation (deg) about the right-hand toe of a joint
  open: { joint: number; phi: number[] }[]; // joint opening by rotation (deg) about the compression edge
  bend: number[]; // curvature: small rotation (deg) added at every joint above the base (out-of-plane)
}

export interface Geometry {
  kin: Kin;
  face: { cracks: Crack[]; zones: Zone[] };
  side: { cracks: Crack[]; zones: Zone[] } | null;
  /** out-of-plane only: where the horizontal crack sits and how the diagonals run (used for the bending labels) */
  panel: { hj: number; xIn: number; xv: number; rD: number } | null;
}
