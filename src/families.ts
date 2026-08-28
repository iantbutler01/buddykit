/**
 * Shell families — frontal emblem layouts (angle°, dist, size, shape).
 * Grammar invariants every family obeys:
 *  - segments never touch the core (seam gap always visible)
 *  - tips point outward; classic proportion = tall top spike, wings angled down
 */
export type ShapeKind = "kite" | "wedge" | "seg" | "petal" | "bar";

export interface PlateDef {
  a: number;   // home angle, degrees (-90 = top)
  d: number;   // distance multiplier
  s: number;   // size multiplier
  sh: ShapeKind;
}

export type FamilyName = "tetra" | "octa" | "ring" | "petal" | "shard" | "prism";

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
};

/** Crisp graphic shapes — pointed OUT, flat toward core. Local coords, +y toward core. */
export function shapePts(sh: ShapeKind, s: number): [number, number][] {
  switch (sh) {
    case "kite": return [[0, -s * 1.35], [s * .78, -s * .1], [0, s * .42], [-s * .78, -s * .1]];
    case "wedge": return [[0, -s * 1.3], [s * .55, -s * .15], [s * .32, s * .4], [-s * .32, s * .4], [-s * .55, -s * .15]];
    case "seg": return [[-s * .5, -s * .9], [s * .5, -s * .9], [s * .72, s * .1], [-s * .72, s * .1]];
    case "petal": return [[0, -s * 1.3], [s * .62, -s * .35], [s * .4, s * .4], [-s * .4, s * .4], [-s * .62, -s * .35]];
    case "bar": return [[-s * .3, -s * 1.45], [s * .3, -s * 1.45], [s * .38, s * .35], [-s * .38, s * .35]];
  }
}
