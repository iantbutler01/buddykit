/**
 * The block species — a chunky stacked-slab build: crown, head, torso, legs
 * and two side nubs, every slab a rounded rectangle with a thick theme-edge
 * outline, a shade strip down one side and a highlight along the top so it
 * reads as a solid chunk rather than a flat sticker. Shares buddykit's
 * palette doctrine (accent body, theme-dark features) and the rig's motion
 * grammar; a block squashes a little, never wobbles.
 */
import type { PathTarget } from "./blob";
import { drawLens, type LensParams } from "./lens";

export type BlockBuild = "stout" | "tall" | "wide" | "mini" | "long" | "sentinel";
export const BLOCK_BUILDS: BlockBuild[] = ["stout", "tall", "wide", "mini", "long", "sentinel"];

/** Slab proportions in body-radius units. Widths are full widths, heights are full heights. */
interface BuildDef {
  crownW: number; crownH: number;
  headW: number; headH: number;
  torsoW: number; torsoH: number;
  legW: number; legH: number; legGap: number;
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
  // the monolith: no nubs, a narrow crown, a long undivided torso — built for a visor or a lens
  sentinel: { crownW: 1.0, crownH: 0.2, headW: 1.08, headH: 0.98, torsoW: 1.0, torsoH: 1.12, legW: 0.4, legH: 0.3, legGap: 0.12, nubW: 0, nubH: 0, eyeSpread: 0.5, eyeDrop: 0.5 },
};

export interface Slab {
  x: number; y: number; w: number; h: number; r: number;
  /** draw order: nubs behind the torso, crown over the head */
  kind: "crown" | "head" | "torso" | "leg" | "nub";
}

/** The slab layout for a build at body radius r. squash: +stretch / -squash,
 *  applied as a whole-figure scale so the stack never separates. The figure
 *  is centred so that y = 0 sits mid-torso; the eyes ride in the head. */
export function blockSlabs(build: BlockBuild, r: number, squash = 0, gravity = 0): Slab[] {
  const d = BUILDS[build];
  const kx = 1 + squash * 0.35, ky = 1 - squash * 0.7;
  const totalH = d.crownH + d.headH + d.torsoH + d.legH;
  const top = -totalH * 0.55;   // visual centre slightly below the head
  const corner = 0.07 * (1 - gravity) + 0.012;   // gravity squares the corners
  const slab = (kind: Slab["kind"], cx: number, y: number, w: number, h: number, rr = corner): Slab => ({
    kind,
    x: (cx - w / 2) * r * kx,
    y: y * r * ky,
    w: w * r * kx,
    h: h * r * ky,
    r: rr * r,
  });
  const crownY = top, headY = crownY + d.crownH, torsoY = headY + d.headH, legY = torsoY + d.torsoH;
  const nubY = torsoY + d.torsoH * 0.12;
  const legOff = d.legGap / 2 + d.legW / 2;
  const out: Slab[] = [];
  if (d.nubW > 0) {
    out.push(slab("nub", -(d.torsoW / 2 + d.nubW / 2 - 0.02), nubY, d.nubW, d.nubH, corner * 0.7));
    out.push(slab("nub", d.torsoW / 2 + d.nubW / 2 - 0.02, nubY, d.nubW, d.nubH, corner * 0.7));
  }
  out.push(
    slab("leg", -legOff, legY, d.legW, d.legH, corner * 0.7),
    slab("leg", legOff, legY, d.legW, d.legH, corner * 0.7),
    slab("torso", 0, torsoY, d.torsoW, d.torsoH),
    slab("head", 0, headY, d.headW, d.headH, corner * 1.3),
    slab("crown", 0, crownY, d.crownW, d.crownH, corner * 0.85),
  );
  return out;
}

function rect(ctx: PathTarget, s: Slab) {
  ctx.roundRect(s.x, s.y, s.w, s.h, s.r);
}

/** The whole-figure silhouette (union of slabs) — glow, shadow and cloth clips. */
export function traceBlock(ctx: PathTarget, build: BlockBuild, r: number, squash = 0, gravity = 0) {
  if ("beginPath" in ctx) ctx.beginPath();
  for (const s of blockSlabs(build, r, squash, gravity)) rect(ctx, s);
}

/** Crown top y (negative) and leg bottom y (positive) — accessory anchors. */
export function blockTopY(build: BlockBuild, r: number, squash = 0): number {
  return Math.min(...blockSlabs(build, r, squash).map((s) => s.y));
}
export function blockBotY(build: BlockBuild, r: number, squash = 0): number {
  return Math.max(...blockSlabs(build, r, squash).map((s) => s.y + s.h));
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

export interface BlockPaint {
  accent: string;
  edge: string;
  /** theme dark — the crown slab (hair/cap) is theme-dark like every feature */
  dark: string;
  DPR: number;
  /** 0..1 side-shade / top-light strength */
  bevel: number;
  /** legs shuffle phase (0 = still) */
  shuffle: number;
  t: number;
  /** 0..1 — squares corners, kills the top highlight, deepens the shade */
  gravity: number;
}

/** Paint every slab: fill, shade strip, top highlight, outline. Nubs and legs
 *  go first so the torso overlaps them; the crown lands over the head. */
export function drawBlockBody(ctx: CanvasRenderingContext2D, build: BlockBuild, r: number, squash: number, p: BlockPaint) {
  const slabs = blockSlabs(build, r, squash, p.gravity);
  const lw = Math.max(1.5 * p.DPR, r * 0.075);   // thick outline scales with the figure (r is already in device px)
  let legIdx = 0;
  for (const s of slabs) {
    const dark = s.kind === "crown";
    let dy = 0;
    if (s.kind === "leg" && p.shuffle > 0) {
      // working shuffle: legs alternate a pixel-step lift
      dy = -Math.max(0, Math.sin(p.t * 7 + legIdx * Math.PI)) * r * 0.05 * p.shuffle;
      legIdx++;
    }
    ctx.save();
    ctx.translate(0, dy);
    ctx.beginPath(); rect(ctx, s);
    ctx.fillStyle = dark ? p.dark : p.accent;
    ctx.fill();
    if (p.bevel > 0) {
      ctx.save();
      ctx.clip();
      // shade strip down the right, highlight along the top — the two-tone
      // that makes a flat rectangle read as a chunk
      const strip = Math.max(2, s.w * 0.14);
      ctx.fillStyle = `rgba(0,0,0,${(dark ? 0.22 : 0.16) * p.bevel * (1 + 0.8 * p.gravity)})`;
      ctx.fillRect(s.x + s.w - strip, s.y, strip, s.h);
      ctx.fillStyle = `rgba(255,255,255,${(dark ? 0.12 : 0.22) * p.bevel * (1 - p.gravity)})`;
      ctx.fillRect(s.x, s.y, s.w, Math.max(2, s.h * 0.12));
      ctx.restore();
    }
    ctx.beginPath(); rect(ctx, s);
    ctx.strokeStyle = p.edge;
    ctx.lineWidth = lw;
    ctx.lineJoin = "round";
    ctx.stroke();
    ctx.restore();
  }
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
