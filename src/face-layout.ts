import type { BuddyConfig } from './config';

/** Resting face proportions shared by the eyes and their accessories. */
export function faceLayout(config: BuddyConfig) {
  return {
    halfSpacing: .24 * config.eyeSpacing,
    centerX: config.eyeShift * .15,
    centerY: .16 * config.eyeRaise,
    pillScale: .082 * config.eyeSize,
    lensRadius: .23 * config.eyeSize,
  };
}
