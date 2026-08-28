/**
 * Material packs. Color system contract (the Ghost-grammar invariant):
 * light shell faces / dark seams / ONE hot accent. Accent rides edges, never fills.
 */
export interface BuddyTheme {
  face: string;
  side: string;
  edge: string;
  coreDisc: string;
  eyeHot: string;
  eye: string;
  accent: string;
  /** rgba prefix, alpha appended at draw time, e.g. "rgba(232,134,46," */
  glow: string;
  seam: string;
}

const BUILTIN: Record<string, BuddyTheme> = {
  ember: {
    face: "#f6ecdb", side: "#e2cfae", edge: "#c9b28a",
    coreDisc: "#241a10", eyeHot: "#fff3dc", eye: "#ffab45", accent: "#e8862e",
    glow: "rgba(232,134,46,", seam: "rgba(60,40,18,.28)",
  },
  sumi: {
    face: "#f4efe6", side: "#ddd4c2", edge: "#bfb39c",
    coreDisc: "#191613", eyeHot: "#ffe6d8", eye: "#f0663f", accent: "#d24a33",
    glow: "rgba(210,74,51,", seam: "rgba(35,30,25,.3)",
  },
  signal: {
    face: "#eef5f4", side: "#d2e2df", edge: "#a9c4c0",
    coreDisc: "#0d1f1e", eyeHot: "#eafffb", eye: "#43e0d2", accent: "#2fa9a0",
    glow: "rgba(63,214,200,", seam: "rgba(10,45,42,.3)",
  },
};

const registry = new Map<string, BuddyTheme>(Object.entries(BUILTIN));

export function registerTheme(name: string, theme: BuddyTheme) {
  registry.set(name, theme);
}

export function getTheme(name: string): BuddyTheme {
  const t = registry.get(name);
  if (!t) throw new Error(`buddykit: unknown theme "${name}"`);
  return t;
}

export function themeNames(): string[] {
  return [...registry.keys()];
}

/** Accept a registered name or a raw BuddyTheme object. */
export type ThemeInput = string | BuddyTheme;

export function resolveTheme(input: ThemeInput): BuddyTheme {
  return typeof input === "string" ? getTheme(input) : input;
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mixRgb(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [0, 1, 2].map((i) => Math.round(a[i] + (b[i] - a[i]) * t)) as [number, number, number];
}
function mix(a: [number, number, number], b: [number, number, number], t: number): string {
  return `#${mixRgb(a, b, t).map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/**
 * One color in → a full grammar-compliant palette out.
 * Shell faces stay near-neutral (tinted toward the accent), seams stay dark,
 * the accent carries the eye, edges, and glow.
 *
 *   mountBuddy(canvas, { theme: themeFromAccent("#7c5cff") })
 */
export function themeFromAccent(accent: string, opts: { neutral?: "warm" | "cool" } = {}): BuddyTheme {
  const a = hexToRgb(accent);
  const white: [number, number, number] = [255, 255, 255];
  const base: [number, number, number] = opts.neutral === "cool" ? [238, 242, 243] : [246, 240, 228];
  const dark: [number, number, number] = [24, 20, 15];
  return {
    face: mix(base, a, 0.05),
    side: mix(mixRgb(base, [0, 0, 0], 0.12), a, 0.1),
    edge: mix(mixRgb(base, [0, 0, 0], 0.28), a, 0.15),
    coreDisc: mix(dark, a, 0.12),
    eyeHot: mix(white, a, 0.15),
    eye: mix(a, white, 0.25),
    accent,
    glow: `rgba(${a[0]},${a[1]},${a[2]},`,
    seam: `rgba(${Math.round(a[0] * 0.25)},${Math.round(a[1] * 0.25)},${Math.round(a[2] * 0.25)},.28)`,
  };
}
