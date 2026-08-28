/**
 * The buddykit rig — faithful port of the approved v3 reference implementation
 * (visual-spec artifact §01, 2026-08-28). Frontal 2D emblem, spring motion,
 * staggered choreography, lens eye with aperture blinks + saccades, body
 * language (hover bob, curious tilts, 360 spin on flare).
 */
import { Spring } from "./spring";
import { BuddyTheme, getTheme } from "./themes";
import { FAMILIES, FamilyName, PlateDef, shapePts } from "./families";
import { STATES, BuddyState, BuddyEvent } from "./states";

export interface BuddyOptions {
  theme?: string;          // registered theme name (default "ember")
  family?: FamilyName;     // default "tetra"
  /** resting shell spread 0..1 — the trust channel (strict .15 / standard .35 / high .55) */
  trust?: number;
  seed?: number;           // deterministic per-plate phase jitter
  reducedMotion?: boolean; // render a single static frame; re-render on changes
  dprCap?: number;         // default 2
  onState?: (s: BuddyState) => void;
}

export interface BuddyHandle {
  setState(s: BuddyState): void;
  getState(): BuddyState;
  fire(e: BuddyEvent): void;
  setTheme(name: string): void;
  setFamily(f: FamilyName): void;
  setTrust(v: number): void;
  destroy(): void;
}

interface PlateRt {
  def: PlateDef;
  rad: Spring;
  scl: Spring;
  delay: number;
  born: number;
  jphase: number;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function mountBuddy(canvas: HTMLCanvasElement, opts: BuddyOptions = {}): BuddyHandle {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("buddykit: 2d context unavailable");
  const ctx: CanvasRenderingContext2D = ctx2d;

  const DPR = Math.min(globalThis.devicePixelRatio || 1, opts.dprCap ?? 2);
  const reduced = opts.reducedMotion ??
    (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);

  let theme: BuddyTheme = getTheme(opts.theme ?? "ember");
  let fam: FamilyName = opts.family ?? "tetra";
  let rest = opts.trust ?? 0.35;
  let state: BuddyState = "idle";
  const rand = mulberry32(opts.seed ?? 42);

  function fit() {
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    canvas.width = Math.max(1, w * DPR);
    canvas.height = Math.max(1, h * DPR);
  }
  fit();
  const onResize = () => { fit(); if (reduced) renderOnce(); };
  if (typeof addEventListener !== "undefined") addEventListener("resize", onResize);

  // ---- runtime state (exact v3 constants) ----
  let plates: PlateRt[] = [];
  const bodyTilt = new Spring(0, 60, 8);
  const bodyY = new Spring(0, 90, 11);
  const gSpread = new Spring(rest, 55, 9);
  const eyeScale = new Spring(1, 140, 11);
  const eyeLid = new Spring(1, 260, 16);
  const eyeX = new Spring(0, 120, 12), eyeY = new Spring(0, 120, 12);
  let spinAccum = 0;
  let t = 0, last = performance.now();
  let nextBlink = 2.5, nextGlance = 1.8, nextTilt = 4;
  let pulseT = 0, ticks: number[] = [], flareRing = -1;
  let raf = 0, destroyed = false, visible = true;
  let blinkTimer: ReturnType<typeof setTimeout> | null = null;

  function buildPlates() {
    plates = FAMILIES[fam].map((d, i) => ({
      def: d,
      rad: new Spring(0.001, 95 + i * 6, 11),
      scl: new Spring(0.001, 130, 11),
      delay: i * 0.045,
      born: t,
      jphase: rand() * 7,
    }));
  }
  buildPlates();

  const io = typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; })
    : null;
  io?.observe(canvas);

  function setState(s: BuddyState) {
    state = s;
    plates.forEach((p, i) => { p.delay = i * 0.045; p.born = t; });
    if (s === "listening") { eyeX.set(0); eyeY.set(0.18); }
    if (s === "needs_you") { eyeX.set(0); eyeY.set(0); }
    opts.onState?.(s);
    if (reduced) renderOnce();
  }

  function poly(c: CanvasRenderingContext2D, pts: [number, number][], r: number) {
    c.beginPath();
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const p0 = pts[i], p1 = pts[(i + 1) % n], p2 = pts[(i + 2) % n];
      const v1 = [p1[0] - p0[0], p1[1] - p0[1]], v2 = [p2[0] - p1[0], p2[1] - p1[1]];
      const l1 = Math.hypot(v1[0], v1[1]) || 1, l2 = Math.hypot(v2[0], v2[1]) || 1;
      const rr = Math.min(r, l1 / 2.4, l2 / 2.4);
      const a: [number, number] = [p1[0] - v1[0] / l1 * rr, p1[1] - v1[1] / l1 * rr];
      const b: [number, number] = [p1[0] + v2[0] / l2 * rr, p1[1] + v2[1] / l2 * rr];
      i ? c.lineTo(a[0], a[1]) : c.moveTo(a[0], a[1]);
      c.quadraticCurveTo(p1[0], p1[1], b[0], b[1]);
    }
    c.closePath();
  }

  function frame(now: number) {
    if (destroyed) return;
    const dt = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible || (typeof document !== "undefined" && document.hidden)) {
      if (!reduced) raf = requestAnimationFrame(frame);
      return;
    }
    t += dt;

    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2 + 4 * DPR;
    const T = theme, S = STATES[state];
    const R = Math.min(W, H) * 0.16;

    // ---- personality timers ----
    nextBlink -= dt;
    if (nextBlink <= 0 && state !== "away") {
      eyeLid.set(0);
      nextBlink = 2.8 + rand() * 3.5;
      if (blinkTimer) clearTimeout(blinkTimer);
      blinkTimer = setTimeout(() => eyeLid.set(STATES[state].eyeOpen), 90);
    }
    nextGlance -= dt;
    if (nextGlance <= 0) {
      nextGlance = 1.6 + rand() * 2.8;
      if (state === "idle" || state === "working") {
        eyeX.set((rand() - 0.5) * 0.5);
        eyeY.set((rand() - 0.4) * 0.35);
      }
    }
    nextTilt -= dt;
    if (nextTilt <= 0) {
      nextTilt = 3.5 + rand() * 4;
      if (state === "idle") bodyTilt.set(spinAccum + (rand() - 0.5) * 0.24);
      else if (state !== "away") bodyTilt.set(spinAccum + S.tilt);
    }

    // ---- springs ----
    gSpread.set(rest + S.spread);
    eyeScale.set(S.eye);
    if (state === "away") eyeLid.set(0);
    else if (eyeLid.t !== 0) eyeLid.set(S.eyeOpen);
    bodyY.set(Math.sin(t * 1.5) * 5 * DPR * S.bob);
    [gSpread, eyeScale, eyeLid, eyeX, eyeY, bodyY, bodyTilt].forEach((s) => s.step(dt));

    // needs_you double-pulse
    let attn = 0;
    if (state === "needs_you") {
      pulseT += dt; const ph = pulseT % 1.7;
      attn = ph < 0.14 ? Math.sin(ph / 0.14 * Math.PI)
        : ph > 0.26 && ph < 0.4 ? Math.sin((ph - 0.26) / 0.14 * Math.PI) : 0;
    } else pulseT = 0;

    // working ticks
    if (state === "working" && (!ticks.length || t - ticks[ticks.length - 1] > 1.1)) ticks.push(t);
    ticks = ticks.filter((k) => t - k < 1);
    if (flareRing >= 0) { flareRing += dt; if (flareRing > 0.8) flareRing = -1; }

    ctx.clearRect(0, 0, W, H);

    // ---- ambient glow ----
    const eyeOn = eyeScale.p * eyeLid.p;
    let g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.2);
    g.addColorStop(0, T.glow + (0.16 + eyeOn * 0.12 + attn * 0.3) + ")");
    g.addColorStop(1, T.glow + "0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // rings
    const ring = (age: number, life: number, maxR: number, alpha: number) => {
      const q = age / life; if (q < 0 || q > 1) return;
      ctx.beginPath(); ctx.arc(cx, cy + bodyY.p, R * (1.15 + q * maxR), 0, 7);
      ctx.strokeStyle = T.glow + alpha * (1 - q) + ")";
      ctx.lineWidth = DPR * 2 * (1 - q) + 0.4;
      ctx.stroke();
    };
    ticks.forEach((k) => ring(t - k, 1, 1.15, 0.4));
    if (flareRing >= 0) ring(flareRing, 0.8, 2.2, 0.85);

    // ---- whole body ----
    ctx.save();
    ctx.translate(cx, cy + bodyY.p);
    ctx.rotate(bodyTilt.p);

    // core disc — visible in the seams
    const coreR = R * 0.74;
    ctx.beginPath(); ctx.arc(0, 0, coreR, 0, 7);
    ctx.fillStyle = T.coreDisc; ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, coreR * 0.98, 0, 7);
    ctx.strokeStyle = T.glow + (0.28 + eyeOn * 0.2) + ")";
    ctx.lineWidth = 1.6 * DPR; ctx.stroke();

    // ---- plates ----
    plates.forEach((p, i) => {
      const live = t - p.born > p.delay;
      const wob = Math.sin(t * 1.15 + p.jphase) * 0.035;
      p.rad.set(R * (0.98 + gSpread.p * 1.5) * p.def.d * (1 + (live ? wob : 0)));
      p.scl.set(R * 0.52 * p.def.s);
      if (live) { p.rad.step(dt); p.scl.step(dt); }
      const ang = p.def.a * Math.PI / 180;
      const px = Math.cos(ang) * p.rad.p, py = Math.sin(ang) * p.rad.p;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang + Math.PI / 2 + (state === "working" ? Math.sin(t * 2 + i) * 0.05 : 0));
      const s = p.scl.p, pts = shapePts(p.def.sh, s);
      ctx.shadowColor = T.seam; ctx.shadowBlur = 8 * DPR; ctx.shadowOffsetY = 2.5 * DPR;
      poly(ctx, pts, s * 0.14); ctx.fillStyle = T.face; ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // two-tone graphic bevel
      ctx.save(); ctx.clip();
      ctx.fillStyle = T.side;
      ctx.fillRect(-s * 1.6, s * 0.02, s * 3.2, s * 1.8);
      ctx.restore();
      poly(ctx, pts, s * 0.14); ctx.strokeStyle = T.edge; ctx.lineWidth = 1.2 * DPR; ctx.stroke();
      // accent edge-light (accent on edges, never fills)
      poly(ctx, pts, s * 0.14); ctx.strokeStyle = T.glow + ".35)"; ctx.lineWidth = 2.6 * DPR; ctx.stroke();
      // hot chevron at outer tip
      ctx.beginPath();
      ctx.moveTo(-s * 0.16, -s * 0.98); ctx.lineTo(0, -s * 1.22); ctx.lineTo(s * 0.16, -s * 0.98);
      ctx.strokeStyle = T.accent; ctx.lineWidth = 2.2 * DPR; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
    });

    // ---- the eye: concentric lens, aperture blink ----
    if (eyeOn > 0.01) {
      const ex = eyeX.p * coreR * 0.5, ey = eyeY.p * coreR * 0.5;
      const ap = Math.max(0.05, eyeLid.p);
      const er = coreR * 0.42 * eyeScale.p * (1 + attn * 0.22);
      ctx.save();
      ctx.translate(ex, ey);
      ctx.beginPath(); ctx.arc(0, 0, er, 0, 7);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
      ctx.strokeStyle = T.glow + ".5)"; ctx.lineWidth = 1.4 * DPR; ctx.stroke();
      ctx.shadowColor = T.glow + ".95)"; ctx.shadowBlur = 22 * DPR * (1 + attn);
      ctx.beginPath(); ctx.arc(0, 0, er * 0.72 * ap, 0, 7);
      ctx.strokeStyle = T.eye; ctx.lineWidth = Math.max(1.5, er * 0.16 * ap); ctx.stroke();
      ctx.shadowBlur = 12 * DPR;
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, er * 0.4 * ap);
      g2.addColorStop(0, T.eyeHot); g2.addColorStop(1, T.eye);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(0, 0, er * 0.4 * ap, 0, 7); ctx.fill();
      ctx.restore();
    } else if (state === "away") {
      ctx.beginPath(); ctx.arc(0, 0, coreR * 0.5, 0, 7);
      ctx.fillStyle = T.glow + ".08)"; ctx.fill();
    }

    ctx.restore();

    if (!reduced) raf = requestAnimationFrame(frame);
  }

  function renderOnce() {
    // settle springs for a representative static frame
    for (let i = 0; i < 60; i++) {
      [gSpread, eyeScale, eyeLid, eyeX, eyeY, bodyY, bodyTilt].forEach((s) => s.step(1 / 60));
      plates.forEach((p) => { p.rad.step(1 / 60); p.scl.step(1 / 60); });
    }
    frame(performance.now());
  }

  if (reduced) renderOnce();
  else raf = requestAnimationFrame(frame);

  return {
    setState,
    getState: () => state,
    fire(e: BuddyEvent) {
      if (e === "flare") {
        spinAccum += Math.PI * 2;
        bodyTilt.set(spinAccum);
        flareRing = 0;
        if (reduced) renderOnce();
      }
    },
    setTheme(name: string) { theme = getTheme(name); if (reduced) renderOnce(); },
    setFamily(f: FamilyName) { fam = f; buildPlates(); if (reduced) renderOnce(); },
    setTrust(v: number) { rest = Math.max(0, Math.min(1, v)); if (reduced) renderOnce(); },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      if (blinkTimer) clearTimeout(blinkTimer);
      io?.disconnect();
      if (typeof removeEventListener !== "undefined") removeEventListener("resize", onResize);
    },
  };
}

/** Render a static poster PNG of a buddy (for chips, tabs, notifications, avatars). */
export async function renderPosterPng(
  opts: BuddyOptions & { size?: number; state?: BuddyState } = {},
): Promise<Blob> {
  const size = opts.size ?? 1024;
  const c = document.createElement("canvas");
  c.width = size; c.height = size;
  c.style.width = `${size}px`; c.style.height = `${size}px`;
  const h = mountBuddy(c, { ...opts, reducedMotion: true, dprCap: 1 });
  h.setState(opts.state ?? "idle");
  h.destroy();
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("buddykit: toBlob failed"))), "image/png"),
  );
}
