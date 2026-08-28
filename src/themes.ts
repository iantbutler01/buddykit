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
