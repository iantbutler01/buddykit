/**
 * Shell families — frontal emblem layouts (angle°, dist, size, shape).
 * Grammar invariants every family obeys:
 *  - segments never touch the core (seam gap always visible)
 *  - tips point outward; classic proportion = tall top spike, wings angled down
 */
export type ShapeKind = "kite" | "wedge" | "seg" | "petal" | "bar" | "page" | "leaf";

export interface PlateDef {
  a: number;   // home angle, degrees (-90 = top)
  d: number;   // distance multiplier
  s: number;   // size multiplier
  sh: ShapeKind;
}

export type FamilyName = "tetra" | "octa" | "ring" | "petal" | "shard" | "prism" | "codex" | "fan";


export const FAMILIES: Record<FamilyName, PlateDef[]> = {
  tetra: [
    { a: -90, d: 1.08, s: 1.45, sh: "kite" },
    { a: 152, d: 0.98, s: 1.12, sh: "kite" },
    { a: 28, d: 0.98, s: 1.12, sh: "kite" },
  ],
  octa: [...Array(8)].map((_, i) => ({ a: i * 45 - 90, d: 1, s: 0.78, sh: "wedge" as const })),
  ring: [...Array(10)].map((_, i) => ({ a: i * 36 - 90, d: 1.02, s: 0.6, sh: "seg" as const })),
  petal: [...Array(6)].map((_, i) => ({ a: i * 60 - 90, d: 1, s: 0.92, sh: "petal" as const })),
  shard: [
    { a: -90, d: 1.06, s: 1.2, sh: "kite" },
    { a: -20, d: 0.95, s: 0.85, sh: "wedge" },
    { a: 45, d: 1.05, s: 1.0, sh: "kite" },
    { a: 135, d: 0.95, s: 0.85, sh: "wedge" },
    { a: 200, d: 1.03, s: 1.05, sh: "kite" },
  ],
  prism: [...Array(6)].map((_, i) => ({ a: i * 60 - 90, d: 1.05, s: 0.95, sh: "bar" as const })),
  // an open book: three stepped pages a side, the outer ones larger and
  // splayed a little further from level, so the stack reads as leaves
  // turned open from the spine core
  codex: [
    { a: 180 + 4, d: 0.62, s: 1.55, sh: "page" }, { a: 180 + 9, d: 0.7, s: 1.4, sh: "page" }, { a: 180 + 14, d: 0.78, s: 1.25, sh: "page" },
    { a: -4, d: 0.62, s: 1.55, sh: "page" }, { a: -9, d: 0.7, s: 1.4, sh: "page" }, { a: -14, d: 0.78, s: 1.25, sh: "page" },
  ],
  // a peacock tail: five leaves fanned over the top, centre longest
  fan: [
    { a: -130, d: 0.7, s: 1.0, sh: "leaf" }, { a: -110, d: 0.78, s: 1.12, sh: "leaf" }, { a: -90, d: 0.84, s: 1.2, sh: "leaf" },
    { a: -70, d: 0.78, s: 1.12, sh: "leaf" }, { a: -50, d: 0.7, s: 1.0, sh: "leaf" },
  ],
};

/** Crisp graphic shapes — pointed OUT, flat toward core. Local coords, +y toward core. */
export function shapePts(sh: ShapeKind, s: number): [number, number][] {
  switch (sh) {
    case "kite": return [[0, -s * 1.35], [s * .78, -s * .1], [0, s * .42], [-s * .78, -s * .1]];
    case "wedge": return [[0, -s * 1.3], [s * .55, -s * .15], [s * .32, s * .4], [-s * .32, s * .4], [-s * .55, -s * .15]];
    case "seg": return [[-s * .5, -s * .9], [s * .5, -s * .9], [s * .72, s * .1], [-s * .72, s * .1]];
    case "petal": return [[0, -s * 1.3], [s * .62, -s * .35], [s * .4, s * .4], [-s * .4, s * .4], [-s * .62, -s * .35]];
    case "bar": return [[-s * .3, -s * 1.45], [s * .3, -s * 1.45], [s * .38, s * .35], [-s * .38, s * .35]];
    // a page: tall along the plate's own x (screen-vertical beside a spine), shallow outward
    case "page": return [[-s * 1.3, s * .3], [s * 1.3, s * .3], [s * 1.3, -s * .95], [-s * 1.3, -s * .95]];
    // a leaf: long rounded strip pointing outward
    case "leaf": return [[-s * .4, s * .35], [s * .4, s * .35], [s * .4, -s * 1.7], [-s * .4, -s * 1.7]];
  }
}

/** The accent stroke every plate carries: a chevron at the tip of a pointed
 *  shape; on a page, a gilt line along its fore-edge (the outer edge). */
export function shapeAccent(sh: ShapeKind, s: number): [number, number][] {
  if (sh === "page") return [[-s * 1.05, -s * 0.8], [s * 1.05, -s * 0.8]];
  return [[-s * 0.16, -s * 0.98], [0, -s * 1.22], [s * 0.16, -s * 0.98]];
}

/** Detail lines drawn on a plate's face after the shade, in local coords —
 *  a page carries text rules so the shell reads as a book, not a monitor. */
export function shapeDetail(sh: ShapeKind, s: number): [number, number, number, number][] {
  if (sh !== "page") return [];
  return [-0.8, -0.4, 0, 0.4, 0.8].map((k) => [s * k, -s * 0.72, s * k, s * 0.05] as [number, number, number, number]);
}
