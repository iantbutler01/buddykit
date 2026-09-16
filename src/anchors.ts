/**
 * Where an accessory sits on a body.
 *
 * An accessory is drawn once and worn by every species, so it cannot assume
 * blob geometry — a round body whose chin is also its bottom edge. A block has
 * a head slab, a torso and legs, and cloth pinned to "the bottom of the body"
 * lands around its shins.
 *
 * So each species publishes the same named places — the top and the sides of
 * its head, its face, its neck, chest and waist, plus the whole-body frame a
 * cape hangs from — and every accessory draws against the one it belongs to.
 * Accessories never read the silhouette directly.
 */

export type AnchorName = "headTop" | "headSide" | "face" | "neck" | "chest" | "waist" | "body";

export interface Anchor {
  /** origin in body space; for a paired place (headSide) x is the right-hand side */
  x: number;
  y: number;
  /** width unit — the half-width of the part being worn, so the accessory scales with it */
  r: number;
  /** room below the origin: how far cloth may hang before it runs off the part */
  drop: number;
  /** room above the origin that still belongs to this place. A blob's collar has
   *  the whole lower face above it; a block's collar has none — the head starts
   *  immediately — so anything that reaches upward is bounded by this. */
  rise: number;
}

/** The places one body offers. Every species builds the full set. */
export type BodyAnchors = Record<AnchorName, Anchor>;

/** The eye line a species hands its anchor builder: resting centre + gaze offsets. */
export interface EyeLine {
  /** resting eye centre y (no gaze offset) — what the head is built around */
  cy: number;
  /** gaze offsets, so face-worn accessories track the eyes and head-worn ones don't */
  ox: number;
  oy: number;
}

/** Head-worn places ride the head: on a block they tilt and shift with it. */
export function anchorRidesHead(name: AnchorName): boolean {
  return name === "headTop" || name === "headSide" || name === "face";
}
