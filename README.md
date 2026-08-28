# buddykit

Parametric expressive identity for AI companions. One seed + a handful of traits →
a living, state-reactive 2D character. Zero runtime dependencies; canvas-2D springs.

```ts
import { mountBuddy } from "buddykit";

const buddy = mountBuddy(canvasEl, {
  theme: "ember",     // or "sumi" | "signal" | registerTheme(...) your own
  family: "tetra",    // tetra | octa | ring | petal | shard | prism
  trust: 0.35,        // resting shell spread — strict .15 / standard .35 / high .55
  seed: 42,           // deterministic personality jitter
});

buddy.setState("working");   // idle | listening | working | needs_you | away
buddy.fire("flare");         // 360 spin + ring, returns to state
buddy.setTheme("signal");
buddy.destroy();
```

Static poster (chips, tabs, notifications):

```ts
import { renderPosterPng } from "buddykit";
const blob = await renderPosterPng({ family: "petal", theme: "ember", size: 1024 });
```

## The grammar (design doctrine — locked)

Every family obeys four invariants (distilled from a reference study of expressive
companion design; these are what make all buddies read as *the same species*):

1. **Segments never touch the core** — a dark seam gap always reveals the disc behind.
2. **Tips point outward**; the classic proportion is a tall top spike with wings angled down.
3. **The eye is a concentric lens** (housing → glowing iris → hot center). It blinks by
   **aperture contraction**, never eyelids. It glances around when idle, looks at the
   user when listening, narrows to a focus slit when working.
4. **Accent color rides plate edges** — shell faces stay light/neutral.
   Color system: light shell / dark seams / one hot accent.

Motion doctrine: fully frontal (no fake 3D), critically-dampable springs on every
property, staggered per-plate choreography on state changes, hover bob, random
curious head-cocks, 360 spin with overshoot on `flare`, and `away` seals the shell
over the eye with light seeping through the seams.

**2D with great animation beats 3D.** The quality bar is expressivity — if a change
makes it stiffer, it's wrong.

## States

| State | Shell | Eye | Body |
|---|---|---|---|
| `idle` | resting spread (trust) | open, occasional glances + blinks | hover bob, curious tilts |
| `listening` | tightens toward viewer | wide, looks at you | leans in, stills |
| `working` | opens +0.34, plates stir | narrowed focus slit | quicker bob, tick rings |
| `needs_you` | held open +0.5 | wide + double-pulse | still, attention glow |
| `away` | seals over the core | closed (light through seams) | slow, dim |

## Development

```sh
pnpm install
pnpm dev          # gallery at demo/
pnpm test         # vitest — grammar invariants + spring determinism
pnpm build        # dist/ (tsc)
```

## Roadmap

- Trait-driven expression timing (blink/glance/tilt cadence from a personality vector)
- `deriveBuddy(seed, traits)` — full config derivation for host apps (archetype → family)
- More families; per-family tip ornaments
- WebGL backend behind the same handle (only if 2D hits a wall)
- React/Vue thin wrappers
