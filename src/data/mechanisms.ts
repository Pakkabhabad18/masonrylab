import type {
  MasonryConfig,
  MechanismKind,
  MechanismProfile,
  StageIndex,
} from '../types/masonry';

export function getConfigKey(config: MasonryConfig): string {
  return `${config.loadingType}__${config.precompression}__${config.mortarStrength}__${config.brickStrength}`;
}

export function getMechanismProfile(
  config: MasonryConfig,
  profiles: Record<string, MechanismProfile> = PROFILES,
): MechanismProfile {
  const key = getConfigKey(config);
  const match = profiles[key];
  if (!match) {
    throw new Error(`Missing deterministic mechanism profile for key: ${key}`);
  }
  return match;
}

export const STAGE_NAMES = [
  'Undamaged wall',
  'Initial loading and deformation',
  'Crack initiation',
  'Crack propagation',
  'Final failure',
];

// ---------------------------------------------------------------------------
// Short per-stage captions, shared by mechanisms of the same family.
// ---------------------------------------------------------------------------
type Family = 'slide' | 'rock' | 'stair' | 'diag' | 'overturn' | 'flex';

const FAMILY_OF: Record<MechanismKind, Family> = {
  'bed-joint-sliding': 'slide',
  rocking: 'rock',
  'stair-step-cracking': 'stair',
  'through-brick-diagonal': 'diag',
  'toe-crushing': 'diag',
  'flexural-cracking': 'flex',
  'out-of-plane-rocking': 'overturn',
  'bending-crushing': 'flex',
};

const STAGE_NOTES: Record<Family, string[]> = {
  slide: [
    'The wall is undamaged. Load arrows show the lateral load and the axial load.',
    'The wall shears slightly. Joints are still closed and no cracks are visible.',
    'A hairline crack opens in a bed joint and the joint starts to slip.',
    'The crack runs along the joint and the part of the wall above it slides as a block.',
    'Large sliding along the joint. The wall has failed by sliding, and the bricks are mostly intact.',
  ],
  rock: [
    'The wall is undamaged. Load arrows show the lateral load and the axial load.',
    'Small lateral drift. No cracks are visible yet.',
    'The heel begins to lift and damage starts at the base and at the compressed toe.',
    'Rocking grows. The toe takes concentrated compression and cracks extend from it.',
    'Large rotation about the toe. The wall has failed by rocking at its base.',
  ],
  stair: [
    'The wall is undamaged. Load arrows show the lateral load and the axial load.',
    'The wall shears slightly. The joints are still closed.',
    'Cracks start in the joints near the centre of the wall, along the diagonal compression strut.',
    'The stepped crack grows toward the corners, following head and bed joints.',
    'The stepped diagonal crack is complete and the toe is crushed. The wall has failed in diagonal shear.',
  ],
  diag: [
    'The wall is undamaged. Load arrows show the lateral load and the axial load.',
    'The wall shears slightly. No cracks are visible yet.',
    'A diagonal crack starts and the compressed toe begins to spall.',
    'The diagonal crack grows through the bricks and the toe crushing spreads.',
    'The diagonal crack crosses the wall and the toe is crushed. The wall has failed.',
  ],
  overturn: [
    'The wall is undamaged. It is held at both sides and at the base, and the top is free. Pressure acts on the left face.',
    'The wall begins to bend away from the pressure. No cracks are visible yet.',
    'A horizontal crack opens above the base and the central block starts to rotate outward.',
    'Stepped diagonal cracks grow from the ends of the horizontal crack toward the top corners.',
    'The central block has rotated far out of plane, between the diagonal cracks. The wall has failed in bending and rocking.',
  ],
  flex: [
    'The wall is undamaged. It is held at both sides and at the base, and the top is free. Pressure acts on the left face.',
    'The wall begins to bend away from the pressure. No cracks are visible yet.',
    'A horizontal crack opens above the base, at the peak bending zone on the tension face.',
    'Stepped diagonal cracks grow from its ends toward the top corners, and short vertical cracks form beside the side supports.',
    'The diagonal crack pattern is complete and the compression face is damaged. The wall has failed in two-way bending.',
  ],
};

export function stageNote(profile: MechanismProfile, stage: StageIndex): string {
  return STAGE_NOTES[FAMILY_OF[profile.kind]][stage];
}

// ---------------------------------------------------------------------------
// Material and precompression explanations. They depend on the loading type and
// on the strengths, so every one of the 16 profiles gets text for its own case.
// ---------------------------------------------------------------------------
type Strength = 'weak' | 'strong';

const MATERIAL_TEXT: Record<string, string> = {
  'in-plane__weak__weak':
    'Both materials are weak, but the mortar joints are the weak link in shear. Joint cohesion and friction are used up before the bricks are stressed enough to crack, so movement is concentrated in the bed joints. The weak bricks only show chipping at corners.',
  'in-plane__weak__strong':
    'Strong bricks cannot be split by the stresses in this wall, so the weak mortar joints decide the failure path. Slip happens along bed joints and the bricks move as rigid blocks.',
  'in-plane__strong__weak':
    'Strong mortar bonds the bricks well, so the joints stay closed and the wall acts like a continuous panel. The weak bricks then become the weak link, so cracks cut through the units and the highly stressed bricks crush.',
  'in-plane__strong__strong':
    'Strong mortar and strong bricks resist both joint slip and unit cracking. The wall stays largely intact until the loading forces one mechanism at its boundary, and the damage stays local.',
  'out-of-plane__weak__weak':
    'Weak mortar has little tensile bond, so the joints open first and the cracks follow them in steps. The weak bricks beside the main crack then crumble where the curvature is greatest.',
  'out-of-plane__weak__strong':
    'Strong bricks stay whole, so the cracks run along the bed and head joints around them, which gives the stair-stepped diagonal pattern. The wall separates into rigid blocks.',
  'out-of-plane__strong__weak':
    'Strong mortar keeps the joints bonded, so the cracks cut through the weak bricks as straighter diagonal lines instead of stepping along the joints. The weak bricks crush where the compression is highest.',
  'out-of-plane__strong__strong':
    'Both materials resist cracking, so the wall bends with little damage and cracks late. When it does crack, the same diagonal pattern appears, but the cracks stay thin.',
};

const PRECOMP_TEXT: Record<string, string> = {
  'in-plane__low':
    'Low axial load gives little friction on the bed joints and a small stabilizing moment. Sliding and rocking therefore happen early, and toe compression stays modest. With high axial load this reverses: sliding and rocking are suppressed, but the toe and the diagonal strut carry more compression and crack or crush sooner.',
  'in-plane__high':
    'High axial load raises the friction in the joints and the restoring moment, so pure sliding and rocking are suppressed. The load instead goes into the diagonal compression strut and into the toe, where compression damage concentrates. With low axial load the wall would slide or rock first.',
  'out-of-plane__low':
    'Low axial load gives a small stabilizing moment, so the horizontal crack opens low in the wall and the central block rotates outward easily. With a free top it can overturn. High axial load would keep the joints closed longer and move the crack higher up.',
  'out-of-plane__high':
    'High axial load keeps the tension face closed for longer and adds a stabilizing moment that resists overturning, so the horizontal crack forms higher up the wall. The compression face carries more stress and may crush. With low axial load the central block would rotate and overturn more easily.',
};

function material(c: MasonryConfig): string {
  return MATERIAL_TEXT[`${c.loadingType}__${c.mortarStrength}__${c.brickStrength}`];
}
function precomp(c: MasonryConfig): string {
  return PRECOMP_TEXT[`${c.loadingType}__${c.precompression}`];
}

// ---------------------------------------------------------------------------
// The 16 profiles. Order follows the matrix (#1 ... #16).
// ---------------------------------------------------------------------------
interface Row {
  n: number;
  l: MasonryConfig['loadingType'];
  p: MasonryConfig['precompression'];
  m: Strength;
  b: Strength;
  title: string;
  kind: MechanismKind;
  pattern: MechanismProfile['crackPattern'];
  first: string;
  path: string;
  summary: string;
  mech: string;
}

const ROWS: Row[] = [
  {
    n: 1, l: 'in-plane', p: 'low', m: 'weak', b: 'weak',
    title: 'Bed-Joint Sliding & Stair-Stepped Joint Cracking',
    kind: 'bed-joint-sliding', pattern: 'horizontal-joints',
    first: 'Lower to mid-height mortar bed joints on the loaded side.',
    path: 'The bed joint slips horizontally, a short stair-stepped crack forms in the mortar, and weak bricks chip at a corner.',
    summary: 'Weak mortar gives low bond and shear capacity, and low precompression gives little friction, so the bed joint slides before the bricks fracture badly.',
    mech: 'The upper part of the wall slides along a bed joint as a nearly rigid block. A little stair-stepped cracking in the mortar accompanies the slip, and only the weakest bricks chip at corners.',
  },
  {
    n: 2, l: 'in-plane', p: 'low', m: 'weak', b: 'strong',
    title: 'Bed-Joint Sliding',
    kind: 'bed-joint-sliding', pattern: 'horizontal-joints',
    first: 'Horizontal mortar bed joints near mid-height and at the base.',
    path: 'Clean horizontal slip along the mortar courses, with the strong bricks left intact.',
    summary: 'Weak mortar and low normal compression give low shear friction, so sliding occurs along the mortar joints while strong bricks resist cracking.',
    mech: 'The wall slides along clean horizontal bed joints at mid-height and at the base. The bricks are not damaged, because the weak mortar joints give way first.',
  },
  {
    n: 3, l: 'in-plane', p: 'low', m: 'strong', b: 'weak',
    title: 'Rocking with Through-Brick Cracking',
    kind: 'rocking', pattern: 'rocking-toe',
    first: 'The compressed toe and the weak bricks along the main diagonal compression path.',
    path: 'The wall tilts as a rigid body. Diagonal and vertical cracks then cut through the weak bricks along the compression strut.',
    summary: 'Low precompression allows rocking, while strong mortar forces cracks through the weaker brick units instead of along the joints.',
    mech: 'The heel lifts and the wall rotates about the compressed toe. The strong mortar holds the joints together, so the concentrated toe compression splits and crushes the weak bricks, and cracks run up through them along the compression strut.',
  },
  {
    n: 4, l: 'in-plane', p: 'low', m: 'strong', b: 'strong',
    title: 'Rocking',
    kind: 'rocking', pattern: 'rocking-toe',
    first: 'The base mortar joint at the tension heel, and the compression toe.',
    path: 'The base lifts at the heel and the wall rotates about the toe. Only minor contact adjustment and very little unit cracking occurs.',
    summary: 'Strong mortar and strong bricks prevent joint and unit failure, while low axial load lets the wall rock under lateral sway.',
    mech: 'A single horizontal crack opens at the base. The wall turns about its toe with the heel lifting, and bricks and joints stay almost undamaged. Light spalling at the toe appears only at the end.',
  },
  {
    n: 5, l: 'in-plane', p: 'high', m: 'weak', b: 'weak',
    title: 'Diagonal Tension & Brick Crushing',
    kind: 'through-brick-diagonal', pattern: 'diagonal-brick',
    first: 'The compression toe, and the mortar and brick interface along the diagonal strut.',
    path: 'Stair-stepped mortar cracks form first and turn into a diagonal crack through the weak bricks, with crushing at the toe.',
    summary: 'High precompression increases sliding friction but also the compressive stress at the toe, while weak mortar and weak bricks fail along a combined diagonal path.',
    mech: 'High axial load prevents sliding, so the shear load is carried by a diagonal compression strut. Weak mortar cracks first in a stair-step, then the crack continues through the weak bricks toward the toe, and the toe bricks crush.',
  },
  {
    n: 6, l: 'in-plane', p: 'high', m: 'weak', b: 'strong',
    title: 'Stair-Stepped Diagonal Cracking & Toe Crushing',
    kind: 'stair-step-cracking', pattern: 'stair-step',
    first: 'The compressed toe, and the diagonal stair-stepped mortar joints.',
    path: 'Cracks follow the weak bed and head joints in a staircase, while the toe bricks crush.',
    summary: 'Higher precompression suppresses pure sliding and concentrates compression at the toe, while weak mortar still guides the diagonal crack around strong bricks.',
    mech: 'A diagonal compression strut forms and the weak mortar cannot resist the tension across it. Cracks follow head and bed joints in a staircase around the strong bricks, and the toe bricks crush under the high compression.',
  },
  {
    n: 7, l: 'in-plane', p: 'high', m: 'strong', b: 'weak',
    title: 'Diagonal Tension Through Bricks & Toe Crushing',
    kind: 'through-brick-diagonal', pattern: 'diagonal-brick',
    first: 'The compressed toe, and the bricks at mid-panel along the diagonal.',
    path: 'Diagonal cracks cut straight through the weak bricks, with local brick crushing at the toe.',
    summary: 'Strong mortar bonds the joints tightly and high precompression raises friction, so damage moves into diagonal cracking and crushing of the weak bricks.',
    mech: 'The strong mortar keeps the joints closed, so the diagonal tension crack cannot follow them and cuts through the weak bricks instead. The high compression at the toe crushes the bricks there.',
  },
  {
    n: 8, l: 'in-plane', p: 'high', m: 'strong', b: 'strong',
    title: 'Toe Crushing & Diagonal Compression Damage',
    kind: 'toe-crushing', pattern: 'diagonal-brick',
    first: 'The compressed base toe.',
    path: 'Local compression crushing at the toe first, then diagonal shear and compression distress near final failure.',
    summary: 'High precompression increases shear friction and prevents simple sliding or rocking, so demand concentrates in toe crushing even though mortar and bricks are strong.',
    mech: 'Strong materials and high axial load prevent sliding, rocking and early cracking. The toe is the most stressed region, so it crushes first, and a diagonal crack through the units appears only near the end.',
  },
  {
    n: 9, l: 'out-of-plane', p: 'low', m: 'weak', b: 'weak',
    title: 'Flexural Joint Separation & Bending Rocking',
    kind: 'flexural-cracking', pattern: 'flexural-bending',
    first: 'The weak mortar bed joint that forms the horizontal crack, a few courses above the base on the tension (loaded) face.',
    path: 'A horizontal crack opens first and the weak bricks beside it crumble. Stair-stepped diagonal cracks then run along the joints from its ends up toward the top corners, and short vertical cracks form beside the side supports.',
    summary: 'Out-of-plane pressure bends the wall. Weak mortar opens easily in tension and low precompression gives little resistance to bending and rocking.',
    mech: 'The wall is held at both sides and at the base, with a free top. Under face pressure it cracks in a stair-stepped diagonal pattern: a horizontal crack above the base, diagonal cracks from its ends up to the top corners, and short vertical cracks beside the supports. The central block rotates about the horizontal crack, and weak bricks crumble where the curvature is greatest.',
  },
  {
    n: 10, l: 'out-of-plane', p: 'low', m: 'weak', b: 'strong',
    title: 'Out-of-Plane Rocking / Overturning',
    kind: 'out-of-plane-rocking', pattern: 'overturning-bending',
    first: 'The bed joints of the horizontal crack just above the base, then the stepped diagonal joints, on the tension face.',
    path: 'The bed joint above the base opens and the central block starts to rock. Stair-stepped diagonal cracks then run along the joints from its ends up toward the top corners, and short vertical cracks form beside the side supports.',
    summary: 'Low precompression reduces the stabilizing moment against bending, and weak mortar lets joints open and the wall rock or overturn while the bricks stay intact.',
    mech: 'The wall is held at both sides and at the base, with a free top. The weak mortar lets the wall break along stepped diagonal joints, and the central block between them rocks outward about the horizontal crack. The strong bricks stay whole. With low axial load there is little to hold the block back, so it can overturn if the top is not restrained.',
  },
  {
    n: 11, l: 'out-of-plane', p: 'low', m: 'strong', b: 'weak',
    title: 'Flexural Cracking Through Weak Bricks',
    kind: 'flexural-cracking', pattern: 'flexural-bending',
    first: 'The weak bricks at the horizontal crack a few courses above the base, on the tension face, then the diagonals.',
    path: 'A horizontal crack runs through the weak bricks first. Straighter diagonal cracks then cut through the bricks toward the top corners, and the compression edge crushes.',
    summary: 'Strong mortar holds the joints together while the bending overpowers the weak bricks, so cracks go through the units under low precompression.',
    mech: 'The wall is held at both sides and at the base, with a free top. Strong mortar keeps the joints bonded, so the cracks cut through the weak bricks: a horizontal crack above the base and straighter diagonal cracks to the top corners, with short vertical cracks beside the supports. The compression edge of the weak bricks crushes at the horizontal crack.',
  },
  {
    n: 12, l: 'out-of-plane', p: 'low', m: 'strong', b: 'strong',
    title: 'Bending Deformation & Flexural Rocking',
    kind: 'out-of-plane-rocking', pattern: 'flexural-bending',
    first: 'The zone of peak bending near the middle of the wall above the base, and the joints at the side supports.',
    path: 'Smooth bending at first. A thin horizontal crack appears at Stage 3 and the stepped diagonal cracks only begin at Stage 4.',
    summary: 'Strong mortar and strong bricks resist cracking, while low precompression allows clear out-of-plane deflection and rocking.',
    mech: 'The wall is held at both sides and at the base, with a free top. Strong mortar and strong bricks resist cracking, so the wall mainly bends. Late in the sequence a thin horizontal crack appears above the base and the first stepped diagonal cracks start toward the top corners, and the central block rocks slightly.',
  },
  {
    n: 13, l: 'out-of-plane', p: 'high', m: 'weak', b: 'weak',
    title: 'Flexural Cracking & Local Crushing',
    kind: 'flexural-cracking', pattern: 'flexural-bending',
    first: 'The weak bed joint of the horizontal crack, about a third of the way up the wall, on the tension face. Crushing of the weak bricks on the compression side follows.',
    path: 'A horizontal crack opens along a bed joint. Stair-stepped diagonal cracks then run along the joints from its ends up toward the top corners, and short vertical cracks form beside the side supports. The weak bricks on the compression side crush.',
    summary: 'High precompression increases bending resistance and suppresses overturning, but weak mortar and weak bricks still suffer joint opening and compression damage.',
    mech: 'The wall is held at both sides and at the base, with a free top. High axial load resists rocking, so the wall bends and the horizontal crack forms higher up. Stepped diagonal cracks follow the weak joints from its ends to the top corners, and the weak bricks on the compression side crush at the crack.',
  },
  {
    n: 14, l: 'out-of-plane', p: 'high', m: 'weak', b: 'strong',
    title: 'Horizontal Bed-Joint Cracking & Arching Distress',
    kind: 'flexural-cracking', pattern: 'horizontal-joints',
    first: 'The weak bed joint of the long horizontal crack, about a third of the way up the wall, on the tension face.',
    path: 'A long horizontal crack opens along the bed joint. Stair-stepped diagonal cracks then run along the joints from its ends up toward the top corners, and short vertical cracks form beside the side supports. Local distress appears at the compression edge.',
    summary: 'High precompression helps arching and stabilizing action against overturning, while the weak mortar still opens along the bed joints.',
    mech: 'The wall is held at both sides and at the base, with a free top. High axial load makes it bend and arch between the supports. A long horizontal crack opens along a weak bed joint, with stepped diagonal cracks to the top corners, while the strong bricks stay whole. The compression face shows local distress where the wall bears in arching.',
  },
  {
    n: 15, l: 'out-of-plane', p: 'high', m: 'strong', b: 'weak',
    title: 'Through-Brick Flexural Cracking & Crushing',
    kind: 'bending-crushing', pattern: 'flexural-bending',
    first: 'The weak bricks at the horizontal crack, about a third of the way up the wall, on the tension face.',
    path: 'A horizontal crack runs through the weak bricks. Straighter diagonal cracks cut through the bricks toward the top corners, and the compression zone crushes.',
    summary: 'Strong mortar passes flexural tension into the units and high precompression adds compression, so the weak bricks crack and crush.',
    mech: 'The wall is held at both sides and at the base, with a free top. The strong mortar passes the bending tension into the weak bricks, so the horizontal crack and the diagonal cracks run through the bricks. High axial load adds compression on the opposite face, and the weak bricks beside the crack crush.',
  },
  {
    n: 16, l: 'out-of-plane', p: 'high', m: 'strong', b: 'strong',
    title: 'Bending Deflection with Compression Zone Distress',
    kind: 'bending-crushing', pattern: 'flexural-bending',
    first: 'The zone of peak bending, where the horizontal crack will form, and the restrained boundary at the base.',
    path: 'Controlled bending first. A thin horizontal crack opens at Stage 3 and thin diagonal cracks appear only at Stage 4, with compression-zone distress.',
    summary: 'Strong mortar and strong bricks resist early cracking, while high precompression holds back overturning and moves late distress into the compression zones.',
    mech: 'The wall is held at both sides and at the base, with a free top. It is stiff and cracks late. It bends smoothly, a thin horizontal crack opens higher up the wall, and the diagonal cracks appear only at the very end. In the final stage the compression edge near the crack and the base begins to spall.',
  },
];

export const PROFILES: Record<string, MechanismProfile> = {};
for (const r of ROWS) {
  const config: MasonryConfig = {
    loadingType: r.l,
    precompression: r.p,
    mortarStrength: r.m,
    brickStrength: r.b,
  };
  PROFILES[getConfigKey(config)] = {
    id: String(r.n),
    config,
    title: r.title,
    kind: r.kind,
    crackPattern: r.pattern,
    firstDamageLocation: r.first,
    crackPath: r.path,
    summary: r.summary,
    mechanismExplanation: r.mech,
    materialInfluence: material(config),
    precompressionInfluence: precomp(config),
  };
}
