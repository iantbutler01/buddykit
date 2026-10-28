import type { BuddyConfig } from './config';

/** Resting face proportions shared by the eyes and their accessories. */
export function faceLayout(config: BuddyConfig) {
  return {
    halfSpacing: .30 * config.eyeSpacing,
    centerX: config.eyeShift * .15,
    centerY: .10 * config.eyeRaise,
    pillScale: .13 * config.eyeSize,
    lensRadius: .34 * config.eyeSize,
  };
}
