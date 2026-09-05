/**
 * The quire species — a hand of five blunt, opaque leaves fanned to one side
 * of a dark spine, with one aperture lens set low in the spine. A quire is a
 * gathering of folded pages: the being shows layering rather than a face, has
 * handedness (a point of view), and its attention is visible in how the
 * leaves gather. Designed jointly by Claude and Codex Astra (2026-09-05):
 * Claude's handed fan and riffle, Astra's structural weight — opaque leaves,
 * overlap shadows instead of translucency, a spine that reads at 96px.
 */
import type { PathTarget } from "./blob";

export type QuireHand = "both" | "left" | "right" | "auto";
/** Numeric hand: 0 = symmetric open codex, ±1 = the fan falls to one side. */
export type HandSign = 0 | 1 | -1;

/** Rest pose. Angles are clockwise from straight up, in degrees; lengths in r. */
export const QUIRE_LENGTHS = [1.65, 1.9, 2.1, 1.95, 1.7] as const;
export const QUIRE_ANGLES = [-24, -10, 5, 22, 40] as const;
/** Draw order back → front: outermost leaves first, the upright leaf 2 in front. */
export const QUIRE_ORDER = [0, 4, 1, 3, 2] as const;
export const QUIRE_ROOT: readonly [number, number] = [-0.2, 0.65];
export const QUIRE_LENS: readonly [number, number] = [-0.2, 0.42];
export const QUIRE_LENS_R = 0.24;
export const QUIRE_SPINE = { w: 0.7, top: -0.35, bottom: 1.05 } as const;

export interface LeafPose {
  /** absolute angle in radians, clockwise from up (screen space: +x right, -y up) */
  angle: number;
  length: number;
}

/** Resolve the five leaf poses: rest angle × spread + per-leaf offset, mirrored for the hand. */
export function quireLeaves(r: number, spread: number, offsetsDeg: readonly number[], hand: HandSign): LeafPose[] {
  const sign = hand === 0 ? 1 : hand;
  return QUIRE_LENGTHS.map((len, i) => ({
    angle: (sign * (QUIRE_ANGLES[i] * spread + (offsetsDeg[i] ?? 0)) * Math.PI) / 180,
    length: len * r,
  }));
}

/** Root x for a hand (the fan grows from the spine's centre line). */
export function quireRootX(r: number, hand: HandSign): number {
  return QUIRE_ROOT[0] * r * hand;
}

/** Trace one leaf in leaf-local space: root at the origin, tip up (-y). */
export function traceLeaf(ctx: PathTarget, r: number, length: number) {
  const rw = 0.22 * r, tw = 0.48 * r, ch = 0.07 * r;
  if ("beginPath" in ctx) ctx.beginPath();
  ctx.moveTo(-rw / 2, 0);
  ctx.lineTo(rw / 2, 0);
  ctx.lineTo(tw / 2, -length + ch);
  ctx.lineTo(tw / 2 - ch, -length);
  ctx.lineTo(-tw / 2 + ch, -length);
  ctx.lineTo(-tw / 2, -length + ch);
  ctx.closePath();
}

/** Trace the spine slab (chamfered) in body space. */
export function traceSpine(ctx: PathTarget, r: number, hand: HandSign = 0) {
  const w = QUIRE_SPINE.w * r, x0 = quireRootX(r, hand) - w / 2;
  const y0 = QUIRE_SPINE.top * r, y1 = QUIRE_SPINE.bottom * r, ch = 0.06 * r;
  if ("beginPath" in ctx) ctx.beginPath();
  ctx.moveTo(x0 + ch, y0); ctx.lineTo(x0 + w - ch, y0); ctx.lineTo(x0 + w, y0 + ch);
  ctx.lineTo(x0 + w, y1 - ch); ctx.lineTo(x0 + w - ch, y1); ctx.lineTo(x0 + ch, y1);
  ctx.lineTo(x0, y1 - ch); ctx.lineTo(x0, y0 + ch);
  ctx.closePath();
}

/** Whole-figure silhouette (leaves + spine) — glow, drop shadow, cloth clips. */
export function traceQuire(ctx: PathTarget, r: number, leaves: LeafPose[], hand: HandSign) {
  if ("beginPath" in ctx) ctx.beginPath();
  const rx = quireRootX(r, hand), ry = QUIRE_ROOT[1] * r;
  for (const leaf of leaves) {
    const c = Math.cos(leaf.angle), s = Math.sin(leaf.angle);
    // leaf-local (x, y) → body: rotate by angle about the root
    const pt = (lx: number, ly: number): [number, number] => [rx + lx * c - ly * s, ry + lx * s + ly * c];
    const rw = 0.22 * r, tw = 0.48 * r, ch = 0.07 * r, L = leaf.length;
    const pts = [pt(-rw / 2, 0), pt(rw / 2, 0), pt(tw / 2, -L + ch), pt(tw / 2 - ch, -L), pt(-tw / 2 + ch, -L), pt(-tw / 2, -L + ch)];
    pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    ctx.closePath();
  }
  const w = QUIRE_SPINE.w * r, x0 = rx - w / 2;
  ctx.rect(x0, QUIRE_SPINE.top * r, w, (QUIRE_SPINE.bottom - QUIRE_SPINE.top) * r);
}

/** Topmost y of the figure (negative) — the crown anchor for accessories. */
export function quireTopY(r: number, leaves: LeafPose[]): number {
  let top = QUIRE_SPINE.top * r;
  for (const leaf of leaves) top = Math.min(top, QUIRE_ROOT[1] * r - Math.cos(leaf.angle) * leaf.length);
  return top;
}

export interface QuirePaint {
  accent: string;
  edge: string;
  dark: string;
  DPR: number;
  /** 0..1 — deepens the overlap shadow, mutes the top light */
  gravity: number;
}

/** Paint the leaves back → front, then the spine over the roots. Each leaf
 *  casts a shadow band onto the leaves already painted — clipped to their
 *  union, so it appears only at real overlap boundaries, never as a dark
 *  outline against the background. */
export function drawQuireBody(ctx: CanvasRenderingContext2D, r: number, leaves: LeafPose[], hand: HandSign, p: QuirePaint) {
  const rx = quireRootX(r, hand), ry = QUIRE_ROOT[1] * r;
  const lw = Math.max(1.2 * p.DPR, r * 0.045);
  const band = 0.07 * r;
  const under = new Path2D();   // union of leaves painted so far, body space
  let any = false;
  for (const idx of QUIRE_ORDER) {
    const leaf = leaves[idx];
    const local = new Path2D();
    traceLeaf(local, r, leaf.length);
    const m = new DOMMatrix().translate(rx, ry).rotate((leaf.angle * 180) / Math.PI);
    const body = new Path2D();
    body.addPath(local, m);
    if (any) {
      ctx.save();
      ctx.clip(under);
      ctx.strokeStyle = `rgba(0,0,0,${0.3 + 0.2 * p.gravity})`;
      ctx.lineWidth = band * 2;   // half the stroke lands outside the leaf, on what is underneath
      ctx.lineJoin = "round";
      ctx.stroke(body);
      ctx.restore();
    }
    ctx.fillStyle = p.accent; ctx.fill(body);
    ctx.save();
    ctx.clip(body);
    // top light along the tip, muted by gravity
    ctx.translate(rx, ry); ctx.rotate(leaf.angle);
    ctx.fillStyle = `rgba(255,255,255,${0.16 * (1 - p.gravity)})`;
    ctx.fillRect(-0.24 * r, -leaf.length, 0.48 * r, 0.08 * r);
    ctx.restore();
    ctx.strokeStyle = p.edge; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke(body);
    under.addPath(body);
    any = true;
  }
  ctx.save();
  traceSpine(ctx, r, hand);
  ctx.fillStyle = p.dark; ctx.fill();
  ctx.strokeStyle = p.edge; ctx.lineWidth = lw; ctx.stroke();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// The codex form (hand "both", the default): a stepped open book. Two mirrored
// stacks of three broad pages hinge along the spine's edges and open a few
// degrees; pages step down in height and width toward the front, so the
// layering shows without any radial fan. Astra's silhouette (2026-09-05),
// chosen after Ian's feedback that the fan was asymmetric and too close to
// the emblem.
// ---------------------------------------------------------------------------

/** Per-page rest geometry, outermost (back) first: width, height, open angle in degrees. */
export const CODEX_PAGES = [
  { w: 1.0, h: 1.4, open: 12 },
  { w: 0.88, h: 1.25, open: 8 },
  { w: 0.76, h: 1.1, open: 4 },
] as const;
/** hinge y (the page's bottom inner corner sits here on the spine edge) */
export const CODEX_HINGE_Y = 0.95;

export interface CodexPage {
  /** -1 left stack, +1 right stack */
  side: 1 | -1;
  /** 0 outermost … 2 innermost */
  index: number;
  /** body-space polygon, closed */
  pts: [number, number][];
}

/** Resolve the six pages for a spread (1 = rest, 0 = shut) and per-index open offsets (degrees, mirrored). */
export function codexPages(r: number, spread: number, offsetsDeg: readonly number[]): CodexPage[] {
  const out: CodexPage[] = [];
  const sx = QUIRE_SPINE.w * r / 2, hy = CODEX_HINGE_Y * r, ch = 0.08 * r;
  for (const side of [-1, 1] as const) {
    CODEX_PAGES.forEach((pg, i) => {
      const a = ((pg.open * spread + (offsetsDeg[i] ?? 0)) * Math.PI) / 180 * side;
      const c = Math.cos(a), sn = Math.sin(a);
      // page-local: hinge at (0,0), page extends outward (+x·side) and up (-y)
      const w = pg.w * r, h = pg.h * r;
      const local: [number, number][] = [[0, 0], [side * w, 0], [side * w, -h + ch], [side * (w - ch), -h], [0, -h]];
      const pts = local.map(([lx, ly]): [number, number] => [side * sx + lx * c - ly * sn, hy + lx * sn + ly * c]);
      out.push({ side, index: i, pts });
    });
  }
  return out;
}

function tracePoly(ctx: PathTarget, pts: [number, number][]) {
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
}

/** Whole-figure silhouette: pages + spine. */
export function traceCodex(ctx: PathTarget, r: number, pages: CodexPage[]) {
  if ("beginPath" in ctx) ctx.beginPath();
  for (const pg of pages) tracePoly(ctx, pg.pts);
  const w = QUIRE_SPINE.w * r;
  ctx.rect(-w / 2, QUIRE_SPINE.top * r, w, (QUIRE_SPINE.bottom - QUIRE_SPINE.top) * r);
}

export function codexTopY(r: number, pages: CodexPage[]): number {
  let top = QUIRE_SPINE.top * r;
  for (const pg of pages) for (const p of pg.pts) top = Math.min(top, p[1]);
  return top;
}

/** Paint pages back → front per stack (outermost first), casting overlap
 *  shadows only onto pages already painted, then the spine over the hinges. */
export function drawCodexBody(ctx: CanvasRenderingContext2D, r: number, pages: CodexPage[], p: QuirePaint) {
  const lw = Math.max(1.2 * p.DPR, r * 0.045);
  const band = 0.07 * r;
  const under = new Path2D();
  let any = false;
  const ordered = [...pages].sort((a, b) => a.index - b.index);   // outermost first, both sides interleaved
  for (const pg of ordered) {
    const body = new Path2D();
    tracePoly(body, pg.pts);
    if (any) {
      ctx.save();
      ctx.clip(under);
      ctx.strokeStyle = `rgba(0,0,0,${0.3 + 0.2 * p.gravity})`;
      ctx.lineWidth = band * 2;
      ctx.lineJoin = "round";
      ctx.stroke(body);
      ctx.restore();
    }
    ctx.fillStyle = p.accent; ctx.fill(body);
    // top light along the page's upper edge, muted by gravity
    ctx.save();
    ctx.clip(body);
    const top = Math.min(...pg.pts.map((q) => q[1]));
    ctx.fillStyle = `rgba(255,255,255,${0.16 * (1 - p.gravity)})`;
    ctx.fillRect(-2 * r, top, 4 * r, 0.09 * r);
    ctx.restore();
    ctx.strokeStyle = p.edge; ctx.lineWidth = lw; ctx.lineJoin = "round"; ctx.stroke(body);
    under.addPath(body);
    any = true;
  }
  ctx.save();
  traceSpine(ctx, r, 0);
  ctx.fillStyle = p.dark; ctx.fill();
  ctx.strokeStyle = p.edge; ctx.lineWidth = lw; ctx.stroke();
  ctx.restore();
}
