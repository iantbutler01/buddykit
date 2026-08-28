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
