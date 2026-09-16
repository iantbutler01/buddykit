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
import type { Anchor, BodyAnchors, EyeLine } from "./anchors";

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

/** A drawable path target — the live 2d context or a Path2D being built. */
export type PathTarget = CanvasRenderingContext2D | Path2D;

const N = 72;
const COS = new Float64Array(N), SIN = new Float64Array(N), TH = new Float64Array(N);
for (let i = 0; i < N; i++) {
  TH[i] = (i / N) * Math.PI * 2 - Math.PI / 2;
  COS[i] = Math.cos(TH[i]);
  SIN[i] = Math.sin(TH[i]);
}

// static radial profiles are config-derived, not time-derived — memoize them
// so the per-frame cost is just the wobble sines (matters when a gallery page
// mounts dozens of rigs)
const profileCache = new Map<string, Float64Array>();
function staticProfile(body: BlobBody, squareness: number): Float64Array {
  const key = body + "|" + squareness.toFixed(4);
  const hit = profileCache.get(key);
  if (hit) return hit;
  const def = BODIES[body];
  const n = 2 + squareness * 10;
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const th = TH[i];
    let rad = squareness > 0
      ? Math.pow(Math.pow(Math.abs(COS[i]), n) + Math.pow(Math.abs(SIN[i]), n), -1 / n)
      : 1;
    for (const [a0, amp, w] of def.bumps) {
      let d = th - (a0 * Math.PI) / 180;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      rad += amp * Math.exp(-(d * d) / (2 * w * w));
    }
    out[i] = rad;
  }
  if (profileCache.size > 128) profileCache.clear();
  profileCache.set(key, out);
  return out;
}
const coreProfileCache = new Map<CoreShape, Float64Array>();
function coreProfile(core: CoreShape): Float64Array {
  const hit = coreProfileCache.get(core);
  if (hit) return hit;
  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) out[i] = coreRadiusAt(core, TH[i]);
  coreProfileCache.set(core, out);
  return out;
}

/** Trace the blob outline into a context or Path2D. squash: +stretch / -squash.
 *  hardness 0..1 morphs the organic silhouette toward the rigid core
 *  polyhedron (ray-sampled on the same radial grid); wobble fades with it. */
export function traceBlob(
  ctx: PathTarget,
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
  const soft = 1 - hardness;
  const base = staticProfile(body, squareness);
  const cores = hardness > 0 ? coreProfile(core) : null;
  const sx = def.sx + (1 - def.sx) * hardness, sy = def.sy + (1 - def.sy) * hardness;
  const kx = sx * (1 + squash * 0.5), ky = sy * (1 - squash);
  const wob = def.wobble * soft;
  const pts: [number, number][] = [];
  for (let i = 0; i < N; i++) {
    const th = TH[i];
    const rad = base[i] + (wob !== 0
      ? wob * (Math.sin(th * 3 + phase + t * 0.9) * 0.6 + Math.sin(th * 5 - phase * 2 + t * 0.6) * 0.4)
      : 0);
    const xs = COS[i] * rad * kx;
    const ys = SIN[i] * rad * ky;
    if (cores) {
      pts.push([(xs * soft + COS[i] * cores[i] * hardness) * r, (ys * soft + SIN[i] * cores[i] * hardness) * r]);
    } else {
      pts.push([xs * r, ys * r]);
    }
  }
  if ("beginPath" in ctx) ctx.beginPath();   // Path2D targets start empty
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

/**
 * The blob's wearing places. A blob has no neck and no waist: it is one soft
 * body, so its collar, chest and waist lines are fractions of the chin (botY)
 * — the proportions every accessory was originally drawn against — and its
 * head is the whole body, so hats scale with the body radius.
 */
export function blobAnchors(r: number, topY: number, botY: number, eye: EyeLine): BodyAnchors {
  const place = (y: number, x = 0): Anchor => ({ x, y, r, drop: botY - y, rise: y - topY });
  return {
    headTop: place(topY),
    // the headset's cups sit just inside the silhouette, below the eye line
    headSide: place(eye.cy + r * 0.28, r * 0.92),
    face: place(eye.cy + eye.oy, eye.ox),
    neck: place(botY * 0.44),
    chest: place(botY * 0.5),
    waist: place(botY * 0.7),
    body: place(0),
  };
}

/** Eye styles: googly (Doozy-style big sclera) | slit (Grok minimal pills →
 *  rounded squares with hardness) | glint (dark pupils + hot spark) |
 *  dot (minimal filled rounds) | arc (upturned happy crescents) |
 *  ring (hollow rounds — curious robot) | lens (one aperture optic — intent). */
export type BlobEyes = "googly" | "slit" | "glint" | "dot" | "arc" | "ring" | "lens";
export const BLOB_EYES: BlobEyes[] = ["googly", "slit", "glint", "dot", "arc", "ring", "lens"];
