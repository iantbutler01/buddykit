import { describe, it, expect } from "vitest";
import { Spring } from "../src/spring";
import { FAMILIES, shapePts } from "../src/families";
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
  it("ships five shapes, outlines normalized to unit radius", async () => {
    const { CORES, coreNames } = await import("../src/cores");
    expect(coreNames()).toEqual(["sphere", "d20", "cube", "d12", "gem"]);
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
    const { BLOCK_BUILDS, blockSlabs, blockTopY, blockBotY, blockEyeAnchor } = await import("../src/block");
    expect(BLOCK_BUILDS).toEqual(["stout", "tall", "wide", "mini", "long", "sentinel"]);
    for (const build of BLOCK_BUILDS) {
      const slabs = blockSlabs(build, 100);
      const kinds = slabs.map((s) => s.kind).sort();
      expect(kinds.filter((k) => k !== "nub")).toEqual(["crown", "head", "leg", "leg", "torso"]);
      expect(kinds.filter((k) => k === "nub").length).toBe(build === "sentinel" ? 0 : 2);
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

  it("config accepts species block with a default build", async () => {
    const { resolveConfig } = await import("../src/config");
    const cfg = resolveConfig({ species: "block" });
    expect(cfg.species).toBe("block");
    expect(cfg.build).toBe("stout");
    expect(resolveConfig({ build: "wide" }).build).toBe("wide");
  });
});

describe("quire species", () => {
  it("has five leaves whose angles mirror with the hand and a crown above the spine", async () => {
    const { quireLeaves, quireTopY, QUIRE_SPINE, QUIRE_ORDER } = await import("../src/quire");
    const right = quireLeaves(100, 1, [0, 0, 0, 0, 0], 1), left = quireLeaves(100, 1, [0, 0, 0, 0, 0], -1);
    expect(right).toHaveLength(5);
    right.forEach((leaf, i) => expect(leaf.angle).toBeCloseTo(-left[i].angle, 9));
    expect(quireTopY(100, right)).toBeLessThan(QUIRE_SPINE.top * 100);
    expect([...QUIRE_ORDER].sort()).toEqual([0, 1, 2, 3, 4]);
  });

  it("needs_you lifts the outer leaf: a -18° offset on leaf 0 raises the crown", async () => {
    const { quireLeaves, quireTopY } = await import("../src/quire");
    const rest = quireLeaves(100, 1, [0, 0, 0, 0, 0], 1);
    const raised = quireLeaves(100, 1, [-18, 0, 0, 0, 0], 1);
    expect(quireTopY(100, raised)).toBeLessThanOrEqual(quireTopY(100, rest));
    // and the leaf swings outward, away from the fan
    expect(Math.abs(raised[0].angle)).toBeGreaterThan(Math.abs(rest[0].angle));
  });

  it("config accepts species quire and hand", async () => {
    const { resolveConfig } = await import("../src/config");
    expect(resolveConfig({ species: "quire" }).hand).toBe("auto");
    expect(resolveConfig({ species: "quire", hand: "left" }).hand).toBe("left");
  });
});
