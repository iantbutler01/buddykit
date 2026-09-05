import type { FamilyName } from "./families";
import type { CoreShape } from "./cores";
import type { ThemeInput } from "./themes";
import type { BlobBody, BlobEyes } from "./blob";
import type { BlockBuild } from "./block";
import { accessoryRank, type AccessoryName } from "./accessories";

/**
 * The one configuration object. Everything is optional; identity fields have
 * concrete defaults and every tuning field is a multiplier where 1 is the
 * approved reference feel, 0.5 is half, 2 is double.
 *
 *   mountBuddy(canvas, { family: "petal", core: "d20", bob: 1.4, blinkRate: 2 })
 */
export interface BuddyConfig {
  // ---- identity ----
  /** visual species: geometric emblem, two-eyed blob, or stacked-slab block
   *  (default "emblem"). Everything else — hardness, shell ring, accessories —
   *  mixes freely. */
  species: "emblem" | "blob" | "block";
  /** orbit the emblem's plate shell around the blob body (default false) */
  shell: boolean;
  /** blob body hardness 0..1 — 0 soft organic blob, 1 rigid faceted core
   *  polyhedron (cfg.core picks the shape); eyes and motion harden with it */
  hardness: number;
  /** shell family — emblem, and the blob's ring when shell is on (default "tetra").
   *  "codex" (open book) and "fan" (peacock tail) pair with the spine core but mix with any. */
  family: FamilyName;
  /** body form — blob species (default "round") */
  body: BlobBody;
  /** slab proportions — block species (default "stout") */
  build: BlockBuild;
  /** eye style — blob species (default "googly") */
  eyes: BlobEyes;
  /** core body shape (default "sphere") */
  core: CoreShape;
  /** accessories — blob species; combine freely, drawn in array order (default []) */
  accessories: AccessoryName[];
  /** per-accessory primary-color overrides, e.g. { tie: "#d6453d" } — details
   *  (buckles, drawstrings, inner ears) keep their doctrine colors */
  accessoryColors: Partial<Record<AccessoryName, string>>;
  /** registered theme name, or a raw BuddyTheme color object (default "ember") */
  theme: ThemeInput;
  /** resting shell spread 0..1 — trust posture (strict .15 / standard .35 / high .55) */
  trust: number;
  /** deterministic personality jitter (same seed → same being) */
  seed: number;

  // ---- look (multipliers, 1 = reference) ----
  /** overall size within the canvas */
  scale: number;
  /** shell plate size */
  plateSize: number;
  /** core body size */
  coreSize: number;
  /** lens eye size */
  eyeSize: number;
  /** blob eye spacing — distance between the two eyes (multiplier) */
  eyeSpacing: number;
  /** blob eye vertical placement — how high the eyes ride (multiplier) */
  eyeRaise: number;
  /** blob eye lateral bias in body-radius units, -1..1 (Grok's off-center glance look) */
  eyeShift: number;
  /** blob eye rotation in degrees, mirrored across the pair — 90 turns slits
   *  horizontal; small values slant them like brows (-90..90, default 0) */
  eyeAngle: number;
  /** blob body squareness 0..1 — 0 = organic round, 1 = rounded square (superellipse) */
  squareness: number;
  /** blob body gradient 0..1 — 0 = flat fill, 1 = full soft top-light/bottom-shade */
  gradient: number;
  /** gravity 0..1 — 0 playful, 1 grave: hard corners, muted highlights,
   *  narrower eyes, slower bob and tilt, no pixie dust (default 0) */
  gravity: number;
  /** glow/bloom intensity */
  glow: number;
  /** pixie-dust emission rate (0 = off) */
  sparkle: number;

  // ---- motion (multipliers, 1 = reference) ----
  /** hover bob amplitude */
  bob: number;
  /** curious head-cock magnitude */
  tiltiness: number;
  /** how far the shell travels between closed and open */
  spread: number;
  /** global tempo — phase clocks and personality timers */
  speed: number;

  // ---- personality cadence (multipliers, 1 = reference) ----
  /** blink frequency */
  blinkRate: number;
  /** saccade/glance frequency */
  glanceRate: number;
}

export const DEFAULT_CONFIG: BuddyConfig = {
  species: "emblem",
  shell: false,
  hardness: 0,
  family: "tetra",
  body: "round",
  build: "stout",
  eyes: "googly",
  core: "sphere",
  accessories: [],
  accessoryColors: {},
  theme: "ember",
  trust: 0.35,
  seed: 42,

  scale: 1,
  plateSize: 1,
  coreSize: 1,
  eyeSize: 1,
  eyeSpacing: 1,
  eyeRaise: 1,
  eyeShift: 0,
  eyeAngle: 0,
  squareness: 0,
  gradient: 0,
  gravity: 0,
  glow: 1,
  sparkle: 1,

  bob: 1,
  tiltiness: 1,
  spread: 1,
  speed: 1,

  blinkRate: 1,
  glanceRate: 1,
};

export function resolveConfig(partial: Partial<BuddyConfig> = {}): BuddyConfig {
  const cfg = { ...DEFAULT_CONFIG, ...partial };
  cfg.trust = Math.max(0, Math.min(1, cfg.trust));
  for (const k of [
    "scale", "plateSize", "coreSize", "eyeSize", "eyeSpacing", "glow", "sparkle",
    "bob", "tiltiness", "spread", "speed", "blinkRate", "glanceRate",
  ] as const) {
    cfg[k] = Math.max(0, cfg[k]);
  }
  cfg.eyeShift = Math.max(-1, Math.min(1, cfg.eyeShift));
  cfg.eyeAngle = Math.max(-90, Math.min(90, cfg.eyeAngle));
  cfg.squareness = Math.max(0, Math.min(1, cfg.squareness));
  cfg.gradient = Math.max(0, Math.min(1, cfg.gradient));
  cfg.gravity = Math.max(0, Math.min(1, cfg.gravity));
  cfg.accessoryColors = { ...cfg.accessoryColors };
  cfg.accessories = [...new Set(cfg.accessories)]
    .filter((a) => a !== "none")
    .sort((a, b) => accessoryRank(a) - accessoryRank(b));
  cfg.eyeRaise = Math.max(-1, Math.min(3, cfg.eyeRaise));  // negative = below center
  cfg.hardness = Math.max(0, Math.min(1, cfg.hardness));
  cfg.shell = !!cfg.shell;
  return cfg;
}
