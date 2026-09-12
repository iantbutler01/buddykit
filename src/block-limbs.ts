/**
 * The block's limbs. A block has two jointed arms (shoulder, elbow, a cube
 * hand), two legs (hip lift and kick, a flat foot) and a head that moves on
 * its own neck, so its expression is posture and gesture, not just a
 * squash: it waves for attention, types when working, brings a hand to its
 * chin to listen, flings its arms out in surprise, raises fists in anger,
 * puts its hands on its hips when annoyed, and slumps when tired or sad.
 *
 * Two layers make that read at every tempo. Posture is a set of springs
 * that carry the joints toward the pose the state or emote asks for, so
 * every change of mind is a physical motion. Gestures — the wave, the
 * typing pump, the march, the stomp — are oscillations laid on top of the
 * posture with their own amplitude springs, because a spring stiff enough
 * to follow an 8 Hz wave would make every posture change a snap.
 */
import { Spring } from "./spring";
import type { BuddyState, BuddyEvent } from "./states";

/** Shoulder and elbow in degrees. sh: 0 hangs, positive swings outward and
 *  up. el: positive folds the forearm on up toward the head, negative folds
 *  it inward and down across the body. */
export interface ArmPose { sh: number; el: number }
/** lift in body-radius units (up), kick in degrees outward */
export interface LegPose { lift: number; kick: number }
/** tilt in radians (positive leans toward screen-right), dx/dy in body-radius units */
export interface HeadPose { tilt: number; dx: number; dy: number }

export interface BlockPose {
  armL: ArmPose; armR: ArmPose;
  /** shoulder lift in body-radius units per side — a raised arm shrugs its shoulder up the torso */
  shrugL: number; shrugR: number;
  legL: LegPose; legR: LegPose;
  head: HeadPose;
  /** whole-figure lift in body-radius units (jumps) */
  hop: number;
}

export const REST_POSE: BlockPose = {
  armL: { sh: 6, el: 4 }, armR: { sh: 6, el: 4 },
  shrugL: 0, shrugR: 0,
  legL: { lift: 0, kick: 0 }, legR: { lift: 0, kick: 0 },
  head: { tilt: 0, dx: 0, dy: 0 },
  hop: 0,
};

/** Posture targets per state, as deltas on the rest pose where a channel is omitted. */
const STATE_POSES: Record<BuddyState, Partial<BlockPose>> = {
  idle: {},
  listening: { armR: { sh: 30, el: 150 }, head: { tilt: 0.14, dx: 0, dy: 0.02 } },
  working: { armL: { sh: 22, el: -112 }, armR: { sh: 22, el: -112 }, head: { tilt: 0, dx: 0, dy: 0.03 } },
  needs_you: { armR: { sh: 172, el: 16 }, shrugR: 0.34, head: { tilt: -0.1, dx: 0, dy: -0.02 } },
  away: { armL: { sh: 0, el: 0 }, armR: { sh: 0, el: 0 }, legL: { lift: 0, kick: -3 }, legR: { lift: 0, kick: -3 }, head: { tilt: 0.1, dx: 0, dy: 0.07 } },
};

const EMOTE_POSES: Partial<Record<BuddyEvent, Partial<BlockPose>>> = {
  joy: { armL: { sh: 160, el: 10 }, armR: { sh: 160, el: 10 }, shrugL: 0.22, shrugR: 0.22, head: { tilt: 0, dx: 0, dy: -0.03 } },
  surprise: { armL: { sh: 82, el: 6 }, armR: { sh: 82, el: 6 }, legL: { lift: 0, kick: 9 }, legR: { lift: 0, kick: 9 }, head: { tilt: 0, dx: 0, dy: -0.04 } },
  sad: { armL: { sh: 2, el: 0 }, armR: { sh: 2, el: 0 }, head: { tilt: 0.2, dx: 0, dy: 0.06 } },
  angry: { armL: { sh: 28, el: 150 }, armR: { sh: 28, el: 150 }, shrugL: 0.08, shrugR: 0.08, head: { tilt: 0, dx: 0, dy: 0.02 } },
  tired: { armL: { sh: 0, el: 0 }, armR: { sh: 0, el: 0 }, head: { tilt: 0.16, dx: 0, dy: 0.08 } },
  annoyed: { armL: { sh: 52, el: -118 }, armR: { sh: 52, el: -118 }, head: { tilt: -0.12, dx: 0, dy: 0 } },
  flare: { armL: { sh: 96, el: 0 }, armR: { sh: 96, el: 0 } },
};

/** A fresh, fully-owned pose: the tables above are shared and must never be
 *  mutated by the per-frame damping below. */
function withDefaults(p: Partial<BlockPose>): BlockPose {
  const m = { ...REST_POSE, ...p };
  return {
    armL: { ...m.armL }, armR: { ...m.armR }, shrugL: m.shrugL, shrugR: m.shrugR,
    legL: { ...m.legL }, legR: { ...m.legR }, head: { ...m.head }, hop: m.hop,
  };
}

function mix(a: BlockPose, b: BlockPose, w: number): BlockPose {
  const l = (x: number, y: number) => x + (y - x) * w;
  const arm = (x: ArmPose, y: ArmPose) => ({ sh: l(x.sh, y.sh), el: l(x.el, y.el) });
  const leg = (x: LegPose, y: LegPose) => ({ lift: l(x.lift, y.lift), kick: l(x.kick, y.kick) });
  return {
    armL: arm(a.armL, b.armL), armR: arm(a.armR, b.armR),
    shrugL: l(a.shrugL, b.shrugL), shrugR: l(a.shrugR, b.shrugR),
    legL: leg(a.legL, b.legL), legR: leg(a.legR, b.legR),
    head: { tilt: l(a.head.tilt, b.head.tilt), dx: l(a.head.dx, b.head.dx), dy: l(a.head.dy, b.head.dy) },
    hop: l(a.hop, b.hop),
  };
}

export interface PoseInput {
  state: BuddyState;
  /** active emote and its envelope weight 0..1 */
  emote: BuddyEvent | null;
  env: number;
  /** emote progress 0..1 (nod / shake / joy hop are progress-driven, not periodic) */
  p: number;
  /** flare in progress */
  flare: boolean;
  /** needs_you pulse 0..1, already scaled by the damper */
  attn: number;
  /** the damper on needs_you 0..1 (1 when absent): how fresh the ask is */
  attention?: number;
  /** 0..1 — a grave block gestures less */
  gravity: number;
}

/** The posture the springs should carry the joints toward. */
export function posture(i: PoseInput): BlockPose {
  let pose = withDefaults(STATE_POSES[i.state]);
  // a settled ask holds a quieter version of the pose: arm coming down, head levelling
  if (i.state === "needs_you") pose = mix(withDefaults(STATE_POSES.idle), pose, i.attention ?? 1);
  if (i.flare) pose = mix(pose, withDefaults(EMOTE_POSES.flare!), 1);
  if (i.emote && EMOTE_POSES[i.emote]) pose = mix(pose, withDefaults(EMOTE_POSES[i.emote]!), i.env);
  if (i.emote === "joy") pose.hop = Math.abs(Math.sin(i.p * Math.PI * 2)) * 0.16 * i.env;
  if (i.emote === "nod") pose.head.dy = Math.sin(i.p * Math.PI * 3) * 0.05;
  if (i.emote === "shake") pose.head.dx = Math.sin(i.p * Math.PI * 5) * 0.06 * i.env;
  if (i.state === "needs_you") pose.hop = i.attn * 0.06;
  // gravity damps the gesture, not the posture: arms still go where they go, less far
  const g = 1 - 0.2 * i.gravity;
  for (const a of [pose.armL, pose.armR]) { a.sh *= g; a.el *= g; }
  pose.shrugL *= g; pose.shrugR *= g; pose.head.tilt *= g; pose.hop *= g;
  return pose;
}

/** Gesture amplitudes (0..1) the oscillation layer should fade toward. */
export interface Gestures { wave: number; pump: number; march: number; stomp: number; sway: number }

export function gestures(i: PoseInput): Gestures {
  const g = 1 - 0.5 * i.gravity;
  return {
    wave: i.state === "needs_you" ? g * (i.attention ?? 1) : 0,
    pump: i.state === "working" ? 1 : 0,
    march: i.state === "working" ? g : 0,
    stomp: i.emote === "angry" ? i.env : 0,
    sway: i.state === "away" ? 0.2 : i.emote === "tired" ? 1 + i.env : g,
  };
}

/** Spring-carried posture plus the oscillation layer, resolved to one pose per frame. */
export class LimbRig {
  private j = {
    shL: new Spring(REST_POSE.armL.sh, 90, 10), elL: new Spring(REST_POSE.armL.el, 90, 10),
    shR: new Spring(REST_POSE.armR.sh, 90, 10), elR: new Spring(REST_POSE.armR.el, 90, 10),
    liftL: new Spring(0, 150, 12), kickL: new Spring(0, 120, 12),
    liftR: new Spring(0, 150, 12), kickR: new Spring(0, 120, 12),
    shrugL: new Spring(0, 100, 11), shrugR: new Spring(0, 100, 11),
    tilt: new Spring(0, 120, 12), dx: new Spring(0, 160, 13), dy: new Spring(0, 160, 13),
    hop: new Spring(0, 160, 12),
  };
  private amp = { wave: new Spring(0, 40, 9), pump: new Spring(0, 40, 9), march: new Spring(0, 40, 9), stomp: new Spring(0, 60, 10), sway: new Spring(1, 20, 8) };

  /** Advance toward the input by physical dt; t is the buddy's own clock (tempo-scaled). */
  update(i: PoseInput, dt: number, t: number): BlockPose {
    const P = posture(i), A = gestures(i), j = this.j, a = this.amp;
    j.shL.set(P.armL.sh); j.elL.set(P.armL.el); j.shR.set(P.armR.sh); j.elR.set(P.armR.el);
    j.liftL.set(P.legL.lift); j.kickL.set(P.legL.kick); j.liftR.set(P.legR.lift); j.kickR.set(P.legR.kick);
    j.shrugL.set(P.shrugL); j.shrugR.set(P.shrugR);
    j.tilt.set(P.head.tilt); j.dx.set(P.head.dx); j.dy.set(P.head.dy); j.hop.set(P.hop);
    a.wave.set(A.wave); a.pump.set(A.pump); a.march.set(A.march); a.stomp.set(A.stomp); a.sway.set(A.sway);
    for (const s of Object.values(j)) s.step(dt);
    for (const s of Object.values(a)) s.step(dt);

    const sway = Math.sin(t * 1.3) * 3 * a.sway.p;
    const wave = Math.sin(t * 9) * 32 * a.wave.p;   // the hand swings, the arm stays up
    const pumpL = Math.sin(t * 11) * 14 * a.pump.p, pumpR = Math.sin(t * 11 + Math.PI) * 14 * a.pump.p;
    const marchL = Math.max(0, Math.sin(t * 7)) * 0.07 * a.march.p, marchR = Math.max(0, Math.sin(t * 7 + Math.PI)) * 0.07 * a.march.p;
    const stompL = Math.max(0, Math.sin(t * 12)) * 0.1 * a.stomp.p, stompR = Math.max(0, Math.sin(t * 12 + Math.PI)) * 0.1 * a.stomp.p;
    return {
      armL: { sh: j.shL.p + sway, el: j.elL.p + pumpL },
      armR: { sh: j.shR.p - sway, el: j.elR.p + pumpR + wave },
      shrugL: j.shrugL.p, shrugR: j.shrugR.p,
      legL: { lift: j.liftL.p + marchL + stompL, kick: j.kickL.p + marchL * 60 },
      legR: { lift: j.liftR.p + marchR + stompR, kick: j.kickR.p + marchR * 60 },
      head: { tilt: j.tilt.p + Math.sin(t * 0.45) * 0.03 * a.sway.p, dx: j.dx.p, dy: j.dy.p + (stompL + stompR) * 0.3 },
      hop: j.hop.p,
    };
  }
}
