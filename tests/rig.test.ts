import { describe, it, expect } from "vitest";
import { Spring } from "../src/spring";
import { FAMILIES, shapePts, shapeDetail } from "../src/families";
import { STATES } from "../src/states";
import { getTheme, registerTheme, themeNames } from "../src/themes";

describe("Spring", () => {
  it("converges to target", () => {
    const s = new Spring(0, 120, 14);
    s.set(1);
    for (let i = 0; i < 600; i++) s.step(1 / 60);
    expect(s.p).toBeCloseTo(1, 3);
  });

  it("is deterministic for identical stepping", () => {
    const a = new Spring(0, 60, 8), b = new Spring(0, 60, 8);
    a.set(2); b.set(2);
    for (let i = 0; i < 100; i++) { a.step(1 / 60); b.step(1 / 60); }
    expect(a.p).toBe(b.p);
  });

  it("overshoots when underdamped (the buddykit feel)", () => {
    const s = new Spring(0, 130, 8);
    s.set(1);
    let max = 0;
    for (let i = 0; i < 300; i++) { s.step(1 / 60); max = Math.max(max, s.p); }
    expect(max).toBeGreaterThan(1.02);
  });
});

describe("families (grammar invariants)", () => {
  it("every family has plates and every plate resolves a shape", () => {
    for (const [name, defs] of Object.entries(FAMILIES)) {
      expect(defs.length, name).toBeGreaterThanOrEqual(3);
      for (const d of defs) {
        const pts = shapePts(d.sh, 1);
        expect(pts.length, `${name}/${d.sh}`).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it("tips point outward: every shape's outermost vertex is on the -y (tip) side", () => {
    for (const defs of Object.values(FAMILIES)) {
      for (const d of defs) {
        const pts = shapePts(d.sh, 1);
        const minY = Math.min(...pts.map((p) => p[1]));
        const maxY = Math.max(...pts.map((p) => p[1]));
        expect(Math.abs(minY)).toBeGreaterThan(Math.abs(maxY)); // pointed side dominates
      }
    }
  });

  it("classic family (tetra) keeps the tall-top-spike proportion", () => {
    const [top, ...wings] = FAMILIES.tetra;
    expect(top.a).toBe(-90);
    for (const w of wings) expect(top.s).toBeGreaterThan(w.s);
  });
});

describe("states", () => {
  it("away seals (negative spread) and closes the eye", () => {
    expect(STATES.away.spread).toBeLessThan(0);
    expect(STATES.away.eyeOpen).toBe(0);
  });
  it("working opens the shell and narrows the eye", () => {
    expect(STATES.working.spread).toBeGreaterThan(0);
    expect(STATES.working.eyeOpen).toBeLessThan(STATES.idle.eyeOpen);
  });
});

describe("themes", () => {
  it("ships ember/sumi/signal and supports registration", () => {
    expect(themeNames()).toEqual(expect.arrayContaining(["ember", "sumi", "signal"]));
    registerTheme("test", { ...getTheme("ember"), accent: "#000000" });
    expect(getTheme("test").accent).toBe("#000000");
  });
  it("glow is an rgba prefix (alpha appended at draw time)", () => {
    for (const n of ["ember", "sumi", "signal"]) {
      expect(getTheme(n).glow).toMatch(/^rgba\(\d+,\d+,\d+,$/);
    }
  });
});

describe("cores", () => {
  it("ships six shapes, outlines normalized to unit radius", async () => {
    const { CORES, coreNames } = await import("../src/cores");
    expect(coreNames()).toEqual(["sphere", "d20", "cube", "d12", "gem", "spine"]);
    for (const [name, def] of Object.entries(CORES)) {
      if (!def.outline) continue; // sphere
      const maxR = Math.max(...def.outline.map(([x, y]) => Math.hypot(x, y)));
      expect(maxR, name).toBeCloseTo(1, 5);
    }
  });
  it("polyhedral cores carry facet detail; sphere carries none", async () => {
    const { CORES } = await import("../src/cores");
    expect(CORES.sphere.facets.length).toBe(0);
    for (const n of ["d20", "cube", "d12", "gem"] as const) {
      expect(CORES[n].facets.length, n).toBeGreaterThan(0);
    }
  });
});

describe("config", () => {
  it("resolves defaults and clamps", async () => {
    const { resolveConfig, DEFAULT_CONFIG } = await import("../src/config");
    expect(resolveConfig()).toEqual(DEFAULT_CONFIG);
    const c = resolveConfig({ trust: 9, glow: -2, family: "petal" });
    expect(c.trust).toBe(1);
    expect(c.glow).toBe(0);
    expect(c.family).toBe("petal");
    expect(c.bob).toBe(1); // untouched defaults intact
  });
  it("all tuning multipliers default to the reference feel (1)", async () => {
    const { DEFAULT_CONFIG } = await import("../src/config");
    const tuning = ["scale","plateSize","coreSize","eyeSize","glow","bob","tiltiness","spread","speed","blinkRate","glanceRate"] as const;
    for (const k of tuning) expect(DEFAULT_CONFIG[k], k).toBe(1);
  });
});

describe("raw themes", () => {
  it("themeFromAccent builds a grammar-compliant palette from one hex", async () => {
    const { themeFromAccent } = await import("../src/themes");
    const t = themeFromAccent("#7c5cff");
    expect(t.accent).toBe("#7c5cff");
    expect(t.glow).toMatch(/^rgba\(\d+,\d+,\d+,$/);
    for (const k of ["face", "side", "edge", "coreDisc", "eyeHot", "eye"] as const) {
      expect(t[k], k).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
  it("config accepts a raw theme object and resolveTheme passes it through", async () => {
    const { resolveTheme, themeFromAccent } = await import("../src/themes");
    const { resolveConfig } = await import("../src/config");
    const raw = themeFromAccent("#22aa66");
    const cfg = resolveConfig({ theme: raw });
    expect(resolveTheme(cfg.theme)).toBe(raw);
  });
});

describe("makeTheme (per-element)", () => {
  it("layers overrides on a base and converts hex glow/seam", async () => {
    const { makeTheme, getTheme } = await import("../src/themes");
    const t = makeTheme({ base: "ember", eye: "#ff3355", glow: "#112233", seam: "#445566" });
    expect(t.eye).toBe("#ff3355");
    expect(t.glow).toBe("rgba(17,34,51,");
    expect(t.seam).toBe("rgba(68,85,102,.28)");
    expect(t.face).toBe(getTheme("ember").face); // untouched elements inherit base
  });
  it("accent implies glow when glow not given; glowToHex round-trips", async () => {
    const { makeTheme, glowToHex } = await import("../src/themes");
    const t = makeTheme({ base: "sumi", accent: "#22aa66" });
    expect(t.glow).toBe("rgba(34,170,102,");
    expect(glowToHex(t.glow)).toBe("#22aa66");
  });
});

describe("blob species", () => {
  it("ships four bodies and species defaults to emblem (back-compat)", async () => {
    const { BLOB_BODIES } = await import("../src/blob");
    const { DEFAULT_CONFIG, resolveConfig } = await import("../src/config");
    expect(BLOB_BODIES).toEqual(["round", "droplet", "bean", "pebble", "squircle", "tri", "cloud", "hexy"]);
    expect(DEFAULT_CONFIG.species).toBe("emblem");
    const c = resolveConfig({ species: "blob", body: "bean" });
    expect(c.species).toBe("blob");
    expect(c.body).toBe("bean");
  });
});

describe("blob eyes", () => {
  it("six styles, googly default", async () => {
    const { BLOB_EYES } = await import("../src/blob");
    const { DEFAULT_CONFIG, resolveConfig } = await import("../src/config");
    expect(BLOB_EYES).toEqual(["googly", "slit", "glint", "dot", "arc", "ring", "lens"]);
    expect(DEFAULT_CONFIG.eyes).toBe("googly");
    expect(resolveConfig({ eyes: "slit" }).eyes).toBe("slit");
  });
});

describe("block species", () => {
  it("ships five builds and a stacked slab layout that nests inside the crown/leg anchors", async () => {
    const { BLOCK_BUILDS, blockSlabs, blockFigure, blockTopY, blockBotY, blockEyeAnchor } = await import("../src/block");
    expect(BLOCK_BUILDS).toEqual(["stout", "tall", "wide", "mini", "long", "sentinel"]);
    for (const build of BLOCK_BUILDS) {
      const slabs = blockSlabs(build, 100);
      expect(slabs.map((s) => s.kind).sort()).toEqual(["crown", "head", "torso"]);
      const fig = blockFigure(build, 100);
      expect(fig.arms.map((c) => c.kind)).toEqual(["upper", "fore", "hand", "upper", "fore", "hand"]);
      expect(fig.legs.map((c) => c.kind)).toEqual(["shin", "foot", "shin", "foot"]);
      const top = blockTopY(build, 100), bot = blockBotY(build, 100);
      expect(top).toBeLessThan(0);
      expect(bot).toBeGreaterThan(0);
      const eye = blockEyeAnchor(build, 100);
      expect(eye.cy).toBeGreaterThan(top);
      expect(eye.cy).toBeLessThan(bot);
      expect(eye.cx).toBeGreaterThan(0);
      // the crown is the topmost slab and sits above the head
      const crown = slabs.find((s) => s.kind === "crown")!, head = slabs.find((s) => s.kind === "head")!;
      expect(crown.y).toBeLessThanOrEqual(head.y);
    }
  });

  it("squash stretches the stack without separating it", async () => {
    const { blockSlabs } = await import("../src/block");
    const rest = blockSlabs("stout", 100, 0), tall = blockSlabs("stout", 100, 0.2);
    const restH = Math.max(...rest.map((s) => s.y + s.h)) - Math.min(...rest.map((s) => s.y));
    const tallH = Math.max(...tall.map((s) => s.y + s.h)) - Math.min(...tall.map((s) => s.y));
    expect(tallH).toBeLessThan(restH);   // +squash squashes vertically (kx up, ky down)
    const head = tall.find((s) => s.kind === "head")!, torso = tall.find((s) => s.kind === "torso")!;
    expect(Math.abs(head.y + head.h - torso.y)).toBeLessThan(1e-9);
  });

  it("gravity clamps to 0..1 and squares the block's corners", async () => {
    const { resolveConfig } = await import("../src/config");
    const { blockSlabs } = await import("../src/block");
    expect(resolveConfig({ gravity: 3 }).gravity).toBe(1);
    expect(resolveConfig({ gravity: -1 }).gravity).toBe(0);
    expect(resolveConfig({}).gravity).toBe(0);
    const soft = blockSlabs("stout", 100, 0, 0), grave = blockSlabs("stout", 100, 0, 1);
    expect(grave[0].r).toBeLessThan(soft[0].r);
  });

  it("limbs pose from state and emote and mirror at rest", async () => {
    const { posture, gestures, LimbRig, REST_POSE } = await import("../src/block-limbs");
    const { blockFigure } = await import("../src/block");
    const base = { emote: null, env: 0, p: 0, flare: false, attn: 0, gravity: 0 } as const;
    const rest = posture({ ...base, state: "idle" });
    expect(rest).toEqual(REST_POSE);
    const wave = posture({ ...base, state: "needs_you" });
    expect(wave.armR.sh).toBeGreaterThan(140);        // right arm up to wave
    expect(wave.armL.sh).toBe(REST_POSE.armL.sh);     // left stays down
    const joy = posture({ ...base, state: "idle", emote: "joy", env: 1, p: 0.25 });
    expect(joy.armL.sh).toBeGreaterThan(140); expect(joy.armR.sh).toBeGreaterThan(140);
    expect(joy.hop).toBeGreaterThan(0.1);
    expect(gestures({ ...base, state: "working" }).pump).toBe(1);
    expect(gestures({ ...base, state: "idle" }).pump).toBe(0);
    // gravity damps the gesture, never inverts it — and never leaks into the shared tables
    for (let i = 0; i < 50; i++) posture({ ...base, state: "needs_you", gravity: 1 });
    expect(posture({ ...base, state: "needs_you", gravity: 1 }).armR.sh).toBeGreaterThan(90);
    expect(posture({ ...base, state: "needs_you" }).armR.sh).toBe(172);
    expect(posture({ ...base, state: "idle" })).toEqual(REST_POSE);
    // the damper: a settled ask keeps the state and loses the shouting — arm most of the way
    // down, no wave — and a fresh one (attention 1, the default) is the full pose
    const settled = posture({ ...base, state: "needs_you", attention: 0.15 });
    expect(settled.armR.sh).toBeLessThan(wave.armR.sh);
    expect(settled.armR.sh).toBeLessThan(REST_POSE.armR.sh + 0.2 * (wave.armR.sh - REST_POSE.armR.sh));
    expect(gestures({ ...base, state: "needs_you", attention: 0.15 }).wave).toBeCloseTo(0.15, 5);
    expect(gestures({ ...base, state: "needs_you", attention: 0 }).wave).toBe(0);
    expect(posture({ ...base, state: "needs_you", attention: 1 })).toEqual(wave);
    // a wave through the rig: the right hand ends up above the shoulder
    const rig = new LimbRig();
    let pose = REST_POSE;
    for (let i = 0; i < 240; i++) pose = rig.update({ ...base, state: "needs_you" }, 1 / 60, i / 60);
    const fig = blockFigure("stout", 100, 0, 0, pose);
    const hand = fig.arms[5], shoulder = fig.arms[3];
    expect(hand.py).toBeLessThan(shoulder.py);
    const { blockTopY } = await import("../src/block");
    expect(hand.py - hand.len).toBeLessThan(blockTopY("stout", 100) + 10);   // the waving hand reaches the crown
    // the rest figure is mirror-symmetric
    const restFig = blockFigure("stout", 100);
    expect(restFig.arms[0].px).toBeCloseTo(-restFig.arms[3].px, 6);
    expect(restFig.legs[0].px).toBeCloseTo(-restFig.legs[2].px, 6);
  });

  it("config accepts species block with a default build", async () => {
    const { resolveConfig } = await import("../src/config");
    const cfg = resolveConfig({ species: "block" });
    expect(cfg.species).toBe("block");
    expect(cfg.build).toBe("stout");
    expect(resolveConfig({ build: "wide" }).build).toBe("wide");
  });
});

describe("codex and fan shells", () => {
  it("are plate families over a spine core, mixable like the rest", async () => {
    const { CORES, coreRadiusAt } = await import("../src/cores");
    const { resolveConfig } = await import("../src/config");
    expect(CORES.spine.outline!.length).toBe(4);
    expect(coreRadiusAt("spine", 0)).toBeLessThan(coreRadiusAt("spine", Math.PI / 2));   // taller than wide
    expect(FAMILIES.codex.every((d) => d.sh === "page")).toBe(true);
    expect(FAMILIES.fan.every((d) => d.sh === "leaf")).toBe(true);
    // hinges mirror: the left page turns one way, its twin the other; the fan opens outward both sides
    expect(FAMILIES.codex.map((d) => d.hinge)).toEqual([30, 45, 60, -30, -45, -60]);
    expect(FAMILIES.fan.map((d) => d.hinge ?? 0)).toEqual([-50, -25, 0, 25, 50]);
    // mirror symmetry: every codex page on the left has a twin on the right
    const left = FAMILIES.codex.filter((d) => Math.cos(d.a * Math.PI / 180) < 0).map((d) => [180 - d.a, d.d, d.s].join());
    const right = FAMILIES.codex.filter((d) => Math.cos(d.a * Math.PI / 180) > 0).map((d) => [((d.a % 360) + 360) % 360 - 0, d.d, d.s].join());
    expect(left.map((k) => k.replace(/^-?\d+/, (m) => String(((Number(m) % 360) + 360) % 360))).sort()).toEqual(right.sort());
    expect(shapeDetail("page", 10).length).toBeGreaterThan(0);
    expect(shapeDetail("kite", 10)).toEqual([]);
    expect(resolveConfig({ core: "spine", family: "fan" }).core).toBe("spine");
  });
});

describe("accessory anchors", () => {
  const EXPECTED: Record<string, string> = {
    none: "body",
    antenna: "headTop", sprout: "headTop", bow: "headTop", halo: "headTop", crown: "headTop",
    hardhat: "headTop", cap: "headTop", ears: "headTop", bunny: "headTop", toque: "headTop",
    mortarboard: "headTop", tophat: "headTop", beanie: "headTop", santa: "headTop",
    witch: "headTop", party: "headTop", mane: "headTop",
    headset: "headSide",
    glasses: "face", monocle: "face", sunglasses: "face",
    scarf: "neck", bowtie: "neck", stethoscope: "neck",
    shirt: "chest", hoodie: "chest", tie: "chest", badge: "chest",
    toolbelt: "waist",
    cape: "body",
  };

  async function blockPlaces(build: "stout" | "tall" | "wide" | "mini" | "long" | "sentinel" = "stout", r = 100) {
    const { blockAnchors, blockEyeAnchor, blockSlabs, blockBotY } = await import("../src/block");
    const eye = blockEyeAnchor(build, r);
    return {
      anchors: blockAnchors(build, r, 0, 0, { cy: eye.cy, ox: 0, oy: 0 }),
      slabs: blockSlabs(build, r),
      footY: blockBotY(build, r),
    };
  }

  it("pins every accessory to a named place on the body", async () => {
    const { ACCESSORIES, accessoryAnchor } = await import("../src/accessories");
    for (const a of ACCESSORIES) expect(accessoryAnchor(a), a).toBe(EXPECTED[a]);
    // and the table covers the roster exactly — a new accessory must choose a place
    expect(ACCESSORIES.slice().sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it("only head-worn accessories ride the head", async () => {
    const { ACCESSORIES, accessoryAnchor, accessoryRidesHead } = await import("../src/accessories");
    for (const a of ACCESSORIES) {
      const head = ["headTop", "headSide", "face"].includes(accessoryAnchor(a));
      expect(accessoryRidesHead(a), a).toBe(head);
    }
  });

  it("puts the block's places on the block's own parts", async () => {
    const { anchors, slabs, footY } = await blockPlaces();
    const [torso, head, crown] = slabs;
    const headBot = head.y + head.h, torsoBot = torso.y + torso.h;
    expect(anchors.headTop.y).toBe(crown.y);                    // hats sit on the crown
    expect(anchors.headTop.r).toBeCloseTo(Math.max(crown.w, head.w) * 0.645, 6);
    expect(anchors.headSide.x).toBeCloseTo(head.w / 2 * 0.98, 6);   // cups straddle the head edge
    expect(anchors.headSide.y).toBeGreaterThan(head.y);
    expect(anchors.headSide.y).toBeLessThan(headBot);
    expect(anchors.face.y).toBeGreaterThan(head.y);             // glasses land on the face
    expect(anchors.face.y).toBeLessThan(headBot);
    expect(anchors.face.r).toBeCloseTo(head.w / 2, 6);          // temples reach the head's edge
    expect(anchors.neck.y).toBe(torso.y);                       // the collar is the top of the torso
    expect(anchors.chest.y).toBeGreaterThan(torso.y);           // the chest is the upper torso
    expect(anchors.chest.y).toBeLessThan(torso.y + torso.h * 0.5);
    expect(anchors.waist.y).toBeGreaterThan(torso.y + torso.h * 0.5);
    expect(anchors.waist.y).toBeLessThan(torsoBot);
    for (const place of ["neck", "chest", "waist"] as const) {
      expect(anchors[place].r, place).toBeCloseTo(torso.w / 2, 6);
    }
    // the cape covers shoulders to feet
    expect(anchors.body.y - anchors.body.r * 0.18).toBeCloseTo(torso.y, 6);
    expect(anchors.body.y + anchors.body.r * 0.98).toBeCloseTo(footY, 6);
  });

  it("keeps cloth off the legs — the bug: cloth measured from the figure's bottom edge", async () => {
    const { anchors, slabs, footY } = await blockPlaces();
    const torsoBot = slabs[0].y + slabs[0].h;
    for (const place of ["neck", "chest", "waist"] as const) {
      expect(anchors[place].y, place).toBeGreaterThanOrEqual(slabs[0].y);
      expect(anchors[place].y + anchors[place].drop, place).toBeLessThanOrEqual(torsoBot + 1e-9);
    }
    expect(torsoBot).toBeLessThan(footY);   // there really are legs below the cloth
    // a collar has no room above it on a block: the head starts immediately
    expect(anchors.neck.rise).toBe(0);
  });

  it("keeps the places in head-to-toe order on every build", async () => {
    const { BLOCK_BUILDS } = await import("../src/block");
    for (const build of BLOCK_BUILDS) {
      const { anchors, footY } = await blockPlaces(build);
      const order = [anchors.headTop.y, anchors.face.y, anchors.neck.y, anchors.chest.y, anchors.waist.y, footY];
      for (let i = 1; i < order.length; i++) expect(order[i], `${build} ${i}`).toBeGreaterThan(order[i - 1]);
    }
  });

  it("scales its places with the build rather than with a constant", async () => {
    const wide = (await blockPlaces("wide")).anchors;
    const stout = (await blockPlaces("stout")).anchors;
    const sentinel = (await blockPlaces("sentinel")).anchors;
    expect(wide.headTop.r).toBeGreaterThan(stout.headTop.r);     // a wide head wears a wide hat
    expect(sentinel.headTop.r).toBeLessThan(stout.headTop.r);
    expect(wide.chest.r).toBeGreaterThan(sentinel.chest.r);      // a wide torso wears wide cloth
  });

  it("gives the blob the same places, measured against its chin", async () => {
    const { blobAnchors } = await import("../src/blob");
    const r = 100, topY = -100, botY = 100;
    const a = blobAnchors(r, topY, botY, { cy: -18, ox: 0, oy: 0 });
    expect(a.headTop.y).toBe(topY);
    expect(a.face.y).toBe(-18);
    expect(a.neck.y).toBeCloseTo(botY * 0.44, 6);
    expect(a.chest.y).toBeCloseTo(botY * 0.5, 6);
    expect(a.waist.y).toBeCloseTo(botY * 0.7, 6);
    for (const place of ["neck", "chest", "waist"] as const) {
      // a blob is one body: its cloth may hang to the chin, and no further
      expect(a[place].y + a[place].drop, place).toBeCloseTo(botY, 6);
      expect(a[place].r, place).toBe(r);
    }
    expect(a.neck.rise).toBeGreaterThan(0);   // a blob has face above its collar; a block does not
  });
});
