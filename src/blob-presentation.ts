/** The approved accessory-lineup pose, sampled from its two-axis motion at 2.65 seconds. */
export const BLOB_PRESENTATION = {
  turn: 0.35, tilt: -0.06, phase: 2.65 / 1.4, period: 1.4,
  yawFrequency: 0.7, yawAmount: 0.24, pitchAmount: 0.20,
  ambientIntensity: 1.85, lightIntensity: 1.3, lightPosition: [4, 3, 6] as const,
};

export function blobPose(elapsedSeconds = 0) {
  const p = BLOB_PRESENTATION, phase = p.phase + elapsedSeconds / p.period;
  return { turn: p.turn + Math.sin(phase * p.yawFrequency) * p.yawAmount,
    tilt: p.tilt + Math.sin(phase) * p.pitchAmount };
}
