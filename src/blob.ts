/**
 * The blob species — soft, organic, two-eyed (Duolingo-adjacent warmth),
 * sharing buddykit's palette doctrine and motion grammar:
 *  - body fill = theme.face, belly shade = theme.side, outline = theme.edge
 *  - eyes = theme.coreDisc pupils with theme.eyeHot glints (dark features)
 *  - one hot accent: the antenna chevron (same mark as the emblem plate tips)
 *  - squash-and-stretch life, lid blinks (organic species blink with lids),
 *    shared saccades/attention/away semantics
 */
export type BlobBody = "round" | "droplet" | "bean" | "pebble";

export const BLOB_BODIES: BlobBody[] = ["round", "droplet", "bean", "pebble"];

interface BodyDef {
  sx: number;
  sy: number;
  /** radial bumps: [angleDeg, amplitude, widthRad] */
  bumps: [number, number, number][];
  /** amplitude of the living wobble harmonics */
  wobble: number;
}

const BODIES: Record<BlobBody, BodyDef> = {
  round:   { sx: 1,    sy: 1,    bumps: [], wobble: 0.022 },
  droplet: { sx: 0.92, sy: 1.05, bumps: [[-90, 0.30, 0.55]], wobble: 0.018 },
  bean:    { sx: 1.22, sy: 0.88, bumps: [[-90, -0.12, 0.7]], wobble: 0.02 },
  pebble:  { sx: 1.1,  sy: 0.94, bumps: [[-40, 0.08, 0.9], [140, 0.06, 0.8], [60, -0.05, 0.7]], wobble: 0.03 },
};

/** Trace the blob outline into the current path. squash: +stretch / -squash. */
export function traceBlob(
  ctx: CanvasRenderingContext2D,
  body: BlobBody,
  r: number,
  t: number,
  phase: number,
  squash: number,
) {
  const def = BODIES[body];
  const N = 36;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 - Math.PI / 2;
    let rad = 1;
    for (const [a0, amp, w] of def.bumps) {
      let d = th - (a0 * Math.PI) / 180;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      rad += amp * Math.exp(-(d * d) / (2 * w * w));
    }
    rad += def.wobble * (
      Math.sin(th * 3 + phase + t * 0.9) * 0.6 +
      Math.sin(th * 5 - phase * 2 + t * 0.6) * 0.4
    );
    const x = Math.cos(th) * rad * r * def.sx * (1 + squash * 0.5);
    const y = Math.sin(th) * rad * r * def.sy * (1 - squash);
    pts.push([x, y]);
  }
  ctx.beginPath();
  for (let i = 0; i < N; i++) {
    const a = pts[i], b = pts[(i + 1) % N];
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if (i === 0) ctx.moveTo(mx, my);
    else ctx.quadraticCurveTo(a[0], a[1], mx, my);
  }
  const a0 = pts[0], b0 = pts[1];
  ctx.quadraticCurveTo(a0[0], a0[1], (a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2);
  ctx.closePath();
}
