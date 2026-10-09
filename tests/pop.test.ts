import { describe, it, expect } from "vitest";
import { resolveConfig, DEFAULT_CONFIG } from "../src/config";
import { popTheme, getTheme, themeNames, POP_HUES, POP_INK } from "../src/themes";
import { traceBlob, blobAnchors } from "../src/blob";
import { EMOTES, DANCE_BPS } from "../src/states";
import { posture, REST_POSE } from "../src/block-limbs";
import { drawAccessory, type AccessoryGeom } from "../src/accessories";

/** A path target that keeps the control points traceBlob emits. */
function recordOutline(...args: Parameters<typeof traceBlob> extends [unknown, ...infer R] ? R : never) {
  const pts: [number, number][] = [];
  const target = {
    moveTo: (x: number, y: number) => pts.push([x, y]),
    quadraticCurveTo: (cx: number, cy: number, x: number, y: number) => { pts.push([cx, cy]); pts.push([x, y]); },
    closePath: () => {},
  };
  traceBlob(target as unknown as Path2D, ...args);
  return pts;
}

/** The largest bend between neighbouring control points: kinks show up as spikes. */
function maxBend(pts: [number, number][]) {
  let m = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const [a, b, c] = [pts[i - 1], pts[i], pts[i + 1]];
    m = Math.max(m, Math.hypot(a[0] - 2 * b[0] + c[0], a[1] - 2 * b[1] + c[1]));
  }
  return m;
}
const meanRadius = (pts: [number, number][]) => pts.reduce((s, p) => s + Math.hypot(p[0], p[1]), 0) / pts.length;

describe("pop config", () => {
  it("defaults are the Nym-site look: a crafted blue blob with slit eyes, no groove, no tone", () => {
    expect(DEFAULT_CONFIG.finish).toBe("crafted");
    expect(DEFAULT_CONFIG.species).toBe("blob");
    expect(DEFAULT_CONFIG.eyes).toBe("slit");
    expect(DEFAULT_CONFIG.theme).toBe("pop-cobalt");
    expect(DEFAULT_CONFIG.groove).toBe(0);
    expect(DEFAULT_CONFIG.accessoryTone).toBeNull();
    expect(resolveConfig()).toEqual(DEFAULT_CONFIG);
  });
  it("clamps groove, rejects unknown finishes and treats an empty tone as none", () => {
    const c = resolveConfig({ groove: 3, finish: "matte" as never, accessoryTone: "" });
    expect(c.groove).toBe(1);
    expect(c.finish).toBe("crafted");
    expect(c.accessoryTone).toBeNull();
    expect(resolveConfig({ finish: "soft" }).finish).toBe("soft");
    expect(resolveConfig({ groove: -1, finish: "pop" }).groove).toBe(0);
    expect(resolveConfig({ finish: "pop" }).finish).toBe("pop");
  });
});

describe("pop palettes", () => {
  it("the hue is the body; eyes are white; cloth is ink on a bright hue", () => {
    const t = popTheme("#ff3d8b");
    expect(t.accent).toBe("#ff3d8b");
    expect(t.eye).toBe("#ffffff");
    expect(t.eyeHot).toBe("#ffffff");
    expect(t.coreDisc).toBe(POP_INK);
    expect(t.glow).toMatch(/^rgba\(\d+,\d+,\d+,$/);
  });
  it("an ink body (the silhouette) gets white cloth, or the cloth would vanish", () => {
    expect(popTheme(POP_INK).coreDisc).toBe("#ffffff");
  });
  it("registers every named pop hue", () => {
    expect(themeNames()).toEqual(expect.arrayContaining(Object.keys(POP_HUES)));
    for (const [name, hue] of Object.entries(POP_HUES)) expect(getTheme(name).accent).toBe(hue);
  });
});

describe("crisp blob outline", () => {
  it("with wobble off the edge holds still over time; the reference edge ripples", () => {
    const still0 = recordOutline("bean", 100, 0, 1, 0, 0, 0.45, "d12", 0);
    const still1 = recordOutline("bean", 100, 3.7, 1, 0, 0, 0.45, "d12", 0);
    expect(still1).toEqual(still0);
    const live0 = recordOutline("bean", 100, 0, 1, 0, 0, 0.2, "d12", 1);
    const live1 = recordOutline("bean", 100, 3.7, 1, 0, 0, 0.2, "d12", 1);
    expect(live1).not.toEqual(live0);
  });
  it("smoothing irons out the faceted kinks of a half-hard body but keeps its size", () => {
    for (const [body, core] of [["bean", "d12"], ["hexy", "gem"], ["squircle", "cube"]] as const) {
      const raw = recordOutline(body, 100, 0, 0, 0, 0, 0.5, core, 0, 0);
      const smooth = recordOutline(body, 100, 0, 0, 0, 0, 0.5, core, 0, 8);
      expect(maxBend(smooth), `${body}/${core}`).toBeLessThan(maxBend(raw) * 0.6);
      expect(Math.abs(meanRadius(smooth) / meanRadius(raw) - 1), `${body}/${core}`).toBeLessThan(0.02);
    }
  });
});

describe("dance", () => {
  it("is a playable emote on a 120 bpm beat", () => {
    expect(EMOTES.dance).toBeGreaterThan(1);
    expect(DANCE_BPS).toBe(2);
  });
  it("a block throws its arms up for it", () => {
    const pose = posture({ state: "idle", emote: "dance", env: 1, p: 0.5, flare: false, attn: 0, gravity: 0 });
    expect(pose.armL.sh).toBeGreaterThan(REST_POSE.armL.sh + 90);
    expect(pose.armR.sh).toBeGreaterThan(REST_POSE.armR.sh + 90);
  });
});

/** A 2d context that records the colour of every fill and stroke. */
function recordingContext() {
  const paints: { op: "fill" | "stroke"; color: string }[] = [];
  const state: Record<string, unknown> = { fillStyle: "#000000", strokeStyle: "#000000", lineWidth: 1, lineCap: "butt", globalAlpha: 1 };
  const stack: Record<string, unknown>[] = [];
  const ctx = new Proxy(state, {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "save") return () => stack.push({ ...target });
      if (prop === "restore") return () => Object.assign(target, stack.pop());
      if (prop === "fill" || prop === "fillRect") return () => paints.push({ op: "fill", color: String(target.fillStyle) });
      if (prop === "stroke") return () => paints.push({ op: "stroke", color: String(target.strokeStyle) });
      return () => {};
    },
    set(target, prop: string, value) { target[prop] = value; return true; },
  });
  return { ctx: ctx as unknown as CanvasRenderingContext2D, paints };
}

function hoodiePaints(extra: Partial<AccessoryGeom>) {
  const { ctx, paints } = recordingContext();
  const geom: AccessoryGeom = {
    anchors: blobAnchors(100, -100, 100, { cy: -18, ox: 0, oy: 0 }),
    eyeCX: 26, ringR: 24, t: 0, dark: POP_INK, accent: "#ff3d8b",
    clipCloth: {} as Path2D, clipHead: {} as Path2D, ...extra,
  };
  drawAccessory(ctx, "hoodie", geom, 1);
  return { cloth: paints[0].color, details: paints.slice(1).map((p) => p.color) };
}

describe("accessory tone", () => {
  it("doctrine colours without a tone: dark cloth, white drawstrings", () => {
    const { cloth, details } = hoodiePaints({});
    expect(cloth).toBe(POP_INK);
    expect(new Set(details)).toEqual(new Set(["#ffffff"]));
  });
  it("a white tone dresses the hoodie white and turns its drawstrings dark so they still show", () => {
    const { cloth, details } = hoodiePaints({ tone: "#ffffff" });
    expect(cloth).toBe("#ffffff");
    expect(new Set(details)).toEqual(new Set([POP_INK]));
  });
  it("an ink tone keeps white details on the ink cloth", () => {
    const { cloth, details } = hoodiePaints({ tone: POP_INK });
    expect(cloth).toBe(POP_INK);
    expect(new Set(details)).toEqual(new Set(["#ffffff"]));
  });
  it("a per-accessory colour wins over the tone and keeps doctrine details", () => {
    const { cloth, details } = hoodiePaints({ tone: "#ffffff", colors: { hoodie: "#c8a24a" } });
    expect(cloth).toBe("#c8a24a");
    expect(new Set(details)).toEqual(new Set(["#ffffff"]));
  });
});

describe("made finishes (crafted, light)", () => {
  it("accepts every finish and falls back to soft for anything else", async () => {
    const { FINISHES } = await import("../src/config");
    for (const f of FINISHES) expect(resolveConfig({ finish: f }).finish).toBe(f);
    expect(FINISHES).toEqual(["soft", "pop", "crafted", "light"]);
  });
  it("exact silhouettes: a round body stays a circle, hardness and squareness only firm it", async () => {
    const { exactSquareness, exactKeepsBumps } = await import("../src/blob");
    expect(exactSquareness("round", 0, 0)).toBe(0);
    expect(exactSquareness("squircle", 0, 0)).toBeGreaterThan(exactSquareness("round", 0, 0));
    expect(exactSquareness("hexy", 0, 0.7)).toBeGreaterThan(exactSquareness("hexy", 0, 0));
    expect(exactSquareness("bean", 1, 1)).toBeLessThanOrEqual(1);
    // only the bodies whose bumps are the shape keep them
    expect(exactKeepsBumps("cloud")).toBe(true);
    expect(exactKeepsBumps("bean")).toBe(false);
  });
  it("an exact bean without bumps is symmetric left to right", () => {
    const pts = recordOutline("bean", 100, 0, 0, 0, 0.05, 0, "sphere", 0, 2, false);
    const xs = pts.map((p) => p[0]);
    expect(Math.abs(Math.max(...xs) + Math.min(...xs))).toBeLessThan(0.5);
  });
});

describe("fine accessories", () => {
  function paints(name: Parameters<typeof drawAccessory>[1], extra: Partial<AccessoryGeom>) {
    const { ctx, paints } = recordingContext();
    const widths: number[] = [];
    const spy = new Proxy(ctx as unknown as Record<string, unknown>, {
      get(target, prop: string) { const v = (target as Record<string, unknown>)[prop]; if (prop === "stroke") return () => { widths.push(Number((target as Record<string, unknown>).lineWidth)); (v as () => void)(); }; return v; },
      set(target, prop: string, value) { (target as Record<string, unknown>)[prop] = value; return true; },
    }) as unknown as CanvasRenderingContext2D;
    drawAccessory(spy, name, {
      anchors: blobAnchors(100, -100, 100, { cy: -18, ox: 0, oy: 0 }),
      eyeCX: 26, ringR: 24, t: 0, dark: POP_INK, accent: "#ff3d8b",
      clipCloth: {} as Path2D, clipHead: {} as Path2D, ...extra,
    }, 1);
    return { paints, widths };
  }
  it("draws the glasses and the headset in a thinner, even line", () => {
    for (const name of ["glasses", "headset"] as const) {
      const classic = Math.max(...paints(name, {}).widths);
      const fine = Math.max(...paints(name, { fine: true }).widths);
      expect(fine, name).toBeLessThan(classic * 0.8);
    }
  });
  it("the fine hoodie is the hem alone (no drawstrings)", () => {
    expect(paints("hoodie", { fine: true }).paints.length).toBe(1);
    expect(paints("hoodie", {}).paints.length).toBeGreaterThan(1);
  });
});

describe("finish default tone", () => {
  function primary(name: Parameters<typeof drawAccessory>[1], extra: Partial<AccessoryGeom>) {
    const { ctx, paints } = recordingContext();
    drawAccessory(ctx, name, {
      anchors: blobAnchors(100, -100, 100, { cy: -18, ox: 0, oy: 0 }),
      eyeCX: 26, ringR: 24, t: 0, dark: POP_INK, accent: "#1e7bff",
      clipCloth: {} as Path2D, clipHead: {} as Path2D, ...extra,
    }, 1);
    return paints[0].color;
  }
  it("dresses ordinary accessories but leaves a hardhat yellow", () => {
    expect(primary("cap", { defaultTone: "#ffffff" })).toBe("#ffffff");
    expect(primary("hardhat", { defaultTone: "#ffffff" })).toBe("#f5c542");
  });
  it("an explicit tone still dresses everything", () => {
    expect(primary("hardhat", { tone: "#ffffff", defaultTone: POP_INK })).toBe("#ffffff");
  });
});
