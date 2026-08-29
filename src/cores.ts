/**
 * Core bodies — the dark form behind the seams that carries the lens eye.
 * Grammar invariants regardless of shape: dark body, rim glow along the
 * outline, lens eye centered, seam gap to the shell, away-state light seep.
 *
 * Polyhedral cores are drawn as their frontal graphic read:
 *  - d20 (icosahedron): point-up hexagon silhouette + central triangle facets
 *  - cube: rounded square + inset bevel line
 *  - d12 (dodecahedron): decagon silhouette + central pentagon facets
 *  - gem (table cut): point-up octagon + table facet
 * All outlines are normalized so the outermost vertex sits at radius 1.
 */
export type CoreShape = "sphere" | "d20" | "cube" | "d12" | "gem";

export interface CoreDef {
  /** unit outline points (max vertex radius == 1), or null for a circle */
  outline: [number, number][] | null;
  /** corner rounding as a fraction of r */
  corner: number;
  /** unit-space facet detail segments [x1,y1,x2,y2], drawn low-alpha in glow color */
  facets: [number, number, number, number][];
}

function ngon(n: number, rot = -Math.PI / 2): [number, number][] {
  return [...Array(n)].map((_, i) => {
    const a = rot + (i / n) * Math.PI * 2;
    return [Math.cos(a), Math.sin(a)] as [number, number];
  });
}

function buildD20(): CoreDef {
  const hex = ngon(6);
  const tri = ngon(3).map(([x, y]) => [x * 0.52, y * 0.52] as [number, number]);
  const facets: [number, number, number, number][] = [];
  // triangle edges
  for (let i = 0; i < 3; i++) {
    const a = tri[i], b = tri[(i + 1) % 3];
    facets.push([a[0], a[1], b[0], b[1]]);
  }
  // spokes: each triangle vertex to the two nearest hex vertices
  for (let i = 0; i < 3; i++) {
    const v = tri[i];
    const h1 = hex[(i * 2) % 6], h2 = hex[(i * 2 + 5) % 6];
    facets.push([v[0], v[1], h1[0], h1[1]]);
    facets.push([v[0], v[1], h2[0], h2[1]]);
  }
  return { outline: hex, corner: 0.06, facets };
}

function buildCube(): CoreDef {
  const k = Math.SQRT1_2; // square with max vertex radius 1
  const sq: [number, number][] = [[-k, -k], [k, -k], [k, k], [-k, k]];
  const inset = 0.72;
  const facets: [number, number, number, number][] = [];
  const inner = sq.map(([x, y]) => [x * inset, y * inset] as [number, number]);
  for (let i = 0; i < 4; i++) {
    const a = inner[i], b = inner[(i + 1) % 4];
    facets.push([a[0], a[1], b[0], b[1]]);
  }
  return { outline: sq, corner: 0.14, facets };
}

function buildD12(): CoreDef {
  const dec = ngon(10);
  const pent = ngon(5).map(([x, y]) => [x * 0.55, y * 0.55] as [number, number]);
  const facets: [number, number, number, number][] = [];
  for (let i = 0; i < 5; i++) {
    const a = pent[i], b = pent[(i + 1) % 5];
    facets.push([a[0], a[1], b[0], b[1]]);
    const h = dec[(i * 2) % 10];
    facets.push([a[0], a[1], h[0], h[1]]);
  }
  return { outline: dec, corner: 0.05, facets };
}

function buildGem(): CoreDef {
  const oct = ngon(8, -Math.PI / 2);
  // frontal read: the table is concentric with the girdle — no tilt offset,
  // so the crown facets converge on the socket like every other core
  const table = ngon(8, -Math.PI / 2).map(([x, y]) => [x * 0.55, y * 0.55] as [number, number]);
  const facets: [number, number, number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const a = table[i], b = table[(i + 1) % 8];
    facets.push([a[0], a[1], b[0], b[1]]);
    facets.push([a[0], a[1], oct[i][0], oct[i][1]]);
  }
  return { outline: oct, corner: 0.05, facets };
}

export const CORES: Record<CoreShape, CoreDef> = {
  sphere: { outline: null, corner: 0, facets: [] },
  d20: buildD20(),
  cube: buildCube(),
  d12: buildD12(),
  gem: buildGem(),
};

export function coreNames(): CoreShape[] {
  return Object.keys(CORES) as CoreShape[];
}

/** Unit outline radius at angle th (radians) — 1 for the sphere; ray/edge
 *  intersection for polygon cores. Lets the blob↔core hardness morph sample
 *  both silhouettes on the same radial grid. */
export function coreRadiusAt(shape: CoreShape, th: number): number {
  const def = CORES[shape];
  if (!def.outline) return 1;
  const dx = Math.cos(th), dy = Math.sin(th);
  const pts = def.outline, n = pts.length;
  for (let i = 0; i < n; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % n];
    const ex = x2 - x1, ey = y2 - y1;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const s = (x1 * ey - y1 * ex) / den;        // distance along the ray
    const u = (x1 * dy - y1 * dx) / den;        // position along the edge
    if (s > 0 && u >= -1e-6 && u <= 1 + 1e-6) return s;
  }
  return 1;
}

/** Trace the core outline (unit-space scaled by r) into the current path. */
export function traceCore(
  ctx: CanvasRenderingContext2D,
  shape: CoreShape,
  r: number,
) {
  const def = CORES[shape];
  if (!def.outline) {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, 7);
    return;
  }
  const pts = def.outline.map(([x, y]) => [x * r, y * r] as [number, number]);
  const rr = def.corner * r;
  ctx.beginPath();
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[i], p1 = pts[(i + 1) % n], p2 = pts[(i + 2) % n];
    const v1 = [p1[0] - p0[0], p1[1] - p0[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
    const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
    const cr = Math.min(rr, l1 / 2.4, l2 / 2.4);
    const a: [number, number] = [p1[0] - v1[0] / l1 * cr, p1[1] - v1[1] / l1 * cr];
    const b: [number, number] = [p1[0] + v2[0] / l2 * cr, p1[1] + v2[1] / l2 * cr];
    i ? ctx.lineTo(a[0], a[1]) : ctx.moveTo(a[0], a[1]);
    ctx.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
  }
  ctx.closePath();
}

/** Draw the facet detail lines (unit-space scaled by r). Caller sets style. */
export function traceFacets(
  ctx: CanvasRenderingContext2D,
  shape: CoreShape,
  r: number,
) {
  const def = CORES[shape];
  if (!def.facets.length) return false;
  ctx.beginPath();
  for (const [x1, y1, x2, y2] of def.facets) {
    ctx.moveTo(x1 * r, y1 * r);
    ctx.lineTo(x2 * r, y2 * r);
  }
  return true;
}
