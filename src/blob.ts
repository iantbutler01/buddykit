/**
 * The blob species — soft, organic, two-eyed (Duolingo-adjacent warmth),
 * sharing buddykit's palette doctrine and motion grammar:
 *  - body fill = theme.face, belly shade = theme.side, outline = theme.edge
 *  - eyes = theme.coreDisc pupils with theme.eyeHot glints (dark features)
 *  - one hot accent: the antenna chevron (same mark as the emblem plate tips)
 *  - squash-and-stretch life, lid blinks (organic species blink with lids),
 *    shared saccades/attention/away semantics
 */
import { CoreShape, coreRadiusAt } from "./cores";

export type BlobBody = "round" | "droplet" | "bean" | "pebble" | "squircle" | "tri" | "cloud" | "hexy";

export const BLOB_BODIES: BlobBody[] = ["round", "droplet", "bean", "pebble", "squircle", "tri", "cloud", "hexy"];

interface BodyDef {
  sx: number;
  sy: number;
  /** radial bumps: [angleDeg, amplitude, widthRad] */
  bumps: [number, number, number][];
  /** amplitude of the living wobble harmonics */
  wobble: number;
}

const BODIES: Record<BlobBody, BodyDef> = {
  round:   { sx: 1,    sy: 1,    bumps: [], wobble: 0.01 },
  droplet: { sx: 0.92, sy: 1.05, bumps: [[-90, 0.30, 0.55]], wobble: 0.008 },
  bean:    { sx: 1.22, sy: 0.88, bumps: [[-90, -0.08, 0.8]], wobble: 0.009 },
  pebble:  { sx: 1.1,  sy: 0.94, bumps: [[-40, 0.07, 0.9], [140, 0.05, 0.8]], wobble: 0.013 },
  squircle:{ sx: 1.02, sy: 0.98, bumps: [[-45, 0.12, 0.55], [45, 0.12, 0.55], [135, 0.12, 0.55], [225, 0.12, 0.55]], wobble: 0.007 },
  tri:     { sx: 1.05, sy: 0.95, bumps: [[-90, 0.3, 0.65], [30, 0.26, 0.65], [150, 0.26, 0.65]], wobble: 0.008 },
  cloud:   { sx: 1.18, sy: 0.9,  bumps: [[-115, 0.13, 0.42], [-65, 0.16, 0.42], [-15, 0.12, 0.4], [-160, 0.1, 0.4]], wobble: 0.009 },
  hexy:    { sx: 1.0,  sy: 0.96, bumps: [[-90, 0.12, 0.45], [-30, 0.12, 0.45], [30, 0.12, 0.45], [90, 0.12, 0.45], [150, 0.12, 0.45], [210, 0.12, 0.45]], wobble: 0.007 },
};

/** Trace the blob outline into the current path. squash: +stretch / -squash.
 *  hardness 0..1 morphs the organic silhouette toward the rigid core
 *  polyhedron (ray-sampled on the same radial grid); wobble fades with it. */
export function traceBlob(
  ctx: CanvasRenderingContext2D,
  body: BlobBody,
  r: number,
  t: number,
  phase: number,
  squash: number,
  squareness = 0,
  hardness = 0,
  core: CoreShape = "sphere",
) {
  const def = BODIES[body];
  const N = 72;
  const soft = 1 - hardness;
  // superellipse exponent: 2 = circle, higher = squarer (rounded corners for free)
  const n = 2 + squareness * 10;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const th = (i / N) * Math.PI * 2 - Math.PI / 2;
    let rad = squareness > 0
      ? Math.pow(Math.pow(Math.abs(Math.cos(th)), n) + Math.pow(Math.abs(Math.sin(th)), n), -1 / n)
      : 1;
    for (const [a0, amp, w] of def.bumps) {
      let d = th - (a0 * Math.PI) / 180;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      rad += amp * Math.exp(-(d * d) / (2 * w * w));
    }
    rad += def.wobble * soft * (
      Math.sin(th * 3 + phase + t * 0.9) * 0.6 +
      Math.sin(th * 5 - phase * 2 + t * 0.6) * 0.4
    );
    const sx = def.sx + (1 - def.sx) * hardness, sy = def.sy + (1 - def.sy) * hardness;
    const xs = Math.cos(th) * rad * sx * (1 + squash * 0.5);
    const ys = Math.sin(th) * rad * sy * (1 - squash);
    if (hardness > 0) {
      const rc = coreRadiusAt(core, th);
      const xc = Math.cos(th) * rc, yc = Math.sin(th) * rc;
      pts.push([(xs * soft + xc * hardness) * r, (ys * soft + yc * hardness) * r]);
    } else {
      pts.push([xs * r, ys * r]);
    }
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

function edgeR(body: BlobBody, r: number, angle: number): number {
  const def = BODIES[body];
  let rad = 1;
  for (const [a0, amp, w] of def.bumps) {
    let d = angle - (a0 * Math.PI) / 180;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    rad += amp * Math.exp(-(d * d) / (2 * w * w));
  }
  return rad * r * def.sy;
}

/** Outline radius at the crown (-90°), bumps included, wobble ignored — accessory anchor. */
export function blobTopR(body: BlobBody, r: number): number {
  return edgeR(body, r, -Math.PI / 2);
}

/** Outline radius at the chin (+90°) — cloth necklines scale against this so bands fit squat/tall bodies. */
export function blobBotR(body: BlobBody, r: number): number {
  return edgeR(body, r, Math.PI / 2);
}

/** Eye styles: googly (Doozy-style big sclera) | slit (Grok minimal pills →
 *  rounded squares with hardness) | glint (dark pupils + hot spark) |
 *  dot (minimal filled rounds) | arc (upturned happy crescents) |
 *  ring (hollow rounds — curious robot). */
export type BlobEyes = "googly" | "slit" | "glint" | "dot" | "arc" | "ring";
export const BLOB_EYES: BlobEyes[] = ["googly", "slit", "glint", "dot", "arc", "ring"];
