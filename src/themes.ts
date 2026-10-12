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
  // ---- the grave packs: cool, no red anywhere. A red body with a hot orange
  // optic is the killer-robot trope; these keep intensity in contrast and
  // value, not in warmth. ----
  slate: {
    face: "#eef1f6", side: "#d3d9e4", edge: "#a7b1c3",
    coreDisc: "#141a24", eyeHot: "#eaf6ff", eye: "#9fd0ff", accent: "#5b6f8f",
    glow: "rgba(122,160,214,", seam: "rgba(20,26,36,.3)",
  },
  indigo: {
    face: "#f0eff8", side: "#d8d6ea", edge: "#aeaac9",
    coreDisc: "#17152a", eyeHot: "#f1efff", eye: "#b9b4ff", accent: "#5b57a8",
    glow: "rgba(139,133,232,", seam: "rgba(23,21,42,.3)",
  },
  graphite: {
    face: "#f1f1f2", side: "#d9dadd", edge: "#b0b3b9",
    coreDisc: "#121316", eyeHot: "#f4f7fb", eye: "#cfd8e3", accent: "#6a6f78",
    glow: "rgba(170,178,190,", seam: "rgba(18,19,22,.3)",
  },
  verdigris: {
    face: "#eef4f0", side: "#d3e0d7", edge: "#a6bfb0",
    coreDisc: "#101c17", eyeHot: "#edfff6", eye: "#8fe0b8", accent: "#3f8f7a",
    glow: "rgba(96,190,160,", seam: "rgba(16,28,23,.3)",
  },
};

const registry = new Map<string, BuddyTheme>(Object.entries(BUILTIN));

/** The near-black the pop palettes use for eyes, cloth and the silhouette body. */
export const POP_INK = "#16181d";

/**
 * Pop hues: one pure colour per being, deep enough that white eyes and ink
 * accessories both read on it (pair with finish: "pop"). "pop-ink" is the
 * silhouette: an ink body whose cloth defaults to white — the iPod-ad figure.
 */
export const POP_HUES = {
  "pop-lime": "#62c31b",
  "pop-pink": "#ff3d8b",
  "pop-cobalt": "#1e7bff",
  "pop-tangerine": "#ff7a1a",
  "pop-violet": "#8a4dff",
  // usenym.com's hues; its blue and lilac are cobalt and violet above.
  "pop-coral": "#ff5b3a",
  "pop-gold": "#ffae00",
  "pop-green": "#26b257",
  "pop-ink": POP_INK,
} as const;
for (const [name, hue] of Object.entries(POP_HUES)) registry.set(name, popTheme(hue));

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

const warnedUnknown = new Set<string>();

/**
 * Rendering never fails on a name this build doesn't know: a look saved by a newer
 * buddykit (a hue added later) draws in "ember" instead of taking the app down.
 * getTheme stays strict for callers that ask for a specific theme.
 */
export function resolveTheme(input: ThemeInput): BuddyTheme {
  if (typeof input !== "string") return input;
  // "#rrggbb" is sugar for themeFromAccent — one accent color is a full identity
  if (input.startsWith("#")) return themeFromAccent(input);
  const theme = registry.get(input);
  if (theme) return theme;
  if (!warnedUnknown.has(input)) {
    warnedUnknown.add(input);
    console.warn(`buddykit: unknown theme "${input}", drawing "ember"`);
  }
  return getTheme("ember");
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

/**
 * One saturated hue in → a pop palette out: the hue is the whole body, eyes and
 * sparks are white, and cloth and pupils are ink — or white, when the hue itself
 * is too dark for ink to read on (the silhouette).
 *
 *   mountBuddy(canvas, { finish: "pop", theme: popTheme("#ff3d8b") })
 */
export function popTheme(hue: string): BuddyTheme {
  const a = hexToRgb(hue);
  const ink = hexToRgb(POP_INK);
  const white: [number, number, number] = [255, 255, 255];
  const lum = (0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]) / 255;
  const dark = lum < 0.18 ? "#ffffff" : POP_INK;
  return {
    face: mix(white, a, 0.1),
    side: mix(white, a, 0.2),
    edge: mix(a, ink, 0.25),
    coreDisc: dark,
    eyeHot: "#ffffff",
    eye: "#ffffff",
    accent: hue,
    glow: `rgba(${a[0]},${a[1]},${a[2]},`,
    seam: `rgba(${ink[0]},${ink[1]},${ink[2]},.28)`,
  };
}

/** Blend two #rrggbb colours (t = 0 → a, 1 → b). Anything else comes back as a. */
export function mixHex(a: string, b: string, t: number): string {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return a;
  return mix(hexToRgb(a), hexToRgb(b), t);
}

/** Per-element color spec — plain hex everywhere; buddykit handles formats. */
export interface ThemeSpec {
  /** start from a registered theme name or raw theme (default "ember") */
  base?: ThemeInput;
  face?: string;
  side?: string;
  edge?: string;
  coreDisc?: string;
  eyeHot?: string;
  eye?: string;
  accent?: string;
  /** plain hex — converted to the internal rgba prefix */
  glow?: string;
  /** plain hex — converted to a soft rgba shadow */
  seam?: string;
}

/** Recover a hex from the internal glow rgba prefix (for UIs editing themes). */
export function glowToHex(glowPrefix: string): string {
  const m = glowPrefix.match(/rgba\((\d+),(\d+),(\d+),/);
  if (!m) return "#000000";
  return `#${[m[1], m[2], m[3]].map((v) => (+v).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * Layered per-element theming — plain hex for every element, on any base:
 *
 *   makeTheme({ base: "ember", eye: "#ff3355" })            // one-off tweak
 *   makeTheme({ base: themeFromAccent("#7c5cff"), face: "#ffffff" })
 *
 * accent doubles as the default for glow when glow isn't given.
 */
export function makeTheme(spec: ThemeSpec = {}): BuddyTheme {
  const base = resolveTheme(spec.base ?? "ember");
  const out: BuddyTheme = { ...base };
  for (const k of ["face", "side", "edge", "coreDisc", "eyeHot", "eye", "accent"] as const) {
    if (spec[k]) out[k] = spec[k]!;
  }
  const glowHex = spec.glow ?? (spec.accent && !spec.glow ? spec.accent : undefined);
  if (glowHex) {
    const [r, g, b] = hexToRgb(glowHex);
    out.glow = `rgba(${r},${g},${b},`;
  }
  if (spec.seam) {
    const [r, g, b] = hexToRgb(spec.seam);
    out.seam = `rgba(${r},${g},${b},.28)`;
  }
  return out;
}
