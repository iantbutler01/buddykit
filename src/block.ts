/**
 * The block species — a chunky stacked-slab figure: crown, head and torso
 * as a stack, jointed arms and legs hung off the torso (block-limbs.ts owns
 * the poses). Every chunk is a rounded rectangle with a hairline theme-edge
 * outline, a shade strip down one side and a highlight along the top so it
 * reads as a solid piece rather than a flat sticker. Shares buddykit's
 * palette doctrine (accent body, theme-dark features); a block squashes a
 * little, never wobbles, and says the rest with its limbs.
 */
import type { PathTarget } from "./blob";
import { drawLens, type LensParams } from "./lens";
import { REST_POSE, type BlockPose, type ArmPose, type LegPose } from "./block-limbs";
import type { Anchor, BodyAnchors, EyeLine } from "./anchors";

export type BlockBuild = "stout" | "tall" | "wide" | "mini" | "long" | "sentinel";
export const BLOCK_BUILDS: BlockBuild[] = ["stout", "tall", "wide", "mini", "long", "sentinel"];

/** Slab proportions in body-radius units. Widths are full widths, heights are full heights. */
interface BuildDef {
  crownW: number; crownH: number;
  headW: number; headH: number;
  torsoW: number; torsoH: number;
  /** leg (shin) width and length, gap between the legs */
  legW: number; legH: number; legGap: number;
  /** arm width and upper-arm length; the forearm is 0.85 of it, the hand a cube */
  nubW: number; nubH: number;
  /** eye centre spacing (full) and drop below the head top, in head units */
  eyeSpread: number; eyeDrop: number;
}

const BUILDS: Record<BlockBuild, BuildDef> = {
  stout: { crownW: 1.55, crownH: 0.34, headW: 1.42, headH: 0.86, torsoW: 1.3, torsoH: 0.62, legW: 0.42, legH: 0.3, legGap: 0.18, nubW: 0.2, nubH: 0.34, eyeSpread: 0.62, eyeDrop: 0.5 },
  tall:  { crownW: 1.4,  crownH: 0.3,  headW: 1.2,  headH: 0.9,  torsoW: 1.1, torsoH: 0.86, legW: 0.36, legH: 0.34, legGap: 0.16, nubW: 0.18, nubH: 0.42, eyeSpread: 0.56, eyeDrop: 0.48 },
  wide:  { crownW: 1.9,  crownH: 0.3,  headW: 1.8,  headH: 0.74, torsoW: 1.5, torsoH: 0.56, legW: 0.5,  legH: 0.26, legGap: 0.3,  nubW: 0.22, nubH: 0.3,  eyeSpread: 0.78, eyeDrop: 0.5 },
  mini:  { crownW: 1.5,  crownH: 0.28, headW: 1.4,  headH: 1.0,  torsoW: 0.96, torsoH: 0.4, legW: 0.34, legH: 0.22, legGap: 0.14, nubW: 0.16, nubH: 0.26, eyeSpread: 0.6,  eyeDrop: 0.52 },
  long:  { crownW: 1.3,  crownH: 0.26, headW: 1.16, headH: 0.7,  torsoW: 1.04, torsoH: 1.0, legW: 0.34, legH: 0.42, legGap: 0.14, nubW: 0.18, nubH: 0.5,  eyeSpread: 0.54, eyeDrop: 0.5 },
  // the monolith: narrow arms, a narrow crown, a long undivided torso — built for a visor or a lens
  sentinel: { crownW: 1.0, crownH: 0.2, headW: 1.08, headH: 0.98, torsoW: 1.0, torsoH: 1.12, legW: 0.4, legH: 0.3, legGap: 0.12, nubW: 0.17, nubH: 0.5, eyeSpread: 0.5, eyeDrop: 0.5 },
};

export interface Slab {
  x: number; y: number; w: number; h: number; r: number;
  kind: "crown" | "head" | "torso";
}

/** One rigid chunk of a limb, placed by a pivot and an angle: drawn hanging
 *  down from the pivot in local space, then rotated. */
export interface Chunk {
  px: number; py: number;
  /** radians, clockwise on screen */
  a: number;
  w: number; len: number; r: number;
  kind: "upper" | "fore" | "hand" | "shin" | "foot";
}

export interface Figure {
  /** crown, head, torso — the stack */
  slabs: Slab[];
  /** legs, drawn behind the torso */
  legs: Chunk[];
  /** arms, drawn in front of the torso so hands can cross it */
  arms: Chunk[];
  /** head transform: pivot (neck) and offset in body space, applied to head, crown, eyes */
  neck: { x: number; y: number; tilt: number; dx: number; dy: number };
  /** whole-figure lift (hop), body space */
  hop: number;
}

function squashK(squash: number) {
  return { kx: 1 + squash * 0.35, ky: 1 - squash * 0.7 };
}

/** The stack (crown, head, torso) for a build at body radius r. squash:
 *  +stretch / -squash as a whole-figure scale so the stack never separates.
 *  y = 0 sits mid-torso; the eyes ride in the head. */
export function blockSlabs(build: BlockBuild, r: number, squash = 0, gravity = 0): Slab[] {
  const d = BUILDS[build];
  const { kx, ky } = squashK(squash);
  const totalH = d.crownH + d.headH + d.torsoH + d.legH;
  const top = -totalH * 0.55;   // visual centre slightly below the head
  const corner = blockCorner(gravity);
  const slab = (kind: Slab["kind"], y: number, w: number, h: number, rr: number): Slab => ({
    kind, x: (-w / 2) * r * kx, y: y * r * ky, w: w * r * kx, h: h * r * ky, r: rr * r,
  });
  const crownY = top, headY = crownY + d.crownH, torsoY = headY + d.headH;
  return [
    slab("torso", torsoY, d.torsoW, d.torsoH, corner),
    slab("head", headY, d.headW, d.headH, corner * 1.3),
    slab("crown", crownY, d.crownW, d.crownH, corner * 0.85),
  ];
}

/** gravity squares the corners */
function blockCorner(gravity: number) {
  return 0.07 * (1 - gravity) + 0.012;
}

const DEG = Math.PI / 180;

/** The whole posed figure: the stack plus every limb chunk in draw order. */
export function blockFigure(build: BlockBuild, r: number, squash = 0, gravity = 0, pose: BlockPose = REST_POSE): Figure {
  const d = BUILDS[build];
  const { kx, ky } = squashK(squash);
  const corner = blockCorner(gravity);
  const slabs = blockSlabs(build, r, squash, gravity);
  const torso = slabs[0], head = slabs[1];
  const armW = d.nubW * 1.3 * r * kx, upper = d.nubH * 1.05 * r * ky, fore = upper * 0.8, hand = armW * 0.95;
  const legW = d.legW * r * kx, shin = d.legH * 1.1 * r * ky, footH = legW * 0.5, footW = legW * 1.35;
  const arms: Chunk[] = [], legs: Chunk[] = [];
  const chunk = (kind: Chunk["kind"], px: number, py: number, a: number, w: number, len: number, rr: number): Chunk =>
    ({ kind, px, py, a, w, len, r: rr * r });
  const arm = (side: -1 | 1, ap: ArmPose, shrug: number) => {
    // the shoulder sits just outside the torso so the arm hangs clear of it;
    // a shrug slides it up the torso side so a raised hand clears the head
    const sx = side > 0 ? torso.x + torso.w + armW * 0.42 : torso.x - armW * 0.42;
    const sy = torso.y + torso.h * 0.1 - shrug * r;
    // canvas rotation is clockwise, so a hanging chunk rotated by +a swings
    // toward -x; outward for the right side is therefore a negative angle
    const a1 = -side * ap.sh * DEG, a2 = -side * (ap.sh + ap.el) * DEG;
    const ex = sx - Math.sin(a1) * upper, ey = sy + Math.cos(a1) * upper;   // elbow
    const hx = ex - Math.sin(a2) * fore, hy = ey + Math.cos(a2) * fore;      // wrist
    arms.push(chunk("upper", sx, sy, a1, armW, upper, corner * 0.7));
    arms.push(chunk("fore", ex, ey, a2, armW * 0.92, fore, corner * 0.7));
    arms.push(chunk("hand", hx, hy, a2, hand, hand, corner * 0.9));
  };
  const leg = (side: -1 | 1, lp: LegPose) => {
    const hx = side * (d.legGap / 2 + d.legW / 2) * r * kx;
    const hy = torso.y + torso.h - legW * 0.2 - lp.lift * r;
    const a = -side * lp.kick * DEG;
    const fx = hx - Math.sin(a) * shin, fy = hy + Math.cos(a) * shin;
    legs.push(chunk("shin", hx, hy, a, legW, shin, corner * 0.7));
    legs.push(chunk("foot", fx, fy, a, footW, footH, corner * 0.6));
  };
  arm(-1, pose.armL, pose.shrugL); arm(1, pose.armR, pose.shrugR);
  leg(-1, pose.legL); leg(1, pose.legR);
  return {
    slabs, legs, arms,
    neck: { x: 0, y: head.y + head.h, tilt: pose.head.tilt, dx: pose.head.dx * r, dy: pose.head.dy * r },
    hop: pose.hop * r,
  };
}

function rect(ctx: PathTarget, s: Slab) {
  ctx.roundRect(s.x, s.y, s.w, s.h, s.r);
}

/** A chunk's four corners in body space (the silhouette skips its rounded corners). */
function chunkCorners(c: Chunk): [number, number][] {
  const cs = Math.cos(c.a), sn = Math.sin(c.a);
  const pt = (lx: number, ly: number): [number, number] => [c.px + lx * cs - ly * sn, c.py + lx * sn + ly * cs];
  const hw = c.w / 2, top = -c.w * 0.1;
  return [pt(-hw, top), pt(hw, top), pt(hw, c.len), pt(-hw, c.len)];
}

function tracePoly(ctx: PathTarget, pts: [number, number][]) {
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
}

/** Apply the head transform (neck pivot, tilt, offset) to the context. */
export function applyHeadTransform(ctx: CanvasRenderingContext2D, f: Figure) {
  ctx.translate(f.neck.dx, f.neck.dy);
  ctx.translate(f.neck.x, f.neck.y);
  ctx.rotate(f.neck.tilt);
  ctx.translate(-f.neck.x, -f.neck.y);
}

/** The whole-figure silhouette (stack and limbs) — glow, shadow and cloth clips. */
export function traceBlock(ctx: PathTarget, build: BlockBuild, r: number, squash = 0, gravity = 0, pose: BlockPose = REST_POSE) {
  if ("beginPath" in ctx) ctx.beginPath();
  const f = blockFigure(build, r, squash, gravity, pose);
  for (const c of [...f.legs, ...f.arms]) tracePoly(ctx, chunkCorners(c));
  rect(ctx, f.slabs[0]);
  for (const s of f.slabs.slice(1)) ctx.roundRect(s.x + f.neck.dx, s.y + f.neck.dy, s.w, s.h, s.r);
}

/** Crown top y (negative) and foot bottom y (positive) at rest — accessory anchors. */
export function blockTopY(build: BlockBuild, r: number, squash = 0): number {
  return Math.min(...blockSlabs(build, r, squash).map((s) => s.y));
}
export function blockBotY(build: BlockBuild, r: number, squash = 0): number {
  return Math.max(...blockFigure(build, r, squash).legs.map((c) => c.py + c.len));
}

/** Eye centres for a build: [±cx, cy] in body space (squash applied). */
export function blockEyeAnchor(build: BlockBuild, r: number, squash = 0): { cx: number; cy: number; headW: number; headH: number } {
  const d = BUILDS[build];
  const head = blockSlabs(build, r, squash).find((s) => s.kind === "head")!;
  return {
    cx: head.w * d.eyeSpread * 0.5,
    cy: head.y + head.h * d.eyeDrop,
    headW: head.w,
    headH: head.h,
  };
}

/** The torso slab alone — the region body cloth (scarf, shirt, belt) clips to. */
export function traceBlockTorso(ctx: PathTarget, build: BlockBuild, r: number, squash = 0, gravity = 0) {
  if ("beginPath" in ctx) ctx.beginPath();
  rect(ctx, blockSlabs(build, r, squash, gravity)[0]);
}

/** Head and crown — the region hair (the mane) clips to, in head-transform space. */
export function traceBlockHead(ctx: PathTarget, build: BlockBuild, r: number, squash = 0, gravity = 0) {
  if ("beginPath" in ctx) ctx.beginPath();
  for (const s of blockSlabs(build, r, squash, gravity).slice(1)) rect(ctx, s);
}

/**
 * The block's wearing places. Unlike the blob, a block has real parts: hats go
 * on the crown and scale with the widest head slab, glasses and the headset
 * span the head, and everything worn on cloth — collar, chest, belt — lives on
 * the torso, which is why none of them may be measured from the figure's
 * bottom edge (that is the soles of its feet).
 */
export function blockAnchors(build: BlockBuild, r: number, squash = 0, gravity = 0, eye: EyeLine): BodyAnchors {
  const [torso, head, crown] = blockSlabs(build, r, squash, gravity);
  const headBot = head.y + head.h, torsoBot = torso.y + torso.h;
  // a hat covers about two thirds of the widest head slab — the proportion the
  // body radius happens to give on a stout block, which is where hats were tuned
  const hatR = Math.max(crown.w, head.w) * 0.645;
  const headR = head.w / 2, torsoR = torso.w / 2;
  const onHead = (y: number, x = 0): Anchor => ({ x, y, r: headR, drop: headBot - y, rise: y - crown.y });
  const onTorso = (y: number, x = 0): Anchor => ({ x, y, r: torsoR, drop: torsoBot - y, rise: y - torso.y });
  // a cape hangs from the shoulders to the feet; it is drawn across 1.16 of its
  // own unit, so sizing it that way makes it cover the figure whatever the build
  const capeR = (blockBotY(build, r, squash) - torso.y) / 1.16;
  const capeY = torso.y + capeR * 0.18;
  return {
    headTop: { x: 0, y: crown.y, r: hatR, drop: headBot - crown.y, rise: 0 },
    headSide: onHead(eye.cy + headR * 0.28, headR * 0.98),
    face: onHead(eye.cy + eye.oy, eye.ox),
    // the collar zone is the top of the torso, not the whole of it: a scarf that
    // fills a rectangular torso to its hem reads as a bib
    neck: { ...onTorso(torso.y), drop: torso.h * 0.45 },
    chest: onTorso(torso.y + torso.h * 0.28),
    waist: onTorso(torso.y + torso.h * 0.7),
    body: { x: 0, y: capeY, r: capeR, drop: blockBotY(build, r, squash) - capeY, rise: capeY - torso.y },
  };
}

export interface BlockPaint {
  accent: string;
  edge: string;
  /** theme dark — the crown slab (hair/cap) is theme-dark like every feature */
  dark: string;
  DPR: number;
  /** 0..1 side-shade / top-light strength */
  bevel: number;
  /** 0..1 — squares corners, kills the top highlight, deepens the shade */
  gravity: number;
}

/** Fill, shade strip, top highlight and hairline outline for one rounded
 *  rectangle in the current transform — the two-tone that makes a flat
 *  rectangle read as a chunk. */
function paintChunk(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rr: number, dark: boolean, p: BlockPaint, lw: number) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, rr);
  ctx.fillStyle = dark ? p.dark : p.accent;
  ctx.fill();
  if (p.bevel > 0) {
    ctx.save();
    ctx.clip();
    const strip = Math.max(2, w * 0.14);
    ctx.fillStyle = `rgba(0,0,0,${(dark ? 0.22 : 0.16) * p.bevel * (1 + 0.8 * p.gravity)})`;
    ctx.fillRect(x + w - strip, y, strip, h);
    ctx.fillStyle = `rgba(255,255,255,${(dark ? 0.12 : 0.22) * p.bevel * (1 - p.gravity)})`;
    ctx.fillRect(x, y, w, Math.max(2, h * 0.12));
    ctx.restore();
  }
  ctx.beginPath(); ctx.roundRect(x, y, w, h, rr);
  ctx.strokeStyle = p.edge;
  ctx.lineWidth = lw;
  ctx.lineJoin = "round";
  ctx.stroke();
}

function paintLimb(ctx: CanvasRenderingContext2D, chunks: Chunk[], p: BlockPaint, lw: number) {
  for (const c of chunks) {
    ctx.save();
    ctx.translate(c.px, c.py);
    ctx.rotate(c.a);
    // hands and feet are theme-dark like every feature; the pivot overlap
    // (top = -0.1w) hides the joint seam under the parent chunk
    paintChunk(ctx, -c.w / 2, -c.w * 0.1, c.w, c.len + c.w * 0.1, c.r, c.kind === "hand" || c.kind === "foot", p, lw);
    ctx.restore();
  }
}

/** Paint the posed figure: legs, torso, arms, then the head and crown under
 *  the head transform. Returns the figure so the caller can place eyes and
 *  accessories with the same transform. */
export function drawBlockBody(ctx: CanvasRenderingContext2D, build: BlockBuild, r: number, squash: number, p: BlockPaint, pose: BlockPose = REST_POSE): Figure {
  const f = blockFigure(build, r, squash, p.gravity, pose);
  const lw = Math.max(1 * p.DPR, r * 0.03);
  paintLimb(ctx, f.legs, p, lw);
  const [torso, ...headStack] = f.slabs;
  paintChunk(ctx, torso.x, torso.y, torso.w, torso.h, torso.r, false, p, lw);
  paintLimb(ctx, f.arms, p, lw);
  ctx.save();
  applyHeadTransform(ctx, f);
  for (const s of headStack) paintChunk(ctx, s.x, s.y, s.w, s.h, s.r, s.kind === "crown", p, lw);
  ctx.restore();
  return f;
}

export type BlockEyeStyle = "googly" | "slit" | "glint" | "dot" | "arc" | "ring" | "sadarc" | "lens";

export interface BlockEyeParams {
  style: BlockEyeStyle;
  /** eye centres: ±cx + ox, cy + oy */
  cx: number; cy: number; ox: number; oy: number;
  /** head slab width — the visor band spans it */
  headW: number;
  /** base eye size (body radius × eyeSize × attention) */
  size: number;
  /** lid aperture 0..1 and closed flag (away / mid-blink) */
  ap: number; closed: boolean;
  /** gaze -1..1 */
  gx: number; gy: number;
  /** mirrored brow slant (radians) and resting rotation */
  slant: number; rot: number;
  dark: string; hot: string; edge: string;
  DPR: number;
  /** lens optic parameters — required for style "lens" */
  lens?: Omit<LensParams, "er" | "ap">;
}

/** Square-socket eyes. Every style is a rectangle grammar: sockets are
 *  theme-dark panels, pupils are white pixels, lids close by collapsing the
 *  socket's vertical scale (screen space, before rotation). */
export function drawBlockEyes(ctx: CanvasRenderingContext2D, e: BlockEyeParams) {
  const s = e.size;
  const sq = (x: number, y: number, w: number, h: number, rr: number) => {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, rr);
  };
  const sleepBar = (w: number) => {
    // a closed block eye is a flat white bar, not an arc
    sq(-w / 2, -s * 0.06, w, s * 0.12, s * 0.04);
    ctx.fillStyle = "#ffffff"; ctx.fill();
  };
  if (e.style === "lens") {
    // one square socket in the head, the aperture optic inside it
    const w = s * 1.35, h = s * 1.15;
    ctx.save();
    ctx.translate(e.ox * 0.3, e.cy + e.oy * 0.3);
    sq(-w / 2, -h / 2, w, h, s * 0.1);
    ctx.fillStyle = e.dark; ctx.fill();
    ctx.strokeStyle = e.edge; ctx.lineWidth = Math.max(1.2, s * 0.06); ctx.stroke();
    if (e.closed) sleepBar(s * 0.8);
    else if (e.lens) {
      ctx.translate(e.gx * s * 0.12, e.gy * s * 0.1);
      drawLens(ctx, { ...e.lens, er: s * 0.42, ap: e.ap });
    }
    ctx.restore();
    return;
  }
  if (e.style === "slit") {
    // one visor band across the head with two lit pixels — the robot read
    const bandW = e.headW * 0.86, bandH = s * 0.72;
    ctx.save();
    ctx.translate(e.ox * 0.3, e.cy + e.oy * 0.3);
    ctx.scale(1, Math.max(0.12, e.ap));
    sq(-bandW / 2, -bandH / 2, bandW, bandH, s * 0.1);
    ctx.fillStyle = e.dark; ctx.fill();
    ctx.strokeStyle = e.edge; ctx.lineWidth = Math.max(1.2, s * 0.06); ctx.stroke();
    if (!e.closed) {
      const pw = s * 0.34, ph = s * 0.34;
      for (const sgn of [-1, 1]) {
        const px = sgn * e.cx + e.gx * s * 0.18, py = e.gy * s * 0.12;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(sgn * e.slant * 0.5);
        sq(-pw / 2, -ph / 2, pw, ph, s * 0.05);
        ctx.fillStyle = "#ffffff"; ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
    return;
  }
  for (const sgn of [-1, 1]) {
    const exc = sgn * e.cx + e.ox, eyc = e.cy + e.oy;
    ctx.save();
    ctx.translate(exc, eyc);
    if (e.closed) { sleepBar(s * 0.9); ctx.restore(); continue; }
    ctx.scale(1, e.ap);
    ctx.rotate(sgn * (e.rot + e.slant));
    if (e.style === "googly") {
      // big white window, dark square pupil chasing the gaze, one hot pixel
      const w = s * 1.05, h = s * 1.0;
      sq(-w / 2, -h / 2, w, h, s * 0.12);
      ctx.fillStyle = "#ffffff"; ctx.fill();
      ctx.strokeStyle = e.edge; ctx.lineWidth = Math.max(1.2, s * 0.07); ctx.stroke();
      const pw = s * 0.5;
      const px = e.gx * (w - pw) * 0.42 + sgn * s * 0.04, py = e.gy * (h - pw) * 0.42 + s * 0.06;
      sq(px - pw / 2, py - pw / 2, pw, pw, s * 0.06);
      ctx.fillStyle = e.dark; ctx.fill();
      sq(px + pw * 0.12, py - pw * 0.34, pw * 0.22, pw * 0.22, 0);
      ctx.fillStyle = "#ffffff"; ctx.fill();
    } else if (e.style === "dot") {
      // small dark squares — quiet
      const w = s * 0.42;
      sq(-w / 2, -w / 2, w, w, s * 0.06);
      ctx.fillStyle = e.dark; ctx.fill();
    } else if (e.style === "ring") {
      // hollow squares — curious construct
      const w = s * 0.7;
      sq(-w / 2, -w / 2, w, w, s * 0.08);
      ctx.strokeStyle = e.dark; ctx.lineWidth = Math.max(1.5, s * 0.16); ctx.stroke();
    } else if (e.style === "arc" || e.style === "sadarc") {
      // happy (or sad) brackets built from two stacked pixels — a smize in pixels
      const flip = e.style === "sadarc" ? -1 : 1;
      const w = s * 1.0, h = s * 0.24;
      ctx.fillStyle = e.dark;
      sq(-w / 2, -h / 2 + flip * s * 0.1, w, h, s * 0.04); ctx.fill();
      sq(-w / 2, -h / 2 + flip * s * 0.1 - flip * h, h, h, s * 0.04); ctx.fill();
      sq(w / 2 - h, -h / 2 + flip * s * 0.1 - flip * h, h, h, s * 0.04); ctx.fill();
    } else {
      // glint: dark socket with a hot pixel in the corner
      const w = s * 0.72, h = s * 0.62;
      sq(-w / 2, -h / 2, w, h, s * 0.1);
      ctx.fillStyle = e.dark; ctx.fill();
      ctx.strokeStyle = e.edge; ctx.lineWidth = Math.max(1.2, s * 0.06); ctx.stroke();
      const px = w * 0.16 + e.gx * w * 0.14, py = -h * 0.16 + e.gy * h * 0.14;
      sq(px - s * 0.11, py - s * 0.11, s * 0.22, s * 0.22, s * 0.03);
      ctx.fillStyle = e.hot; ctx.fill();
    }
    ctx.restore();
  }
}
