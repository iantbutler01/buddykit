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
  | "shirt" | "hoodie" | "cap"
  | "ears" | "bunny" | "cape" | "toque" | "mortarboard" | "stethoscope"
  | "badge" | "toolbelt" | "tophat" | "monocle" | "bowtie" | "beanie"
  | "sunglasses" | "santa" | "witch" | "party" | "mane";

export const ACCESSORIES: AccessoryName[] = [
  "none", "antenna", "sprout", "bow", "halo", "crown",
  "headset", "hardhat", "tie", "glasses", "scarf",
  "shirt", "hoodie", "cap",
  "ears", "bunny", "cape", "toque", "mortarboard", "stethoscope",
  "badge", "toolbelt", "tophat", "monocle", "bowtie", "beanie",
  "sunglasses", "santa", "witch", "party", "mane",
];

/** behind = before the body (capes), back = body→eyes, front = over the eyes. */
export function accessoryLayer(name: AccessoryName): "behind" | "back" | "front" {
  if (name === "cape") return "behind";
  return name === "glasses" || name === "monocle" || name === "sunglasses" ? "front" : "back";
}

/** Semantic draw order: base cloth under neckwear under headwear, regardless of selection order. */
const RANK: Record<AccessoryName, number> = {
  none: 0, cape: 0, mane: 1, shirt: 1, hoodie: 1, scarf: 2,
  tie: 3, bowtie: 3, stethoscope: 3, badge: 3, toolbelt: 3,
  antenna: 4, sprout: 4, bow: 4, halo: 4, crown: 4, headset: 4, hardhat: 4, cap: 4,
  ears: 4, bunny: 4, toque: 4, mortarboard: 4, tophat: 4, beanie: 4, santa: 4, witch: 4, party: 4,
  glasses: 5, monocle: 5, sunglasses: 5,
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
  /** current-frame body outline (traced once by the rig) — cloth clips to this so it morphs with the shape */
  bodyPath: Path2D;
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
    ctx.clip(g.bodyPath);
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
    ctx.clip(g.bodyPath);
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
    ctx.clip(g.bodyPath);
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
  } else if (name === "ears") {
    // cat ears: body-color triangles with dark inner ear, twitch on the sway
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(sgn * bodyR * 0.44, topY + bodyR * 0.14);
      ctx.rotate(sgn * (0.24 + Math.sin(t * 1.7 + sgn) * 0.02));
      ctx.fillStyle = g.accent;
      ctx.beginPath();
      ctx.moveTo(-bodyR * 0.17, 0); ctx.lineTo(bodyR * 0.17, 0); ctx.lineTo(0, -bodyR * 0.36);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = g.dark;
      ctx.beginPath();
      ctx.moveTo(-bodyR * 0.08, -bodyR * 0.03); ctx.lineTo(bodyR * 0.08, -bodyR * 0.03); ctx.lineTo(0, -bodyR * 0.24);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (name === "bunny") {
    // bunny ears: tall body-color ellipses, white inner, lazy sway
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(sgn * bodyR * 0.3, topY + bodyR * 0.08);
      ctx.rotate(sgn * 0.14 + Math.sin(t * 1.3 + sgn * 2) * 0.05);
      ctx.fillStyle = g.accent;
      ctx.beginPath(); ctx.ellipse(0, -bodyR * 0.34, bodyR * 0.115, bodyR * 0.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(0, -bodyR * 0.32, bodyR * 0.05, bodyR * 0.26, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  } else if (name === "cape") {
    // behind-layer: dark cloth flaring from the shoulders, fluttering hem
    const fl = Math.sin(t * 1.9) * 0.05, fl2 = Math.sin(t * 2.3 + 1.7) * 0.04;
    ctx.fillStyle = g.dark;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.62, -bodyR * 0.18);
    ctx.quadraticCurveTo(-bodyR * (1.12 + fl), bodyR * 0.45, -bodyR * (0.98 + fl), bodyR * (0.98 + fl2));
    ctx.quadraticCurveTo(-bodyR * 0.5, bodyR * (0.88 + fl2 * 2), 0, bodyR * (0.98 + fl));
    ctx.quadraticCurveTo(bodyR * 0.5, bodyR * (0.88 + fl * 2), bodyR * (0.98 - fl2), bodyR * (0.98 - fl));
    ctx.quadraticCurveTo(bodyR * (1.12 - fl2), bodyR * 0.45, bodyR * 0.62, -bodyR * 0.18);
    ctx.closePath(); ctx.fill();
  } else if (name === "toque") {
    // chef hat: white band + three puff lobes
    ctx.translate(0, topY + bodyR * 0.06);
    ctx.beginPath(); ctx.roundRect(-bodyR * 0.3, -bodyR * 0.14, bodyR * 0.6, bodyR * 0.16, bodyR * 0.03); ctx.fill();
    for (const [dx, r] of [[-0.2, 0.15], [0, 0.18], [0.2, 0.15]] as [number, number][]) {
      ctx.beginPath(); ctx.arc(bodyR * dx, -bodyR * (0.2 + r * 0.5), bodyR * r, 0, 7); ctx.fill();
    }
  } else if (name === "mortarboard") {
    // graduation cap: dark diamond board + swaying tassel
    ctx.translate(0, topY + bodyR * 0.04);
    ctx.fillStyle = g.dark;
    ctx.beginPath();
    ctx.ellipse(0, bodyR * 0.02, bodyR * 0.34, bodyR * 0.14, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.58, -bodyR * 0.06); ctx.lineTo(0, -bodyR * 0.24);
    ctx.lineTo(bodyR * 0.58, -bodyR * 0.06); ctx.lineTo(0, bodyR * 0.1);
    ctx.closePath(); ctx.fill();
    const sw = Math.sin(t * 1.6) * 0.06;
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = bodyR * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, -bodyR * 0.07);
    ctx.quadraticCurveTo(bodyR * (0.42 + sw), -bodyR * 0.02, bodyR * (0.5 + sw), bodyR * 0.2);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(bodyR * (0.5 + sw), bodyR * 0.26, bodyR * 0.055, 0, 7); ctx.fill();
  } else if (name === "stethoscope") {
    // neck loop + chest piece
    // steep V — a shallow curve here reads as a mouth on a flat face
    ctx.strokeStyle = g.dark; ctx.lineWidth = bodyR * 0.05;
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.3, g.botY * 0.12);
    ctx.quadraticCurveTo(-bodyR * 0.22, g.botY * 0.55, bodyR * 0.05, g.botY * 0.66);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bodyR * 0.3, g.botY * 0.12);
    ctx.quadraticCurveTo(bodyR * 0.26, g.botY * 0.5, bodyR * 0.09, g.botY * 0.62);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(bodyR * 0.07, g.botY * 0.68, bodyR * 0.1, 0, 7); ctx.fill();
    ctx.fillStyle = g.dark;
    ctx.beginPath(); ctx.arc(bodyR * 0.07, g.botY * 0.68, bodyR * 0.055, 0, 7); ctx.fill();
  } else if (name === "badge") {
    // clip-on ID: white card, dark photo square + clip
    ctx.translate(bodyR * 0.46, g.botY * 0.5);
    ctx.rotate(0.06 + Math.sin(t * 1.4) * 0.02);
    ctx.beginPath(); ctx.roundRect(-bodyR * 0.09, -bodyR * 0.11, bodyR * 0.18, bodyR * 0.22, bodyR * 0.02); ctx.fill();
    ctx.fillStyle = g.dark;
    ctx.fillRect(-bodyR * 0.055, -bodyR * 0.07, bodyR * 0.07, bodyR * 0.07);
    ctx.fillRect(-bodyR * 0.055, bodyR * 0.03, bodyR * 0.11, bodyR * 0.018);
    ctx.fillRect(-bodyR * 0.02, -bodyR * 0.135, bodyR * 0.04, bodyR * 0.03);
  } else if (name === "toolbelt") {
    // body-clipped dark band low on the body + white pockets
    ctx.save();
    ctx.clip(g.bodyPath);
    // belt + one centered buckle — paired white pockets read as teeth
    ctx.fillStyle = g.dark;
    ctx.fillRect(-bodyR * 1.6, g.botY * 0.7, bodyR * 3.2, g.botY * 0.24);
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = bodyR * 0.035;
    ctx.beginPath();
    ctx.roundRect(-bodyR * 0.09, g.botY * 0.755, bodyR * 0.18, bodyR * 0.13, bodyR * 0.02);
    ctx.stroke();
    ctx.restore();
  } else if (name === "tophat") {
    // dark cylinder + brim + white band
    ctx.translate(0, topY + bodyR * 0.06);
    ctx.fillStyle = g.dark;
    ctx.beginPath(); ctx.roundRect(-bodyR * 0.52, -bodyR * 0.075, bodyR * 1.04, bodyR * 0.1, bodyR * 0.04); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-bodyR * 0.32, -bodyR * 0.6, bodyR * 0.64, bodyR * 0.56, bodyR * 0.035); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-bodyR * 0.32, -bodyR * 0.2, bodyR * 0.64, bodyR * 0.075);
  } else if (name === "bowtie") {
    // formal neck bow: two wings + center knot
    ctx.translate(0, g.botY * 0.44);
    ctx.rotate(Math.sin(t * 1.5) * 0.02);
    ctx.fillStyle = g.dark;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * bodyR * 0.05, 0);
      ctx.lineTo(sgn * bodyR * 0.24, -bodyR * 0.11);
      ctx.lineTo(sgn * bodyR * 0.24, bodyR * 0.11);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.roundRect(-bodyR * 0.055, -bodyR * 0.055, bodyR * 0.11, bodyR * 0.11, bodyR * 0.02); ctx.fill();
  } else if (name === "beanie") {
    // dark knit dome + band + pom
    ctx.translate(0, topY + bodyR * 0.1);
    ctx.fillStyle = g.dark;
    ctx.beginPath(); ctx.ellipse(0, -bodyR * 0.04, bodyR * 0.5, bodyR * 0.34, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-bodyR * 0.52, -bodyR * 0.08, bodyR * 1.04, bodyR * 0.12, bodyR * 0.05); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(0, -bodyR * 0.42, bodyR * 0.07, 0, 7); ctx.fill();
  } else if (name === "santa") {
    // santa hat — red is the exception that makes it read; white brim + pom
    ctx.translate(0, topY + bodyR * 0.08);
    ctx.fillStyle = "#d6453d";
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.44, 0);
    ctx.quadraticCurveTo(-bodyR * 0.2, -bodyR * 0.52, bodyR * 0.06, -bodyR * 0.5);
    ctx.quadraticCurveTo(bodyR * 0.42, -bodyR * 0.44, bodyR * 0.5, -bodyR * 0.28);
    ctx.quadraticCurveTo(bodyR * 0.32, -bodyR * 0.3, bodyR * 0.44, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.roundRect(-bodyR * 0.48, -bodyR * 0.06, bodyR * 0.96, bodyR * 0.14, bodyR * 0.06); ctx.fill();
    ctx.beginPath(); ctx.arc(bodyR * 0.52, -bodyR * 0.26, bodyR * 0.085, 0, 7); ctx.fill();
  } else if (name === "witch") {
    // witch hat: wide brim + bent cone + tiny buckle
    ctx.translate(0, topY + bodyR * 0.05);
    ctx.fillStyle = g.dark;
    ctx.beginPath(); ctx.ellipse(0, 0, bodyR * 0.6, bodyR * 0.085, 0, 0, 7); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.3, -bodyR * 0.02);
    ctx.quadraticCurveTo(-bodyR * 0.06, -bodyR * 0.34, bodyR * 0.02, -bodyR * 0.6);
    ctx.quadraticCurveTo(bodyR * 0.18, -bodyR * 0.46, bodyR * 0.12, -bodyR * 0.62);
    ctx.quadraticCurveTo(bodyR * 0.22, -bodyR * 0.32, bodyR * 0.3, -bodyR * 0.02);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-bodyR * 0.045, -bodyR * 0.14, bodyR * 0.09, bodyR * 0.07);
  } else if (name === "party") {
    // party cone: white with dark dots, tilted, pom on top
    ctx.translate(bodyR * 0.3, topY + bodyR * 0.12);
    ctx.rotate(0.22);
    ctx.beginPath();
    ctx.moveTo(-bodyR * 0.2, 0); ctx.lineTo(bodyR * 0.2, 0); ctx.lineTo(0, -bodyR * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = g.dark;
    for (const [dx, dy, r] of [[-0.06, -0.1, 0.035], [0.07, -0.2, 0.03], [-0.02, -0.32, 0.026]] as [number, number, number][]) {
      ctx.beginPath(); ctx.arc(bodyR * dx, bodyR * dy, bodyR * r, 0, 7); ctx.fill();
    }
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(0, -bodyR * 0.54, bodyR * 0.06, 0, 7); ctx.fill();
  } else if (name === "mane") {
    // Doozy-style scalp band: a darker tint from the crown down to the eye
    // line, clipped to the body. Translucent so it reads as shading on any
    // accent color; the eyes draw above it and punch through, producing the
    // dipped-between-the-eyes read without any curve math.
    ctx.save();
    ctx.clip(g.bodyPath);
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    const bandBot = g.eyeCY + bodyR * 0.06;
    ctx.fillRect(-bodyR * 1.6, topY - bodyR, bodyR * 3.2, bandBot - (topY - bodyR));
    ctx.restore();
  } else if (name === "monocle") {
    // single ring on the right eye + chain down the cheek
    const { eyeCX, eyeCY, eyeOX, eyeOY, ringR } = g;
    ctx.lineWidth = bodyR * 0.05;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(eyeCX + eyeOX, eyeCY + eyeOY, ringR, 0, 7);
    ctx.stroke();
    ctx.lineWidth = bodyR * 0.022;
    ctx.beginPath();
    ctx.moveTo(eyeCX + eyeOX + ringR * 0.5, eyeCY + eyeOY + ringR * 0.85);
    ctx.quadraticCurveTo(bodyR * 0.62, g.botY * 0.45, bodyR * 0.5, g.botY * 0.62);
    ctx.stroke();
  } else if (name === "sunglasses") {
    // one dark visor band across both eyes + temple stubs + glint slash
    const { eyeCX, eyeCY, eyeOX, eyeOY, ringR } = g;
    const w = eyeCX + ringR * 1.15, h = ringR * 1.35;
    ctx.fillStyle = g.dark;
    ctx.beginPath();
    ctx.roundRect(eyeOX - w, eyeCY + eyeOY - h * 0.5, w * 2, h, h * 0.32);
    ctx.fill();
    ctx.strokeStyle = g.dark; ctx.lineWidth = bodyR * 0.045;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(eyeOX + sgn * w * 0.98, eyeCY + eyeOY - h * 0.15);
      ctx.lineTo(sgn * bodyR * 0.99, eyeCY + eyeOY - h * 0.35);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = bodyR * 0.03; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(eyeOX - eyeCX - ringR * 0.4, eyeCY + eyeOY + h * 0.16);
    ctx.lineTo(eyeOX - eyeCX + ringR * 0.35, eyeCY + eyeOY - h * 0.22);
    ctx.stroke();
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
