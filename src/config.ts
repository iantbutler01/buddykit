import type { FamilyName } from "./families";
import type { CoreShape } from "./cores";
import type { ThemeInput } from "./themes";
import type { BlobBody } from "./blob";

/**
 * The one configuration object. Everything is optional; identity fields have
 * concrete defaults and every tuning field is a multiplier where 1 is the
 * approved reference feel, 0.5 is half, 2 is double.
 *
 *   mountBuddy(canvas, { family: "petal", core: "d20", bob: 1.4, blinkRate: 2 })
 */
export interface BuddyConfig {
  // ---- identity ----
  /** visual species: geometric emblem or soft two-eyed blob (default "emblem") */
  species: "emblem" | "blob";
  /** shell family — emblem species (default "tetra") */
  family: FamilyName;
  /** body form — blob species (default "round") */
  body: BlobBody;
  /** core body shape (default "sphere") */
  core: CoreShape;
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
  /** glow/bloom intensity */
  glow: number;

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
  family: "tetra",
  body: "round",
  core: "sphere",
  theme: "ember",
  trust: 0.35,
  seed: 42,

  scale: 1,
  plateSize: 1,
  coreSize: 1,
  eyeSize: 1,
  glow: 1,

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
    "scale", "plateSize", "coreSize", "eyeSize", "glow",
    "bob", "tiltiness", "spread", "speed", "blinkRate", "glanceRate",
  ] as const) {
    cfg[k] = Math.max(0, cfg[k]);
  }
  return cfg;
}
