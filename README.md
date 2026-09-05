# buddykit

![buddykit demo — hero buddy with character-select roster](docs/roster.png)

Living 2D characters for AI companions. One seed + a handful of traits → an
animated being with states, emotes, and a wardrobe. Canvas 2D, spring physics,
zero dependencies.

```sh
npm install @metonymous/buddykit
```

```ts
import { mountBuddy } from "@metonymous/buddykit";

const buddy = mountBuddy(canvasEl, {
  species: "blob",        // "emblem" (ghost) | "blob" (soft, two-eyed) | "block" (stacked slabs)
  body: "round", eyes: "googly", theme: "ember",   // eyes also: slit | glint | dot | arc | ring | lens (one optic)
  build: "stout",         // block species: stout | tall | wide | mini | long | sentinel
  family: "tetra",        // emblem shell: tetra | octa | ring | petal | shard | prism | codex (open book) | fan (peacock tail)
  core: "sphere",         // emblem core: sphere | d20 | cube | d12 | gem | spine (a book's binding)
  accessories: ["ears", "bowtie"],
  accessoryColors: { bowtie: "#d6453d" },   // per-accessory color overrides
  gravity: 0,             // 0 playful → 1 grave: hard corners, muted light, narrow eyes, slow motion
  hardness: 0,            // 0 soft blob → 1 rigid faceted core
  shell: false,           // orbit the emblem's plate ring around any blob
  seed: 42,               // same seed → same being
});

buddy.setState("working");   // idle | listening | working | needs_you | away
buddy.fire("joy");           // joy | surprise | nod | shake | sad | angry | tired | annoyed
buddy.configure({ theme: "sumi", accessories: ["tophat", "monocle", "cape"] });
const cfg = buddy.getConfig();   // a buddy IS its config — store it, remount it anywhere
buddy.destroy();
```

A buddy is deterministic from its config: `getConfig()` → JSON →
`mountBuddy(canvas, cfg)` reproduces the identical character. `renderPosterPng`
exports a static frame.

Demo: `npm install && npm run dev`.

License: Apache-2.0
