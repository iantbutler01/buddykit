/**
 * Accessories — Doozy-style identity levers, kept inside the palette doctrine:
 * white features (like the eyes), theme-dark cloth (tie, scarf), one
 * essential-color exception (the hardhat is yellow or it isn't a hardhat).
 *
 * Every accessory is worn, not painted on: it draws against one named place on
 * the body (see anchors.ts) — the top of the head, the head's sides, the face,
 * the neck, the chest, the waist — using that place's width unit and the room
 * below it. That is the whole reason a scarf lands on a block's collar instead
 * of around its shins.
 *
 * Accessories draw in three layers: "behind" before the body (capes), "back"
 * between body and eyes, "front" over the eyes (glasses frame the eyes).
 */
import type { AnchorName, BodyAnchors } from "./anchors";
import { anchorRidesHead } from "./anchors";

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

/**
 * Where each accessory is worn. This is the contract with the species: change a
 * body and the accessory follows its anchor, it does not drift.
 */
const ANCHOR: Record<AccessoryName, AnchorName> = {
  none: "body",
  // head top — hats, ears, anything growing out of the crown
  antenna: "headTop", sprout: "headTop", bow: "headTop", halo: "headTop", crown: "headTop",
  hardhat: "headTop", cap: "headTop", ears: "headTop", bunny: "headTop", toque: "headTop",
  mortarboard: "headTop", tophat: "headTop", beanie: "headTop", santa: "headTop",
  witch: "headTop", party: "headTop", mane: "headTop",
  // head sides — over the ears
  headset: "headSide",
  // face — around the eyes
  glasses: "face", monocle: "face", sunglasses: "face",
  // neck — collars and things tied under the chin
  scarf: "neck", bowtie: "neck", stethoscope: "neck",
  // chest — garments and what is pinned or hung on them
  shirt: "chest", hoodie: "chest", tie: "chest", badge: "chest",
  // waist
  toolbelt: "waist",
  // the whole figure
  cape: "body",
};

export function accessoryAnchor(name: AccessoryName): AnchorName {
  return ANCHOR[name];
}

/** True when the accessory is worn on the head, and so rides the head's tilt. */
export function accessoryRidesHead(name: AccessoryName): boolean {
  return anchorRidesHead(ANCHOR[name]);
}

/** What the rig hands an accessory: the body's wearing places plus its palette. */
export interface AccessoryGeom {
  /** the wearing places of the body being dressed */
  anchors: BodyAnchors;
  /** half the distance between the eye centres (the face anchor is their midpoint) */
  eyeCX: number;
  /** eye ring radius, attention scale included — glasses and monocle lenses */
  ringR: number;
  t: number;
  /** theme dark (coreDisc) for cloth accessories */
  dark: string;
  /** body fill (accent) — for cut-outs like the shirt collar notch */
  accent: string;
  /** the region cloth may cover: the blob's body, the block's torso */
  clipCloth: Path2D;
  /** the region hair may cover: the blob's body, the block's head and crown */
  clipHead: Path2D;
  /** per-accessory primary-color overrides (cfg.accessoryColors) */
  colors?: Partial<Record<AccessoryName, string>>;
  /** one primary colour for every accessory (cfg.accessoryTone); per-accessory colors win */
  tone?: string | null;
  /** the finish's own default tone (crafted ink, light white), used when no tone is set.
   *  Unlike an explicit tone it leaves alone the accessories whose colour is the point */
  defaultTone?: string | null;
  /** the refined drawing the crafted and light finishes use: one even, thinner line
   *  weight and slimmer forms, so an accessory reads as a considered detail, not a prop */
  fine?: boolean;
}

/** Accessories whose colour is the point: a finish's default tone leaves them be. */
const KEEPS_COLOUR: ReadonlySet<AccessoryName> = new Set(["hardhat", "santa"]);

/** Relative luminance above the midpoint: ink details read on it, white ones do not. */
function isLight(color: string): boolean {
  const m = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  const n = parseInt(h, 16);
  const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const y = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return y > 0.4;
}

/**
 * The outline of cloth wrapped round a body, seen from just above: top and bottom
 * edges bow down at the front by sag. halfW should overshoot the body — the cloth
 * clip trims the band to the silhouette.
 */
function wrapBand(ctx: CanvasRenderingContext2D, cx: number, top: number, bottom: number, halfW: number, sag: number) {
  ctx.beginPath();
  ctx.moveTo(cx - halfW, top);
  ctx.quadraticCurveTo(cx, top + 2 * sag, cx + halfW, top);
  ctx.lineTo(cx + halfW, bottom);
  ctx.quadraticCurveTo(cx, bottom + 2 * sag, cx - halfW, bottom);
  ctx.closePath();
}

export function drawAccessory(
  ctx: CanvasRenderingContext2D,
  name: AccessoryName,
  g: AccessoryGeom,
  DPR: number,
) {
  if (name === "none") return;
  const a = g.anchors[ANCHOR[name]];
  const u = a.r;      // width unit of the part being worn
  const d = a.drop;   // room below the anchor
  const { t } = g;
  const own = g.colors?.[name];
  // an explicit tone dresses everything; a finish's default tone skips the accessories
  // whose colour is their identity (a hardhat is yellow, a Santa hat red)
  const tone = g.tone ?? (g.defaultTone && !KEEPS_COLOUR.has(name) ? g.defaultTone : null);
  const toned = !own && !!tone;
  const co = own ?? (toned ? tone! : undefined);   // primary colour override
  // Details keep their doctrine colours (white sparks, theme-dark cut-outs), except on a
  // toned accessory: there the details take whichever of white and theme-dark contrasts
  // with the tone, or a white hoodie's white drawstrings would vanish.
  const toneLight = toned && isLight(tone!);
  const hi = toneLight ? g.dark : "#ffffff";
  const lo = toned && !toneLight ? "#ffffff" : g.dark;
  ctx.save();
  ctx.fillStyle = co ?? "#ffffff";
  ctx.strokeStyle = co ?? "#ffffff";
  ctx.lineCap = "round";

  if (name === "antenna") {
    const sway = Math.sin(t * 1.6) * 0.09;
    ctx.translate(a.x, a.y);
    ctx.rotate(sway);
    const h = u * 0.34;
    ctx.lineWidth = u * 0.06;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(u * 0.06, -h * 0.6, 0, -h); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -h - u * 0.07, u * 0.1, 0, 7); ctx.fill();
  } else if (name === "sprout") {
    const sway = Math.sin(t * 1.3) * 0.07;
    ctx.translate(a.x, a.y + u * 0.02);
    ctx.rotate(sway);
    const h = u * 0.2;
    ctx.lineWidth = u * 0.055;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h); ctx.stroke();
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(0, -h);
      ctx.rotate(sgn * 0.85);
      ctx.beginPath(); ctx.ellipse(0, -u * 0.11, u * 0.075, u * 0.14, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  } else if (name === "bow") {
    ctx.translate(a.x + u * 0.42, a.y + u * 0.16);
    ctx.rotate(0.3 + Math.sin(t * 1.4) * 0.03);
    const w = u * 0.19;
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
    ctx.lineWidth = u * 0.055;
    ctx.globalAlpha = 0.92;
    ctx.beginPath();
    ctx.ellipse(a.x, a.y - u * 0.26 + bobY, u * 0.4, u * 0.11, 0, 0, 7);
    ctx.stroke();
  } else if (name === "crown") {
    ctx.translate(a.x, a.y + u * 0.03);
    const w = u * 0.26, h = u * 0.24;
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
    // the band arcs from cup to cup over the top of the head
    const cupY = a.y, cupX = a.x;
    const bandH = cupY - g.anchors.headTop.y + u * 0.06;
    ctx.lineWidth = u * (g.fine ? 0.04 : 0.07);
    ctx.beginPath();
    ctx.ellipse(0, cupY, cupX, bandH, 0, Math.PI, 0);
    ctx.stroke();
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      if (g.fine) ctx.roundRect(sgn * cupX - u * 0.065, cupY - u * 0.15, u * 0.13, u * 0.3, u * 0.065);
      else ctx.ellipse(sgn * cupX, cupY, u * 0.11, u * 0.2, 0, 0, 7);
      ctx.fill();
    }
    // mic boom from the left cup to mouth level
    ctx.lineWidth = u * (g.fine ? 0.03 : 0.045);
    ctx.beginPath();
    ctx.moveTo(-cupX + u * 0.04, cupY + u * 0.14);
    ctx.quadraticCurveTo(-u * 0.75, cupY + u * 0.62, -u * 0.3, cupY + u * 0.58);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(-u * 0.27, cupY + u * 0.58, u * (g.fine ? 0.045 : 0.07), 0, 7); ctx.fill();
  } else if (name === "hardhat") {
    ctx.translate(a.x, a.y + u * 0.12);
    ctx.fillStyle = co ?? "#f5c542";
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.64, u * 0.42, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    // center ridge
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.17, u * 0.5, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    // brim — clearly wider than the dome, the hardhat's signature read
    ctx.beginPath();
    const bw = u * 0.88, bh = u * 0.065;
    ctx.roundRect(-bw, -bh, bw * 2, bh * 2, bh);
    ctx.fill();
  } else if (name === "tie") {
    // knot under the collar, blade down the chest
    const sway = Math.sin(t * 1.5) * 0.04;
    ctx.translate(a.x, a.y - d * 0.2);
    ctx.rotate(sway);
    ctx.fillStyle = co ?? g.dark;
    const kw = u * (g.fine ? 0.11 : 0.155), kh = d * (g.fine ? 0.18 : 0.24);
    ctx.beginPath();
    ctx.moveTo(-kw, 0); ctx.lineTo(kw, 0); ctx.lineTo(kw * 0.7, kh); ctx.lineTo(-kw * 0.7, kh);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-kw * 0.7, kh);
    ctx.lineTo(kw * 0.7, kh);
    const blade = g.fine ? 0.72 : 1;
    ctx.lineTo(kw * 1.15, kh + d * 0.68 * blade);
    ctx.lineTo(0, kh + d * 0.92 * blade);
    ctx.lineTo(-kw * 1.15, kh + d * 0.68 * blade);
    ctx.closePath(); ctx.fill();
  } else if (name === "scarf") {
    // a wrap round the collar, clipped to the cloth region: it spans the body's
    // full width (the clip trims it to the silhouette) so it reads as going round,
    // and its edges bow down at the front as a band round a body seen from just
    // above does. It is a collar, not a coat: only collar-deep, or the clip paints
    // the whole torso — and a narrow patch floating mid-body reads as a mask.
    // (Never a stroked arc: that reads as a mouth.)
    const depth = Math.min(d, u * (g.fine ? 0.17 : 0.34));
    ctx.save();
    ctx.clip(g.clipCloth);
    ctx.fillStyle = co ?? g.dark;
    wrapBand(ctx, a.x, a.y, a.y + depth, u * 1.6, u * 0.09);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = co ?? g.dark;
    if (g.fine) {
      // the fine scarf is a neckerchief: the thin band plus a soft point hanging at the
      // front — a band alone, low on a blob, reads as a belt
      const top = a.y + u * 0.09, sway = Math.sin(t * 1.7) * u * 0.02;
      ctx.beginPath();
      ctx.moveTo(a.x - u * 0.2, top);
      ctx.lineTo(a.x + u * 0.2, top);
      ctx.quadraticCurveTo(a.x + u * 0.08 + sway, top + u * 0.2, a.x + sway, top + u * 0.3);
      ctx.quadraticCurveTo(a.x - u * 0.08 + sway, top + u * 0.2, a.x - u * 0.2, top);
      ctx.closePath(); ctx.fill();
      ctx.restore();
      return;
    }
    // knot + trailing tails on the right
    const kx = a.x + u * 0.42, ky = a.y + depth * 0.62;
    const tail = g.fine ? 0.62 : 1;
    ctx.beginPath(); ctx.arc(kx, ky, u * 0.11 * tail, 0, 7); ctx.fill();
    const flap = Math.sin(t * 2.1) * 0.08;
    for (const [ang, len] of [[0.55 + flap, 0.34 * tail], [0.95 + flap * 0.6, 0.28 * tail]] as [number, number][]) {
      ctx.save();
      ctx.translate(kx, ky);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -u * 0.07);
      ctx.lineTo(len * u, u * 0.02);
      ctx.lineTo(0, u * 0.09);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (name === "shirt") {
    // shirt front: a white band over the chest, clipped to the cloth region —
    // anything floating mid-face reads as a mouth/mustache
    const cy = a.y + d * (g.fine ? 0.5 : 0.24);
    ctx.save();
    ctx.clip(g.clipCloth);
    if (g.fine) { wrapBand(ctx, a.x, cy, a.y + d + u * 1.6, u * 1.6, u * 0.08); ctx.fill(); }
    else ctx.fillRect(a.x - u * 1.6, cy, u * 3.2, d + u * 1.6);
    // V neck opening in body color — narrow, so a layered tie fully covers it
    ctx.fillStyle = g.accent;
    ctx.beginPath();
    ctx.moveTo(a.x - u * 0.09, cy - u * 0.01);
    ctx.lineTo(a.x + u * 0.09, cy - u * 0.01);
    ctx.lineTo(a.x, cy + u * 0.12);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  } else if (name === "hoodie") {
    // dark hood collar clipped to the cloth region (never a stroked arc — that
    // reads as a mouth) + white drawstrings inside it
    // the hem bows down at the front like the scarf's band, so the hoodie wraps
    // the body instead of cutting straight across it
    ctx.save();
    ctx.clip(g.clipCloth);
    ctx.fillStyle = co ?? g.dark;
    wrapBand(ctx, a.x, a.y + d * (g.fine ? 0.5 : 0.28), a.y + d + u * 1.6, u * 1.6, u * 0.08);
    ctx.fill();
    ctx.restore();
    // the fine hoodie is the hem alone: its drawstrings at that weight read as brackets
    if (g.fine) { ctx.restore(); return; }
    ctx.strokeStyle = hi;
    ctx.fillStyle = hi;
    ctx.lineWidth = u * 0.035;
    const sway = Math.sin(t * 1.8) * 0.04;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(a.x + sgn * u * 0.15, a.y + d * 0.48);
      ctx.quadraticCurveTo(a.x + sgn * u * (0.19 + sway), a.y + d * 0.7, a.x + sgn * u * 0.13, a.y + d * 0.88);
      ctx.stroke();
      ctx.beginPath(); ctx.arc(a.x + sgn * u * 0.13, a.y + d * 0.9, u * 0.032, 0, 7); ctx.fill();
    }
  } else if (name === "cap") {
    // baseball cap: dark dome + forward brim + white button
    ctx.translate(a.x, a.y + u * 0.08);
    ctx.fillStyle = co ?? g.dark;
    if (g.fine) {
      // fine: a tighter crown and a slim, crisp brim; no button
      ctx.beginPath(); ctx.ellipse(0, 0, u * 0.4, u * 0.25, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.roundRect(u * 0.12, -u * 0.035, u * 0.52, u * 0.07, u * 0.035); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.ellipse(0, 0, u * 0.46, u * 0.3, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.ellipse(u * 0.42, 0, u * 0.32, u * 0.075, -0.06, 0, 7);
    ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath(); ctx.arc(0, -u * 0.3, u * 0.05, 0, 7); ctx.fill();
  } else if (name === "ears") {
    // cat ears: body-color triangles with dark inner ear, twitch on the sway
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(a.x + sgn * u * 0.44, a.y + u * 0.14);
      ctx.rotate(sgn * (0.24 + Math.sin(t * 1.7 + sgn) * 0.02));
      ctx.fillStyle = co ?? g.accent;
      ctx.beginPath();
      ctx.moveTo(-u * 0.17, 0); ctx.lineTo(u * 0.17, 0); ctx.lineTo(0, -u * 0.36);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = lo;
      ctx.beginPath();
      ctx.moveTo(-u * 0.08, -u * 0.03); ctx.lineTo(u * 0.08, -u * 0.03); ctx.lineTo(0, -u * 0.24);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  } else if (name === "bunny") {
    // bunny ears: tall body-color ellipses, white inner, lazy sway
    for (const sgn of [-1, 1]) {
      ctx.save();
      ctx.translate(a.x + sgn * u * 0.3, a.y + u * 0.08);
      ctx.rotate(sgn * 0.14 + Math.sin(t * 1.3 + sgn * 2) * 0.05);
      ctx.fillStyle = co ?? g.accent;
      ctx.beginPath(); ctx.ellipse(0, -u * 0.34, u * 0.115, u * 0.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = hi;
      ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(0, -u * 0.32, u * 0.05, u * 0.26, 0, 0, 7); ctx.fill();
      ctx.restore();
    }
  } else if (name === "cape") {
    // behind-layer: dark cloth flaring from the shoulders, fluttering hem
    const fl = Math.sin(t * 1.9) * 0.05, fl2 = Math.sin(t * 2.3 + 1.7) * 0.04;
    ctx.translate(a.x, a.y);
    ctx.fillStyle = co ?? g.dark;
    ctx.beginPath();
    ctx.moveTo(-u * 0.62, -u * 0.18);
    ctx.quadraticCurveTo(-u * (1.12 + fl), u * 0.45, -u * (0.98 + fl), u * (0.98 + fl2));
    ctx.quadraticCurveTo(-u * 0.5, u * (0.88 + fl2 * 2), 0, u * (0.98 + fl));
    ctx.quadraticCurveTo(u * 0.5, u * (0.88 + fl * 2), u * (0.98 - fl2), u * (0.98 - fl));
    ctx.quadraticCurveTo(u * (1.12 - fl2), u * 0.45, u * 0.62, -u * 0.18);
    ctx.closePath(); ctx.fill();
  } else if (name === "toque") {
    // chef hat: white band + three puff lobes
    ctx.translate(a.x, a.y + u * 0.06);
    if (g.fine) {
      // fine: a slimmer band under one soft crown (three lobes merged into a cloud)
      ctx.beginPath(); ctx.roundRect(-u * 0.24, -u * 0.1, u * 0.48, u * 0.11, u * 0.04); ctx.fill();
      for (const [dx, r] of [[-0.15, 0.12], [0, 0.15], [0.15, 0.12]] as [number, number][]) {
        ctx.beginPath(); ctx.arc(u * dx, -u * (0.17 + r * 0.45), u * r, 0, 7); ctx.fill();
      }
      ctx.restore();
      return;
    }
    ctx.beginPath(); ctx.roundRect(-u * 0.3, -u * 0.14, u * 0.6, u * 0.16, u * 0.03); ctx.fill();
    for (const [dx, r] of [[-0.2, 0.15], [0, 0.18], [0.2, 0.15]] as [number, number][]) {
      ctx.beginPath(); ctx.arc(u * dx, -u * (0.2 + r * 0.5), u * r, 0, 7); ctx.fill();
    }
  } else if (name === "mortarboard") {
    // graduation cap: dark diamond board + swaying tassel
    ctx.translate(a.x, a.y + u * 0.04);
    ctx.fillStyle = co ?? g.dark;
    if (g.fine) {
      // fine: a flatter board seen nearly edge-on, a small crown, a hairline tassel
      ctx.beginPath(); ctx.ellipse(0, u * 0.02, u * 0.28, u * 0.1, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-u * 0.5, -u * 0.05); ctx.lineTo(0, -u * 0.16); ctx.lineTo(u * 0.5, -u * 0.05); ctx.lineTo(0, u * 0.05);
      ctx.closePath(); ctx.fill();
      const sw = Math.sin(t * 1.6) * 0.04;
      ctx.strokeStyle = co ?? g.dark; ctx.lineWidth = u * 0.022;
      ctx.beginPath(); ctx.moveTo(0, -u * 0.06); ctx.quadraticCurveTo(u * (0.36 + sw), -u * 0.03, u * (0.42 + sw), u * 0.14); ctx.stroke();
      ctx.beginPath(); ctx.arc(u * (0.42 + sw), u * 0.18, u * 0.04, 0, 7); ctx.fill();
      ctx.restore();
      return;
    }
    ctx.beginPath();
    ctx.ellipse(0, u * 0.02, u * 0.34, u * 0.14, 0, Math.PI, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-u * 0.58, -u * 0.06); ctx.lineTo(0, -u * 0.24);
    ctx.lineTo(u * 0.58, -u * 0.06); ctx.lineTo(0, u * 0.1);
    ctx.closePath(); ctx.fill();
    const sw = Math.sin(t * 1.6) * 0.06;
    ctx.strokeStyle = hi; ctx.lineWidth = u * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, -u * 0.07);
    ctx.quadraticCurveTo(u * (0.42 + sw), -u * 0.02, u * (0.5 + sw), u * 0.2);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(u * (0.5 + sw), u * 0.26, u * 0.055, 0, 7); ctx.fill();
  } else if (name === "stethoscope") {
    // tubes up the sides of the collar, chest piece below it. A steep V — a
    // shallow curve here reads as a mouth on a flat face. The tubes climb only
    // as far as the collar owns, so on a block they stop under the head.
    const rise = Math.min(d * 0.571, a.rise);
    ctx.strokeStyle = co ?? g.dark; ctx.lineWidth = u * 0.05;
    ctx.beginPath();
    ctx.moveTo(a.x - u * 0.3, a.y - rise);
    ctx.quadraticCurveTo(a.x - u * 0.22, a.y + d * 0.196, a.x + u * 0.05, a.y + d * 0.393);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(a.x + u * 0.3, a.y - rise);
    ctx.quadraticCurveTo(a.x + u * 0.26, a.y + d * 0.107, a.x + u * 0.09, a.y + d * 0.321);
    ctx.stroke();
    ctx.fillStyle = hi;
    ctx.beginPath(); ctx.arc(a.x + u * 0.07, a.y + d * 0.429, u * 0.1, 0, 7); ctx.fill();
    ctx.fillStyle = lo;
    ctx.beginPath(); ctx.arc(a.x + u * 0.07, a.y + d * 0.429, u * 0.055, 0, 7); ctx.fill();
  } else if (name === "badge") {
    // clip-on ID: white card, dark photo square + clip
    ctx.translate(a.x + u * 0.46, a.y);
    ctx.rotate(0.06 + Math.sin(t * 1.4) * 0.02);
    ctx.beginPath(); ctx.roundRect(-u * 0.09, -u * 0.11, u * 0.18, u * 0.22, u * 0.02); ctx.fill();
    ctx.fillStyle = lo;
    ctx.fillRect(-u * 0.055, -u * 0.07, u * 0.07, u * 0.07);
    ctx.fillRect(-u * 0.055, u * 0.03, u * 0.11, u * 0.018);
    ctx.fillRect(-u * 0.02, -u * 0.135, u * 0.04, u * 0.03);
  } else if (name === "toolbelt") {
    // dark band around the waist + one centered buckle, clipped to the cloth
    // region (paired white pockets read as teeth)
    ctx.save();
    ctx.clip(g.clipCloth);
    ctx.fillStyle = co ?? g.dark;
    // fine: a slim belt that wraps with the body, the buckle sized to it
    const bandD = g.fine ? Math.min(d * 0.8, u * 0.16) : d * 0.8;
    if (g.fine) { wrapBand(ctx, a.x, a.y, a.y + bandD, u * 1.6, u * 0.07); ctx.fill(); }
    else ctx.fillRect(a.x - u * 1.6, a.y, u * 3.2, bandD);
    ctx.strokeStyle = hi; ctx.lineWidth = u * (g.fine ? 0.025 : 0.035);
    ctx.beginPath();
    if (g.fine) ctx.roundRect(a.x - u * 0.07, a.y + u * 0.07 + bandD * 0.5 - u * 0.05, u * 0.14, u * 0.1, u * 0.02);
    else ctx.roundRect(a.x - u * 0.09, a.y + d * 0.183, u * 0.18, u * 0.13, u * 0.02);
    ctx.stroke();
    ctx.restore();
  } else if (name === "tophat") {
    // dark cylinder + brim + white band
    ctx.translate(a.x, a.y + u * 0.06);
    ctx.fillStyle = co ?? g.dark;
    ctx.beginPath(); ctx.roundRect(-u * 0.52, -u * 0.075, u * 1.04, u * 0.1, u * 0.04); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-u * 0.32, -u * 0.6, u * 0.64, u * 0.56, u * 0.035); ctx.fill();
    ctx.fillStyle = hi;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(-u * 0.32, -u * 0.2, u * 0.64, u * 0.075);
  } else if (name === "bowtie") {
    // formal neck bow: two wings + center knot
    ctx.translate(a.x, a.y);
    ctx.rotate(Math.sin(t * 1.5) * 0.02);
    ctx.fillStyle = co ?? g.dark;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sgn * u * 0.05, 0);
      ctx.lineTo(sgn * u * 0.24, -u * 0.11);
      ctx.lineTo(sgn * u * 0.24, u * 0.11);
      ctx.closePath(); ctx.fill();
    }
    ctx.beginPath(); ctx.roundRect(-u * 0.055, -u * 0.055, u * 0.11, u * 0.11, u * 0.02); ctx.fill();
  } else if (name === "beanie") {
    // dark knit dome + band + pom
    ctx.translate(a.x, a.y + u * 0.1);
    ctx.fillStyle = co ?? g.dark;
    ctx.beginPath(); ctx.ellipse(0, -u * 0.04, u * 0.5, u * 0.34, 0, Math.PI, 0); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.roundRect(-u * 0.52, -u * 0.08, u * 1.04, u * 0.12, u * 0.05); ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath(); ctx.arc(0, -u * 0.42, u * 0.07, 0, 7); ctx.fill();
  } else if (name === "santa") {
    // santa hat — red is the exception that makes it read; white brim + pom
    ctx.translate(a.x, a.y + u * 0.08);
    ctx.fillStyle = co ?? "#d6453d";
    ctx.beginPath();
    ctx.moveTo(-u * 0.44, 0);
    ctx.quadraticCurveTo(-u * 0.2, -u * 0.52, u * 0.06, -u * 0.5);
    ctx.quadraticCurveTo(u * 0.42, -u * 0.44, u * 0.5, -u * 0.28);
    ctx.quadraticCurveTo(u * 0.32, -u * 0.3, u * 0.44, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = hi;
    ctx.beginPath(); ctx.roundRect(-u * 0.48, -u * 0.06, u * 0.96, u * 0.14, u * 0.06); ctx.fill();
    ctx.beginPath(); ctx.arc(u * 0.52, -u * 0.26, u * 0.085, 0, 7); ctx.fill();
  } else if (name === "witch") {
    // witch hat: wide brim + bent cone + tiny buckle
    ctx.translate(a.x, a.y + u * 0.05);
    ctx.fillStyle = co ?? g.dark;
    ctx.beginPath(); ctx.ellipse(0, 0, u * 0.6, u * 0.085, 0, 0, 7); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-u * 0.3, -u * 0.02);
    ctx.quadraticCurveTo(-u * 0.06, -u * 0.34, u * 0.02, -u * 0.6);
    ctx.quadraticCurveTo(u * 0.18, -u * 0.46, u * 0.12, -u * 0.62);
    ctx.quadraticCurveTo(u * 0.22, -u * 0.32, u * 0.3, -u * 0.02);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = hi;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(-u * 0.045, -u * 0.14, u * 0.09, u * 0.07);
  } else if (name === "party") {
    // party cone: white with dark dots, tilted, pom on top
    ctx.translate(a.x + u * 0.3, a.y + u * 0.12);
    ctx.rotate(0.22);
    ctx.beginPath();
    ctx.moveTo(-u * 0.2, 0); ctx.lineTo(u * 0.2, 0); ctx.lineTo(0, -u * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = co ?? g.dark;
    for (const [dx, dy, r] of [[-0.06, -0.1, 0.035], [0.07, -0.2, 0.03], [-0.02, -0.32, 0.026]] as [number, number, number][]) {
      ctx.beginPath(); ctx.arc(u * dx, u * dy, u * r, 0, 7); ctx.fill();
    }
    ctx.fillStyle = hi;
    ctx.beginPath(); ctx.arc(0, -u * 0.54, u * 0.06, 0, 7); ctx.fill();
  } else if (name === "mane") {
    // Doozy-style scalp band: a darker tint from the crown down to the eye
    // line, clipped to the head, with an owl-brow lobe dipping down BETWEEN
    // the eyes (the signature read). One path, one fill — translucent color
    // must not double-darken where the lobe overlaps the band.
    const face = g.anchors.face;
    ctx.save();
    ctx.clip(g.clipHead);
    ctx.fillStyle = co ?? "rgba(0,0,0,0.2)";
    const er = g.ringR;
    const bandBot = face.y - er * 0.1;
    ctx.beginPath();
    ctx.rect(a.x - u * 1.6, a.y - u, u * 3.2, bandBot - (a.y - u));
    ctx.ellipse(face.x, bandBot, Math.max(g.eyeCX * 0.6, er * 0.5), er * 0.8, 0, 0, 7);
    ctx.fill();
    ctx.restore();
  } else if (name === "monocle") {
    // single ring on the right eye + chain down the cheek to the chest
    const chest = g.anchors.chest;
    const { eyeCX, ringR } = g;
    ctx.lineWidth = u * 0.05;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    ctx.arc(a.x + eyeCX, a.y, ringR, 0, 7);
    ctx.stroke();
    ctx.lineWidth = u * 0.022;
    ctx.beginPath();
    ctx.moveTo(a.x + eyeCX + ringR * 0.5, a.y + ringR * 0.85);
    ctx.quadraticCurveTo(
      chest.x + chest.r * 0.62, chest.y - chest.drop * 0.1,
      chest.x + chest.r * 0.5, chest.y + chest.drop * 0.24,
    );
    ctx.stroke();
  } else if (name === "sunglasses") {
    // one dark visor band across both eyes + temple stubs + glint slash
    const { eyeCX, ringR } = g;
    if (g.fine) {
      // two shaped lenses on a fine bridge, so the face keeps its eyes' places and its
      // character instead of disappearing behind one bar
      const lw = ringR * 1.05, lh = ringR * 0.82;
      ctx.fillStyle = co ?? g.dark; ctx.strokeStyle = co ?? g.dark;
      ctx.lineWidth = u * 0.03; ctx.lineCap = "round";
      for (const sgn of [-1, 1]) {
        const x = a.x + sgn * eyeCX;
        ctx.beginPath(); ctx.roundRect(x - lw, a.y - lh * 0.55, lw * 2, lh * 1.25, [lh * 0.35, lh * 0.35, lh * 0.7, lh * 0.7]); ctx.fill();
        ctx.beginPath(); ctx.moveTo(x + sgn * lw, a.y - lh * 0.35); ctx.lineTo(sgn * u * 0.99, a.y - lh * 0.55); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(a.x - eyeCX + lw, a.y - lh * 0.3); ctx.quadraticCurveTo(a.x, a.y - lh * 0.6, a.x + eyeCX - lw, a.y - lh * 0.3); ctx.stroke();
      // one soft reflection per lens
      ctx.strokeStyle = "rgba(255,255,255,.55)"; ctx.lineWidth = u * 0.022;
      for (const sgn of [-1, 1]) { const x = a.x + sgn * eyeCX; ctx.beginPath(); ctx.moveTo(x - lw * 0.5, a.y + lh * 0.2); ctx.lineTo(x - lw * 0.05, a.y - lh * 0.3); ctx.stroke(); }
      ctx.restore();
      return;
    }
    const w = eyeCX + ringR * 1.15, h = ringR * 1.35;
    ctx.fillStyle = co ?? g.dark;
    ctx.beginPath();
    ctx.roundRect(a.x - w, a.y - h * 0.5, w * 2, h, h * 0.32);
    ctx.fill();
    ctx.strokeStyle = co ?? g.dark; ctx.lineWidth = u * 0.045;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(a.x + sgn * w * 0.98, a.y - h * 0.15);
      ctx.lineTo(sgn * u * 0.99, a.y - h * 0.35);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,.65)"; ctx.lineWidth = u * 0.03; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(a.x - eyeCX - ringR * 0.4, a.y + h * 0.16);
    ctx.lineTo(a.x - eyeCX + ringR * 0.35, a.y - h * 0.22);
    ctx.stroke();
  } else if (name === "glasses") {
    const { eyeCX, ringR } = g;
    ctx.lineWidth = u * (g.fine ? 0.032 : 0.05);
    ctx.globalAlpha = g.fine ? 1 : 0.95;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(a.x + sgn * eyeCX, a.y, ringR, 0, 7);
      ctx.stroke();
      // temple stub toward the edge of the head
      ctx.beginPath();
      ctx.moveTo(a.x * 0.8 + sgn * (eyeCX + ringR), a.y);
      ctx.lineTo(sgn * u * 0.99, a.y - u * 0.03);
      ctx.stroke();
    }
    // bridge
    ctx.beginPath();
    ctx.moveTo(a.x - eyeCX + ringR, a.y - ringR * 0.25);
    ctx.quadraticCurveTo(a.x, a.y - ringR * 0.55, a.x + eyeCX - ringR, a.y - ringR * 0.25);
    ctx.stroke();
  }
  ctx.restore();
}
