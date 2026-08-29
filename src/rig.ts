/**
 * The buddykit rig — faithful port of the approved v3 reference implementation
 * (visual-spec artifact §01, 2026-08-28). Frontal 2D emblem, spring motion,
 * staggered choreography, lens eye with aperture blinks + saccades, body
 * language (hover bob, curious tilts, 360 spin on flare).
 *
 * All tuning flows through BuddyConfig — flat multipliers where 1 is the
 * approved reference feel.
 */
import { Spring } from "./spring";
import { BuddyTheme, resolveTheme } from "./themes";
import { FAMILIES, FamilyName, PlateDef, shapePts } from "./families";
import { STATES, BuddyState, BuddyEvent } from "./states";
import { CORES, CoreShape, traceCore, traceFacets } from "./cores";
import { traceBlob, blobTopR, blobBotR } from "./blob";
import { drawAccessory, accessoryLayer } from "./accessories";
import { BuddyConfig, DEFAULT_CONFIG, resolveConfig } from "./config";

export interface BuddyMountOptions extends Partial<BuddyConfig> {
  /** render a single static frame; re-render on changes */
  reducedMotion?: boolean;
  dprCap?: number;
  onState?: (s: BuddyState) => void;
}

export interface BuddyHandle {
  setState(s: BuddyState): void;
  getState(): BuddyState;
  fire(e: BuddyEvent): void;
  /** live-update any part of the config (identity or tuning) */
  configure(partial: Partial<BuddyConfig>): void;
  getConfig(): BuddyConfig;
  /** sugar for configure({...}) */
  setTheme(name: import("./themes").ThemeInput): void;
  setFamily(f: FamilyName): void;
  setCore(c: CoreShape): void;
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

export function mountBuddy(canvas: HTMLCanvasElement, opts: BuddyMountOptions = {}): BuddyHandle {
  const ctx2d = canvas.getContext("2d");
  if (!ctx2d) throw new Error("buddykit: 2d context unavailable");
  const ctx: CanvasRenderingContext2D = ctx2d;

  const DPR = Math.min(globalThis.devicePixelRatio || 1, opts.dprCap ?? 2);
  const reduced = opts.reducedMotion ??
    (typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);

  let cfg = resolveConfig(opts);
  let theme: BuddyTheme = resolveTheme(cfg.theme);
  let rand = mulberry32(cfg.seed);
  let state: BuddyState = "idle";
  const blobPhase = (opts.seed ?? 42) % 6.283;

  function fit() {
    const w = canvas.clientWidth || canvas.width;
    const h = canvas.clientHeight || canvas.height;
    canvas.width = Math.max(1, w * DPR);
    canvas.height = Math.max(1, h * DPR);
  }
  fit();
  const onResize = () => { fit(); if (reduced) renderOnce(); };
  if (typeof addEventListener !== "undefined") addEventListener("resize", onResize);

  // ---- runtime state (v3 reference constants) ----
  let plates: PlateRt[] = [];
  const bodyTilt = new Spring(0, 60, 8);
  const bodyY = new Spring(0, 90, 11);
  const gSpread = new Spring(cfg.trust, 55, 9);
  const eyeScale = new Spring(1, 140, 11);
  const eyeLid = new Spring(1, 260, 16);
  const eyeX = new Spring(0, 120, 12), eyeY = new Spring(0, 120, 12);
  let spinAccum = 0;
  let t = 0, last = performance.now();
  let nextBlink = 2.5, nextGlance = 1.8, nextTilt = 4;
  let pulseT = 0, ticks: number[] = [], flareRing = -1;
  let raf = 0, destroyed = false, visible = true;
  interface Mote { x: number; y: number; vy: number; r: number; age: number; life: number; ph: number; col: string; }
  let motes: Mote[] = [], moteAcc = 0, flareBurst = false;
  let blinkTimer: ReturnType<typeof setTimeout> | null = null;

  function buildPlates() {
    plates = FAMILIES[cfg.family].map((d, i) => ({
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

  function configure(partial: Partial<BuddyConfig>) {
    const prev = cfg;
    cfg = resolveConfig({ ...cfg, ...partial });
    if (cfg.theme !== prev.theme) theme = resolveTheme(cfg.theme);
    if (cfg.seed !== prev.seed) rand = mulberry32(cfg.seed);
    if (cfg.family !== prev.family || cfg.seed !== prev.seed) buildPlates();
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
    const dt0 = Math.min((now - last) / 1000, 0.05); last = now;
    if (!visible || (typeof document !== "undefined" && document.hidden)) {
      if (!reduced) raf = requestAnimationFrame(frame);
      return;
    }
    const dt = dt0 * cfg.speed;   // tempo affects clocks + timers; springs stay physical (dt0)
    t += dt;

    const W = canvas.width, H = canvas.height, cx = W / 2, cy = H / 2 + 4 * DPR;
    const T = theme, S = STATES[state];
    const R = Math.min(W, H) * 0.16 * cfg.scale;

    // ---- personality timers ----
    nextBlink -= dt * cfg.blinkRate;
    if (nextBlink <= 0 && state !== "away") {
      eyeLid.set(0);
      nextBlink = 2.8 + rand() * 3.5;
      if (blinkTimer) clearTimeout(blinkTimer);
      blinkTimer = setTimeout(() => eyeLid.set(STATES[state].eyeOpen), 90);
    }
    nextGlance -= dt * cfg.glanceRate;
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
      if (state === "idle") bodyTilt.set(spinAccum + (rand() - 0.5) * 0.24 * cfg.tiltiness);
      else if (state !== "away") bodyTilt.set(spinAccum + S.tilt * cfg.tiltiness);
    }

    // ---- springs (physical time) ----
    gSpread.set(cfg.trust + S.spread * cfg.spread);
    eyeScale.set(S.eye);
    if (state === "away") eyeLid.set(0);
    else if (eyeLid.t !== 0) eyeLid.set(S.eyeOpen);
    bodyY.set(Math.sin(t * 1.5) * 5 * DPR * S.bob * cfg.bob);
    [gSpread, eyeScale, eyeLid, eyeX, eyeY, bodyY, bodyTilt].forEach((s) => s.step(dt0));

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
    if (flareRing >= 0) { flareRing += dt0; if (flareRing > 0.8) flareRing = -1; }

    ctx.clearRect(0, 0, W, H);

    // ---- ambient glow ----
    const eyeOn = eyeScale.p * eyeLid.p;
    const G = cfg.glow;
    let g = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 2.2);
    g.addColorStop(0, T.glow + Math.min(1, (0.16 + eyeOn * 0.12 + attn * 0.3) * G) + ")");
    g.addColorStop(1, T.glow + "0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // rings
    const ring = (age: number, life: number, maxR: number, alpha: number) => {
      const q = age / life; if (q < 0 || q > 1) return;
      ctx.beginPath(); ctx.arc(cx, cy + bodyY.p, R * (1.15 + q * maxR), 0, 7);
      ctx.strokeStyle = T.glow + Math.min(1, alpha * (1 - q) * G) + ")";
      ctx.lineWidth = DPR * 2 * (1 - q) + 0.4;
      ctx.stroke();
    };
    ticks.forEach((k) => ring(t - k, 1, 1.15, 0.4));
    if (flareRing >= 0) ring(flareRing, 0.8, 2.2, 0.85);

    // ---- pixie dust ----
    // Cute-side emissions: tiny four-point motes drifting up around the being.
    const spawnMote = (burst: boolean) => {
      if (motes.length > 40) return;
      const a = rand() * Math.PI * 2;
      const d = R * (burst ? 0.6 + rand() * 0.7 : 1.05 + rand() * 0.85);
      motes.push({
        x: cx + Math.cos(a) * d * 1.2,
        y: cy + bodyY.p + Math.sin(a) * d,
        vy: -(10 + rand() * 16) * DPR * (burst ? 1.8 : 1),
        r: (1.4 + rand() * 2.2) * DPR,
        age: 0, life: 1.2 + rand() * 1.4, ph: rand() * 7,
        col: [T.eyeHot, "#ffffff", T.eye][(rand() * 3) | 0],
      });
    };
    const spRate = cfg.sparkle * (state === "needs_you" ? 2.4 : state === "working" ? 1.5
      : state === "listening" ? 0.7 : state === "away" ? 0.15 : 1);
    moteAcc += dt * spRate;
    while (moteAcc >= 1) { moteAcc -= 1; spawnMote(false); }
    if (flareRing >= 0 && !flareBurst) { flareBurst = true; for (let i = 0; i < 16; i++) spawnMote(true); }
    if (flareRing < 0) flareBurst = false;
    motes = motes.filter((m) => (m.age += dt) < m.life);
    for (const m of motes) {
      m.y += m.vy * dt;
      const q = m.age / m.life;
      const tw = 0.55 + 0.45 * Math.sin(m.age * 9 + m.ph);
      const alpha = Math.sin(q * Math.PI) * tw * Math.min(1, 0.9 * G);
      const r = m.r * (1 - q * 0.4);
      const x = m.x + Math.sin(t * 2.2 + m.ph) * 3 * DPR;
      ctx.save();
      ctx.translate(x, m.y);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = m.col;
      ctx.beginPath();
      ctx.moveTo(0, -r * 2);
      ctx.quadraticCurveTo(0, 0, r * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, r * 2);
      ctx.quadraticCurveTo(0, 0, -r * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -r * 2);
      ctx.fill();
      ctx.restore();
    }

    // ---- whole body ----
    // The eye and body are one unit: the body turns toward the gaze
    // (rotation from gaze-x, dip from gaze-y); the eye keeps only a small
    // residual travel so it never slides independently of the facets.
    const coreRPre = R * 0.74 * cfg.coreSize;
    const gazeRot = eyeX.p * 0.16;
    const gazeDip = eyeY.p * coreRPre * 0.22;
    ctx.save();
    ctx.translate(cx, cy + bodyY.p + gazeDip);
    ctx.rotate(bodyTilt.p + gazeRot);

    // shared plate shell — emblem draws it around the core, wisp orbits it
    // around the blob body (Rb sets the orbit baseline, szMul the plate scale)
    const drawPlates = (Rb: number, szMul: number) => plates.forEach((p, i) => {
      const live = t - p.born > p.delay;
      const wob = Math.sin(t * 1.15 + p.jphase) * 0.035;
      p.rad.set(Rb * (0.98 + gSpread.p * 1.5) * p.def.d * (1 + (live ? wob : 0)));
      p.scl.set(Rb * 0.52 * p.def.s * cfg.plateSize * szMul);
      if (live) { p.rad.step(dt0); p.scl.step(dt0); }
      const ang = p.def.a * Math.PI / 180;
      const px = Math.cos(ang) * p.rad.p, py = Math.sin(ang) * p.rad.p;
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(ang + Math.PI / 2 + (state === "working" ? Math.sin(t * 2 + i) * 0.05 : 0));
      const s = p.scl.p, pts = shapePts(p.def.sh, s);
      ctx.shadowColor = T.seam; ctx.shadowBlur = 8 * DPR; ctx.shadowOffsetY = 2.5 * DPR;
      poly(ctx, pts, s * 0.14); ctx.fillStyle = T.face; ctx.fill();
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      ctx.save(); ctx.clip();
      ctx.fillStyle = T.side;
      ctx.fillRect(-s * 1.6, s * 0.02, s * 3.2, s * 1.8);
      ctx.restore();
      poly(ctx, pts, s * 0.14); ctx.strokeStyle = T.edge; ctx.lineWidth = 1.2 * DPR; ctx.stroke();
      poly(ctx, pts, s * 0.14); ctx.strokeStyle = T.glow + Math.min(1, 0.35 * G) + ")"; ctx.lineWidth = 2.6 * DPR; ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.16, -s * 0.98); ctx.lineTo(0, -s * 1.22); ctx.lineTo(s * 0.16, -s * 0.98);
      ctx.strokeStyle = T.accent; ctx.lineWidth = 2.2 * DPR; ctx.lineCap = "round"; ctx.stroke();
      ctx.restore();
    });

    if (cfg.species !== "emblem") {
      // ---- blob species: everything is a knob — hardness morphs the soft
      // organic body toward a rigid faceted core; shell orbits the plate ring ----
      const hard = cfg.hardness, soft = 1 - hard;
      const bodyR = R * (cfg.shell ? 0.72 : 0.95) * cfg.coreSize;
      if (cfg.shell) drawPlates(bodyR * 1.05, 0.62);
      // squash couples to the bob for organic weight; away slumps.
      // A hard body is a hard object — squash fades out with hardness.
      const squash = soft * ((bodyY.v * -0.0022) + (state === "away" ? -0.14 : 0) + (flareRing >= 0 ? 0.1 * Math.sin(Math.min(flareRing / 0.8, 1) * Math.PI) : 0));
      const traceBody = (c: CanvasRenderingContext2D) =>
        traceBlob(c, cfg.body, bodyR, t, blobPhase, squash, cfg.squareness, hard, cfg.core);
      // flat saturated body — the accent IS the being (clean, no outline/shading)
      ctx.shadowColor = T.glow + Math.min(1, 0.25 * G) + ")";
      ctx.shadowBlur = 18 * DPR * G;
      traceBody(ctx);
      ctx.fillStyle = T.accent; ctx.fill();
      ctx.shadowBlur = 0;
      // depth — a body among orbiting objects (or a hard one) must read as an
      // object itself: soft drop shadow + inner rim bevel; pure blobs stay flat
      const depth = Math.max(cfg.shell ? 0.7 : 0, hard * 0.7);
      if (depth > 0) {
        ctx.save();
        ctx.shadowColor = `rgba(0,0,0,${0.38 * depth})`;
        ctx.shadowBlur = 12 * DPR;
        ctx.shadowOffsetY = 4 * DPR;
        traceBody(ctx); ctx.fillStyle = T.accent; ctx.fill();
        ctx.restore();
      }
      if (cfg.gradient > 0) {
        // soft top-light / bottom-shade over the accent, refilling the same path
        const ga = 0.2 * cfg.gradient;
        const gr = ctx.createLinearGradient(0, -bodyR * 1.25, 0, bodyR * 1.25);
        gr.addColorStop(0, `rgba(255,255,255,${ga})`);
        gr.addColorStop(0.55, "rgba(255,255,255,0)");
        gr.addColorStop(1, `rgba(0,0,0,${ga * 0.85})`);
        ctx.fillStyle = gr; ctx.fill();
      }
      if (depth > 0) {
        // inner rim bevel — top light, bottom shade, clipped inside the body
        ctx.save();
        traceBody(ctx); ctx.clip();
        const bev = ctx.createLinearGradient(0, -bodyR, 0, bodyR);
        bev.addColorStop(0, `rgba(255,255,255,${0.3 * depth})`);
        bev.addColorStop(0.45, "rgba(255,255,255,0)");
        bev.addColorStop(1, `rgba(0,0,0,${0.26 * depth})`);
        traceBody(ctx);
        ctx.strokeStyle = bev; ctx.lineWidth = 10 * DPR;
        ctx.stroke();
        ctx.restore();
      }
      const facetA = Math.max(0, (hard - 0.35) / 0.65);   // facets fade in past mid-hardness
      if (facetA > 0 && traceFacets(ctx, cfg.core, bodyR * 0.96)) {
        // faint facet lines — the hard-material read
        ctx.strokeStyle = T.glow + Math.min(1, 0.16 * facetA * G) + ")";
        ctx.lineWidth = 1 * DPR;
        ctx.stroke();
      }

      // shared eye placement — the eye renderer and accessories (glasses,
      // headset) must agree on where the eyes are
      const exOff = eyeX.p * bodyR * 0.1, eyOff = eyeY.p * bodyR * 0.1;
      const shiftX = cfg.eyeShift * bodyR * 0.3;
      const wide = Math.min(1.25, eyeScale.p * (1 + attn * 0.18)) * cfg.eyeSize;
      const EYEP = cfg.eyes === "googly" ? { sx: 0.38, sy: 0.18, f: 0.4, ring: 0.37 }
        : cfg.eyes === "slit" ? { sx: 0.26, sy: 0.2, f: 1, ring: 0.29 }
        : cfg.eyes === "dot" ? { sx: 0.3, sy: 0.16, f: 0.8, ring: 0.24 }
        : cfg.eyes === "arc" ? { sx: 0.32, sy: 0.16, f: 0.6, ring: 0.28 }
        : cfg.eyes === "ring" ? { sx: 0.32, sy: 0.16, f: 0.8, ring: 0.26 }
        : { sx: 0.34, sy: 0.12, f: 1, ring: 0.26 };
      const coreOutline = CORES[cfg.core].outline;
      const coreTop = coreOutline ? -Math.min(...coreOutline.map((p) => p[1])) : 1;
      const coreBot = coreOutline ? Math.max(...coreOutline.map((p) => p[1])) : 1;
      const geom = {
        topY: -(blobTopR(cfg.body, bodyR) * (1 - squash) * soft + coreTop * bodyR * hard),
        botY: blobBotR(cfg.body, bodyR) * (1 - squash) * soft + coreBot * bodyR * hard,
        bodyR, t, dark: T.coreDisc, accent: T.accent,
        traceBody,
        eyeCX: bodyR * EYEP.sx * cfg.eyeSpacing,
        eyeCY: -bodyR * EYEP.sy * cfg.eyeRaise,
        eyeOX: shiftX + exOff * EYEP.f,
        eyeOY: eyOff * EYEP.f,
        ringR: bodyR * EYEP.ring * Math.max(0.4, wide),
      };
      for (const a of cfg.accessories) if (accessoryLayer(a) === "back") drawAccessory(ctx, a, geom, DPR);

      // two eyes — style per cfg.eyes; lid blinks; shared saccades
      if (eyeOn > 0.01 || state === "away") {
        const ap = Math.max(0.06, eyeLid.p);
        const closed = state === "away" || ap < 0.12;
        // closed-lid radius must not scale with the eye-open spring — away
        // drives eyeScale to 0 and the arcs would vanish with it
        const restR = bodyR * 0.24 * cfg.eyeSize;
        const sleepArc = (er: number) => {
          ctx.beginPath();
          ctx.arc(0, 0, er, 0.15 * Math.PI, 0.85 * Math.PI);
          ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 2.6 * DPR; ctx.lineCap = "round";
          ctx.stroke();
        };
        if (cfg.eyes === "googly") {
          // Doozy-style: big near-white sclera, large pupil chasing the gaze, glint.
          // Overexaggerated by default — the eyes are the only feature, so they carry.
          const er = bodyR * 0.3 * wide;
          for (const sgn of [-1, 1]) {
            const exc = sgn * geom.eyeCX + geom.eyeOX, eyc = geom.eyeCY + geom.eyeOY;
            ctx.save();
            ctx.translate(exc, eyc);
            if (closed) { sleepArc(restR); ctx.restore(); continue; }
            ctx.scale(1, ap);
            ctx.beginPath(); ctx.arc(0, 0, er, 0, 7);
            ctx.fillStyle = "#ffffff"; ctx.fill();
            const px = eyeX.p * er * 0.55 + sgn * er * 0.08, py = eyeY.p * er * 0.55 + er * 0.1;
            ctx.beginPath(); ctx.arc(px, py, er * 0.58, 0, 7);
            ctx.fillStyle = T.coreDisc; ctx.fill();
            ctx.beginPath(); ctx.arc(px + er * 0.2, py - er * 0.22, er * 0.16, 0, 7);
            ctx.fillStyle = "#ffffff"; ctx.fill();
            ctx.beginPath(); ctx.arc(px - er * 0.14, py + er * 0.18, er * 0.07, 0, 7);
            ctx.fillStyle = "rgba(255,255,255,.7)"; ctx.fill();
            ctx.restore();
          }
        } else if (cfg.eyes === "slit") {
          // Grok-style minimal: two soft white pills; no outline. Big by default —
          // at small sizes undersized slits vanish into the flat body.
          // Hardness morphs pill → friendly rounded square (Cozmo/Vector robot
          // eyes — slightly taller than wide reads warm; wide-flat reads mean)
          // and the organic tilt fades out.
          const eh = bodyR * (0.42 * soft + 0.28 * hard) * wide;
          const ew = bodyR * (0.151 * soft + 0.23 * hard) * wide;
          const rr = (ew / 2) * soft + bodyR * 0.06 * wide * hard;
          for (const sgn of [-1, 1]) {
            const exc = sgn * geom.eyeCX + geom.eyeOX, eyc = geom.eyeCY + geom.eyeOY;
            ctx.save();
            ctx.translate(exc, eyc);
            ctx.rotate(sgn * 0.06 * soft);
            if (closed) { sleepArc(restR * 0.95); ctx.restore(); continue; }
            ctx.scale(1, ap);
            ctx.beginPath();
            ctx.roundRect(-ew / 2, -eh / 2, ew, eh, rr);
            ctx.fillStyle = "#ffffff"; ctx.fill();
            ctx.restore();
          }
        } else if (cfg.eyes === "dot") {
          // minimal filled rounds — quiet, friendly; hardness squares them slightly
          const er = bodyR * 0.115 * wide;
          const rr = er * (1 - hard * 0.45);
          for (const sgn of [-1, 1]) {
            const exc = sgn * geom.eyeCX + geom.eyeOX, eyc = geom.eyeCY + geom.eyeOY;
            ctx.save();
            ctx.translate(exc, eyc);
            if (closed) { sleepArc(restR * 0.8); ctx.restore(); continue; }
            ctx.scale(1, ap);
            ctx.beginPath();
            ctx.roundRect(-er, -er, er * 2, er * 2, rr);
            ctx.fillStyle = "#ffffff"; ctx.fill();
            ctx.restore();
          }
        } else if (cfg.eyes === "arc") {
          // upturned happy crescents — permanent smize; blinks flatten them
          const er = bodyR * 0.16 * wide;
          for (const sgn of [-1, 1]) {
            const exc = sgn * geom.eyeCX + geom.eyeOX, eyc = geom.eyeCY + geom.eyeOY;
            ctx.save();
            ctx.translate(exc, eyc);
            if (closed) { sleepArc(restR * 0.8); ctx.restore(); continue; }
            ctx.scale(1, Math.max(0.25, ap));
            ctx.beginPath();
            ctx.arc(0, er * 0.45, er, Math.PI * 1.12, Math.PI * 1.88);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = bodyR * 0.055 * wide;
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.restore();
          }
        } else if (cfg.eyes === "ring") {
          // hollow rounds — curious robot; pupil-less but alive via saccades
          const er = bodyR * 0.125 * wide;
          for (const sgn of [-1, 1]) {
            const exc = sgn * geom.eyeCX + geom.eyeOX, eyc = geom.eyeCY + geom.eyeOY;
            ctx.save();
            ctx.translate(exc, eyc);
            if (closed) { sleepArc(restR * 0.8); ctx.restore(); continue; }
            ctx.scale(1, ap);
            ctx.beginPath();
            ctx.arc(0, 0, er, 0, 7);
            ctx.strokeStyle = "#ffffff";
            ctx.lineWidth = bodyR * 0.05 * wide;
            ctx.stroke();
            ctx.restore();
          }
        } else {
          // glint: original dark pupils + hot sparks
          const er = bodyR * 0.155 * wide;
          for (const sgn of [-1, 1]) {
            const exc = sgn * geom.eyeCX + geom.eyeOX, eyc = geom.eyeCY + geom.eyeOY;
            ctx.save();
            ctx.translate(exc, eyc);
            if (closed) { sleepArc(restR * 0.7); ctx.restore(); continue; }
            ctx.scale(1, ap);
            ctx.beginPath(); ctx.arc(0, 0, er, 0, 7);
            ctx.fillStyle = T.coreDisc; ctx.fill();
            ctx.shadowColor = T.glow + Math.min(1, 0.5 * G) + ")"; ctx.shadowBlur = 8 * DPR * G;
            ctx.beginPath(); ctx.arc(er * 0.3, -er * 0.32, er * 0.3, 0, 7);
            ctx.fillStyle = T.eyeHot; ctx.fill();
            ctx.shadowBlur = 0;
            ctx.restore();
          }
        }
      }
      for (const a of cfg.accessories) if (accessoryLayer(a) === "front") drawAccessory(ctx, a, geom, DPR);
      ctx.restore();
      if (!reduced) raf = requestAnimationFrame(frame);
      return;
    }

    // core body — visible in the seams; shape carries the being's build
    const coreR = R * 0.74 * cfg.coreSize;
    traceCore(ctx, cfg.core, coreR);
    ctx.fillStyle = T.coreDisc; ctx.fill();
    traceCore(ctx, cfg.core, coreR * 0.98);
    ctx.strokeStyle = T.glow + Math.min(1, (0.28 + eyeOn * 0.2) * G) + ")";
    ctx.lineWidth = 1.6 * DPR; ctx.stroke();
    const socketR = coreR * 0.42 * cfg.eyeSize;  // fixed lens housing, part of the core
    ctx.save();
    // clip = core body minus the socket disc (evenodd) → facet lines terminate at the housing
    traceCore(ctx, cfg.core, coreR);
    ctx.arc(0, 0, socketR, 0, Math.PI * 2, true);
    ctx.clip("evenodd");
    if (traceFacets(ctx, cfg.core, coreR * 0.96)) {
      ctx.strokeStyle = T.glow + Math.min(1, (0.12 + eyeOn * 0.1) * G) + ")";
      ctx.lineWidth = 1 * DPR;
      ctx.stroke();
    }
    ctx.restore();

    // ---- plates ----
    drawPlates(R, 1);

    // ---- the eye: concentric lens, aperture blink ----
    if (eyeOn > 0.01) {
      const ap = Math.max(0.05, eyeLid.p);
      // housing is fixed and concentric with the core; expression lives in the
      // iris (scale within the socket, capped so it never escapes the housing)
      const er = socketR;
      const iris = Math.min(1.0, eyeScale.p * (1 + attn * 0.22));
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, er, 0, 7);
      ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fill();
      ctx.strokeStyle = T.glow + Math.min(1, 0.5 * G) + ")"; ctx.lineWidth = 1.4 * DPR; ctx.stroke();
      ctx.shadowColor = T.glow + Math.min(1, 0.95 * G) + ")"; ctx.shadowBlur = 22 * DPR * (1 + attn) * G;
      ctx.beginPath(); ctx.arc(0, 0, er * 0.72 * ap * iris, 0, 7);
      ctx.strokeStyle = T.eye; ctx.lineWidth = Math.max(1.5, er * 0.16 * ap * iris); ctx.stroke();
      ctx.shadowBlur = 12 * DPR * G;
      const g2 = ctx.createRadialGradient(0, 0, 0, 0, 0, er * 0.4 * ap * iris);
      g2.addColorStop(0, T.eyeHot); g2.addColorStop(1, T.eye);
      ctx.fillStyle = g2;
      ctx.beginPath(); ctx.arc(0, 0, er * 0.4 * ap * iris, 0, 7); ctx.fill();
      ctx.restore();
    } else if (state === "away") {
      traceCore(ctx, cfg.core, coreR * 0.5);
      ctx.fillStyle = T.glow + ".08)"; ctx.fill();
    }

    ctx.restore();

    if (!reduced) raf = requestAnimationFrame(frame);
  }

  function renderOnce() {
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
    configure,
    getConfig: () => ({ ...cfg }),
    setTheme(name: import("./themes").ThemeInput) { configure({ theme: name }); },
    setFamily(f: FamilyName) { configure({ family: f }); },
    setCore(c: CoreShape) { configure({ core: c }); },
    setTrust(v: number) { configure({ trust: v }); },
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
  opts: BuddyMountOptions & { size?: number; state?: BuddyState } = {},
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

