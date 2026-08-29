/**
 * Expression states. spread is relative to the buddy's resting trust spread;
 * eye scales the lens, eyeOpen is the aperture target, bob scales hover,
 * tilt is a whole-body lean bias.
 */
export type BuddyState = "idle" | "listening" | "working" | "needs_you" | "away";

export interface StateDef {
  spread: number;
  eye: number;
  eyeOpen: number;
  bob: number;
  tilt: number;
}

export const STATES: Record<BuddyState, StateDef> = {
  idle:      { spread: 0,     eye: 1,    eyeOpen: 1,    bob: 1,    tilt: 0 },
  listening: { spread: -0.10, eye: 1.28, eyeOpen: 1.15, bob: 0.4,  tilt: -0.10 },
  working:   { spread: 0.34,  eye: 0.82, eyeOpen: 0.62, bob: 1.4,  tilt: 0.06 },
  needs_you: { spread: 0.5,   eye: 1.45, eyeOpen: 1.25, bob: 0.5,  tilt: 0 },
  away:      { spread: -0.55, eye: 0.0,  eyeOpen: 0,    bob: 0.25, tilt: 0 },
};

/** One-shot expressive events. flare is the 360 celebration spin; the rest
 *  are emotes — short expressions layered over whatever state is active. */
export type BuddyEvent = "flare" | "joy" | "surprise" | "nod" | "shake";

/** Emote durations in seconds. */
export const EMOTES: Record<Exclude<BuddyEvent, "flare">, number> = {
  joy: 1.1, surprise: 0.9, nod: 0.8, shake: 0.8,
};
