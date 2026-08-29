/**
 * Blob accessories — Doozy-style identity levers, kept inside the palette
 * doctrine: white features (like the eyes), theme-dark cloth (tie, scarf),
 * one essential-color exception (the hardhat is yellow or it isn't a hardhat).
 *
 * Accessories draw in body space in two layers: "back" between body and eyes,
 * "front" over the eyes (glasses frame the eyes themselves).
 */
export type AccessoryName =
  | "none" | "antenna" | "sprout" | "bow" | "halo" | "crown"
  | "headset" | "hardhat" | "tie" | "glasses" | "scarf"
  | "shirt" | "hoodie" | "cap";

export const ACCESSORIES: AccessoryName[] = [
  "none", "antenna", "sprout", "bow", "halo", "crown",
  "headset", "hardhat", "tie", "glasses", "scarf",
  "shirt", "hoodie", "cap",
];

export function accessoryLayer(name: AccessoryName): "back" | "front" {
  return name === "glasses" ? "front" : "back";
}

/** Semantic draw order: base cloth under neckwear under headwear, regardless of selection order. */
const RANK: Record<AccessoryName, number> = {
  none: 0, shirt: 1, hoodie: 1, scarf: 2, tie: 3,
  antenna: 4, sprout: 4, bow: 4, halo: 4, crown: 4, headset: 4, hardhat: 4, cap: 4,
  glasses: 5,
};

export function accessoryRank(name: AccessoryName): number {
  return RANK[name];
}

/** Geometry handed to accessories by the rig (body space, squash applied). */
export interface AccessoryGeom {
  /** outline crown y (negative) */
  topY: number;
  /** outline chin y (positive) — cloth necklines scale to this, not bodyR */
  botY: number;
  bodyR: number;
  t: number;
  /** theme dark (coreDisc) for cloth accessories */
  dark: string;
  /** body fill (accent) — for cut-outs like the shirt collar notch */
  accent: string;
  /** eye centers: ±eyeCX + eyeOX, eyeCY + eyeOY */
  eyeCX: number;
  eyeCY: number;
  eyeOX: number;
  eyeOY: number;
  /** glasses ring radius (already includes eyeSize/attention scale) */
  ringR: number;
  /** trace the current-frame body outline into ctx — cloth clips to this so it morphs with the shape */
  traceBody: (ctx: CanvasRenderingContext2D) => void;
}

export function drawAccessory(
  ctx: CanvasRenderingContext2D,
  name: AccessoryName,
  g: AccessoryGeom,
  DPR: number,
) {
  if (name === "none") return;
  const { topY, bodyR, t } = g;
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#ffffff";
  ctx.lineCap = "round";

  if (name === "antenna") {
    const sway = Math.sin(t * 1.6) * 0.09;
    ctx.translate(0, topY);
    ctx.rotate(sway);
    const h = bodyR * 0.34;
    ctx.lineWidth = bodyR * 0.06;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(bodyR * 0.06, -h * 0.6, 0, -h); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -h - bodyR * 0.07, bodyR * 0.1, 0, 7); ctx.fill();
  } else if (name === "sprout") {
    const sway = Math.sin(t * 1.3) * 0.07;
    ctx.translate(0, topY + bodyR * 0.02);
    ctx.rotate(sway);
    const h = bodyR * 0.2;
    ctx.lineWidth = bodyR * 0.055;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(0, -h);
      ctx.rotate(sgn * 0.85);
      ctx.beginPath(); ctx.ellipse(0, -bodyR * 0.11, bodyR * 0.075, bodyR * 0.14, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  } else if (name === "bow") {
    ctx.translate(bodyR * 0.42, topY + bodyR * 0.16);
    ctx.rotate(0.3 + Math.sin(t * 1.4) * 0.03);
    const w = bodyR * 0.19;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(sgn * w, -w * 0.7, sgn * w * 1.15, 0);
      ctx.quadraticCurveTo(sgn * w, w * 0.7, 0, 0);
      ctx.fill();
    }
    ctx.beginPath(); ctx.arc(0, 0, w * 0.32, 0, 7); ctx.fill();
  } else if (name === "halo") {
    const bobY = Math.sin(t * 1.3) * 2 * DPR;
    ctx.lineWidth = bodyR * 0.055;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(0, topY - bodyR * 0.26 + bobY, bodyR * 0.4, bodyR * 0.11, 0, 0, 7);
    ctx.stroke();
  } else if (name === "crown") {
    ctx.translate(0, topY + bodyR * 0.03);
    const w = bodyR * 0.26, h = bodyR * 0.24;
    ctx.beginPath();
    ctx.moveTo(-w, 0);
    ctx.lineTo(-w, -h * 0.55);
    ctx.lineTo(-w * 0.5, -h * 0.22);
    ctx.lineTo(0, -h);
    ctx.lineTo(w * 0.5, -h * 0.22);
    ctx.lineTo(w, -h * 0.55);
    ctx.lineTo(w, 0);
    ctx.closePath();
    ctx.fill();
  } else if (name === "headset") {
    const cupY = g.eyeCY + bodyR * 0.28;
    const cupX = bodyR * 0.92;
    ctx.lineWidth = bodyR * 0.07;
    ctx.beginPath();
    ctx.ellipse(0, cupY, cupX, -topY + bodyR * 0.06, 0, Math.PI, 0);
    ctx.stroke();
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sgn * cupX, cupY, bodyR * 0.11, bodyR * 0.2, 0, 0, 7);
      ctx.fill();
    }
    // mic boom from the left cup to mouth level
    ctx.lineWidth = bodyR * 0.045;
    ctx.beginPath();
    ctx.moveTo(-cupX + bodyR * 0.04, cupY + bodyR * 0.14);
    ctx.quadraticCurveTo(-bodyR * 0.75, cupY + bodyR * 0.62, -bodyR * 0.3, cupY + bodyR * 0.58);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(-bodyR * 0.27, cupY + bodyR * 0.58, bodyR * 0.07, 0, 7); ctx.fill();
  } else if (name === "hardhat") {
    ctx.translate(0, topY + bodyR * 0.12);
    ctx.fillStyle = "#f5c542";
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyR * 0.64, bodyR * 0.42, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    // center ridge
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyR * 0.17, bodyR * 0.5, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    // brim — clearly wider than the dome, the hardhat's signature read
    ctx.beginPath();
    const bw = bodyR * 0.88, bh = bodyR * 0.065;
    ctx.roundRect(-bw, -bh, bw * 2, bh * 2, bh);
    ctx.fill();
  } else if (name === "tie") {
    const sway = Math.sin(t * 1.5) * 0.04;
    ctx.translate(0, g.botY * 0.4);
    ctx.rotate(sway);
    ctx.fillStyle = g.dark;
    const kw = bodyR * 0.155, kh = g.botY * 0.12;
    ctx.beginPath();
    ctx.moveTo(-kw, 0); ctx.lineTo(kw, 0); ctx.lineTo(kw * 0.7, kh); ctx.lineTo(-kw * 0.7, kh);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-kw * 0.7, kh);
    ctx.lineTo(kw * 0.7, kh);
    ctx.lineTo(kw * 1.15, kh + g.botY * 0.34);
    ctx.lineTo(0, kh + g.botY * 0.46);
    ctx.lineTo(-kw * 1.15, kh + g.botY * 0.34);
    ctx.closePath(); ctx.fill();
  } else if (name === "scarf") {
    // ninja wrap: body-clipped band over the lower body — cloth must follow
    // the silhouette (and never be a stroked arc: that reads as a mouth)
    ctx.save();
    g.traceBody(ctx); ctx.clip();
    ctx.fillStyle = g.dark;
    ctx.fillRect(-bodyR * 1.6, g.botY * 0.44, bodyR * 3.2, bodyR * 1.6);
    ctx.restore();
    // knot + trailing tails on the right
    ctx.fillStyle = g.dark;
    const kx = bodyR * 0.8, ky = g.botY * 0.6;
    ctx.beginPath(); ctx.arc(kx, ky, bodyR * 0.11, 0, 7); ctx.fill();
    const flap = Math.sin(t * 2.1) * 0.08;
    for (const [ang, len] of [[0.55 + flap, 0.34], [0.95 + flap * 0.6, 0.28]] as [number, number][]) {
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -bodyR * 0.07);
      ctx.lineTo(len * bodyR, bodyR * 0.02);
      ctx.lineTo(0, bodyR * 0.09);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (name === "shirt") {
    // shirt front: body-clipped white band hugging the bottom edge — anything
    // floating mid-face reads as a mouth/mustache, and cloth must follow the
    // silhouette rather than assume a round body
    const cy = g.botY * 0.62;
    ctx.save();
    g.traceBody(ctx); ctx.clip();
    ctx.fillRect(-bodyR * 1.6, cy, bodyR * 3.2, bodyR * 1.6);
    // V neck opening in body color — narrow, so a layered tie fully covers it
    ctx.fillStyle = g.accent;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.09, cy - bodyR * 0.01);
    ctx.lineTo(bodyR * 0.09, cy - bodyR * 0.01);
    ctx.lineTo(0, cy + bodyR * 0.12);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (name === "hoodie") {
    // dark hood collar: body-clipped band over the lower body (never a stroked
    // arc — that reads as a mouth) + white drawstrings inside the silhouette
    ctx.save();
    g.traceBody(ctx); ctx.clip();
    ctx.fillStyle = g.dark;
    ctx.fillRect(-bodyR * 1.6, g.botY * 0.64, bodyR * 3.2, bodyR * 1.6);
    ctx.restore();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = bodyR * 0.035;
    const sway = Math.sin(t * 1.8) * 0.04;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * bodyR * 0.15, g.botY * 0.74);
      ctx.quadraticCurveTo(sgn * bodyR * (0.19 + sway), g.botY * 0.85, sgn * bodyR * 0.13, g.botY * 0.94);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(sgn * bodyR * 0.13, g.botY * 0.95, bodyR * 0.032, 0, 7); ctx.fill();
    }
  } else if (name === "cap") {
    // baseball cap: dark dome + forward brim + white button
    ctx.translate(0, topY + bodyR * 0.08);
    ctx.fillStyle = g.dark;
    ctx.beginPath();
    ctx.ellipse(0, 0, bodyR * 0.46, bodyR * 0.3, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(bodyR * 0.42, 0, bodyR * 0.32, bodyR * 0.075, -0.06, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(0, -bodyR * 0.3, bodyR * 0.05, 0, 7); ctx.fill();
  } else if (name === "glasses") {
    const { eyeCX, eyeCY, eyeOX, eyeOY, ringR } = g;
    ctx.lineWidth = bodyR * 0.05;
    ctx.globalAlpha = 0.95;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sgn * eyeCX + eyeOX, eyeCY + eyeOY, ringR, 0, 7);
      ctx.stroke();
      // temple stub toward the body edge
      ctx.beginPath();
      ctx.moveTo(sgn * (eyeCX + ringR) + eyeOX * 0.8, eyeCY + eyeOY);
      ctx.lineTo(sgn * bodyR * 0.99, eyeCY + eyeOY - bodyR * 0.03);
      ctx.stroke();
    }
    // bridge
    ctx.beginPath();
    ctx.moveTo(-eyeCX + ringR + eyeOX, eyeCY + eyeOY - ringR * 0.25);
    ctx.quadraticCurveTo(eyeOX, eyeCY + eyeOY - ringR * 0.55, eyeCX - ringR + eyeOX, eyeCY + eyeOY - ringR * 0.25);
    ctx.stroke();
  }
  ctx.restore();
}
