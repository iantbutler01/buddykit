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

export type QuireHand = "left" | "right" | "auto";

/** Rest pose. Angles are clockwise from straight up, in degrees; lengths in r. */
export const QUIRE_LENGTHS = [1.65, 1.9, 2.1, 1.95, 1.7] as const;
export const QUIRE_ANGLES = [-24, -10, 5, 22, 40] as const;
/** Draw order back → front: outermost leaves first, the upright leaf 2 in front. */
export const QUIRE_ORDER = [0, 4, 1, 3, 2] as const;
export const QUIRE_ROOT: readonly [number, number] = [-0.2, 0.65];
export const QUIRE_LENS: readonly [number, number] = [-0.2, 0.42];
export const QUIRE_LENS_R = 0.24;
export const QUIRE_SPINE = { w: 0.6, top: -0.25, bottom: 0.95 } as const;

export interface LeafPose {
  /** absolute angle in radians, clockwise from up (screen space: +x right, -y up) */
  angle: number;
  length: number;
}

/** Resolve the five leaf poses: rest angle × spread + per-leaf offset, mirrored for the hand. */
export function quireLeaves(r: number, spread: number, offsetsDeg: readonly number[], hand: 1 | -1): LeafPose[] {
  return QUIRE_LENGTHS.map((len, i) => ({
    angle: (hand * (QUIRE_ANGLES[i] * spread + (offsetsDeg[i] ?? 0)) * Math.PI) / 180,
    length: len * r,
  }));
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
export function traceSpine(ctx: PathTarget, r: number) {
  const w = QUIRE_SPINE.w * r, x0 = QUIRE_ROOT[0] * r - w / 2;
  const y0 = QUIRE_SPINE.top * r, y1 = QUIRE_SPINE.bottom * r, ch = 0.06 * r;
  if ("beginPath" in ctx) ctx.beginPath();
  ctx.moveTo(x0 + ch, y0); ctx.lineTo(x0 + w - ch, y0); ctx.lineTo(x0 + w, y0 + ch);
  ctx.lineTo(x0 + w, y1 - ch); ctx.lineTo(x0 + w - ch, y1); ctx.lineTo(x0 + ch, y1);
  ctx.lineTo(x0, y1 - ch); ctx.lineTo(x0, y0 + ch);
  ctx.closePath();
}

/** Whole-figure silhouette (leaves + spine) — glow, drop shadow, cloth clips. */
export function traceQuire(ctx: PathTarget, r: number, leaves: LeafPose[], hand: 1 | -1) {
  if ("beginPath" in ctx) ctx.beginPath();
  const rx = QUIRE_ROOT[0] * r * hand, ry = QUIRE_ROOT[1] * r;
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
export function drawQuireBody(ctx: CanvasRenderingContext2D, r: number, leaves: LeafPose[], hand: 1 | -1, p: QuirePaint) {
  const rx = QUIRE_ROOT[0] * r * hand, ry = QUIRE_ROOT[1] * r;
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
  ctx.translate(0, 0);
  ctx.scale(hand, 1);
  traceSpine(ctx, r);
  ctx.fillStyle = p.dark; ctx.fill();
  ctx.strokeStyle = p.edge; ctx.lineWidth = lw; ctx.stroke();
  ctx.restore();
}
