/**
 * The single aperture lens — the emblem's eye, made available to the blob and
 * block bodies as `eyes: "lens"`. One optic instead of two eyes is the biggest
 * single step from cute to intent: a socket disc, a glow-lit ring, and a hot
 * centre that breathes with attention and dims with mood. Blinks are an
 * aperture closing, never a lid.
 */
import type { BuddyTheme } from "./themes";

export interface LensParams {
  /** socket radius */
  er: number;
  /** aperture 0..1 (lid spring × mood) */
  ap: number;
  /** iris scale: attention/joy widen, sad/tired/angry narrow */
  iris: number;
  T: BuddyTheme;
  G: number;
  DPR: number;
}

export function drawLens(ctx: CanvasRenderingContext2D, p: LensParams) {
  const { er, T, G, DPR } = p;
  const open = Math.max(0.001, p.ap * p.iris);
  ctx.save();
  ctx.beginPath(); ctx.arc(0, 0, er, 0, 7);
  ctx.fillStyle = "rgba(0,0,0,.38)"; ctx.fill();
  ctx.strokeStyle = T.glow + Math.min(1, 0.5 * G) + ")"; ctx.lineWidth = 1.4 * DPR; ctx.stroke();
  ctx.shadowColor = T.glow + Math.min(1, 0.95 * G) + ")";
  ctx.shadowBlur = 20 * DPR * G * (0.6 + 0.4 * open);
  ctx.beginPath(); ctx.arc(0, 0, er * 0.72 * open, 0, 7);
  ctx.strokeStyle = T.eye; ctx.lineWidth = Math.max(1.5, er * 0.16 * open); ctx.stroke();
  ctx.shadowBlur = 12 * DPR * G;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, er * 0.4 * open);
  g.addColorStop(0, T.eyeHot); g.addColorStop(1, T.eye);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, er * 0.4 * open, 0, 7); ctx.fill();
  ctx.restore();
}
