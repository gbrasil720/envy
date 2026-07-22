# 007 — Staggered scroll-reveal for landing grids

- **Status**: DONE (depends on 001; optional — lowest priority)
- **Commit**: 6b6e0f0
- **Severity**: LOW
- **Category**: Missed opportunity (delight, first-view)
- **Estimated scope**: 3 files

## Problem

Landing-page card grids render fully static — everything is present at first paint with no entrance. On a marketing page (first-view frequency, the one place the delight budget lives) a restrained fade + short upward translate with a small stagger reads more polished than a flat wall of cards.

Targets (each maps its items):

- `apps/web/src/components/sections/features.tsx` — 4 feature cells (static markup, no `.map`; wrap each cell)
- `apps/web/src/components/sections/pricing.tsx:66` — `{PLANS.map((plan, i) => ...)}`
- `apps/web/src/components/sections/how-it-works.tsx:55` — `{STEPS.map((step) => ...)}`

Purpose: **delight / preventing a flat first impression.** Must never block interaction and must respect reduced motion.

## Target

Use the already-installed `motion` library (`motion` v12, imported as `import { motion, useReducedMotion } from 'motion/react'`). Reveal each item with opacity `0 → 1` and `translateY(8px → 0)`, `ease-snappy`-equivalent curve, 300ms, staggered 40ms per index, triggered once on scroll-in.

```tsx
/* target — per-item wrapper pattern */
const reduce = useReducedMotion()
// ...
<motion.div
  initial={reduce ? false : { opacity: 0, y: 8 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true, margin: '-80px' }}
  transition={{ duration: 0.3, delay: i * 0.04, ease: [0.23, 1, 0.32, 1] }}
>
  {/* existing card content */}
</motion.div>
```

- `ease: [0.23, 1, 0.32, 1]` is the numeric form of `--ease-snappy` (motion takes arrays, not CSS var names).
- `initial={false}` when reduced-motion is on → item renders in place, no movement.
- `once: true` → fires a single time; never re-animates on scroll-back.
- Keep stagger small (40ms); cap effective delay so later items don't feel slow.

## Repo conventions to follow

- `motion` is already a dependency of `apps/web` and is used in `apps/web/src/components/forms/waitlist-form.tsx` (`import { motion } from 'motion/react'`) — copy that import style; add `useReducedMotion` to the same import.
- Do not convert an existing wrapping element's semantics — wrap card content, keep grid/border layout classes on the same element by moving them onto the `motion.div` where the wrapped node was a plain `div`.

## Steps

1. **features.tsx** — import `motion, useReducedMotion` from `motion/react`. Convert each of the 4 feature cell `<div>`s into `motion.div` with the Target props, giving each an explicit index (0–3) for the stagger delay. Preserve every existing className (borders, padding) on the `motion.div`.
2. **pricing.tsx** — import motion. Wrap the mapped card node in `motion.div` using the map's `i` for `delay: i * 0.04`.
3. **how-it-works.tsx** — import motion. The map has no index; change to `STEPS.map((step, i) => ...)` and wrap the step node. NOTE: the step is a `<button>` with an `onClick` copy handler — wrap it in `motion.div` (do not turn the button into `motion.button` if it complicates the existing handler; a wrapping div is safest). Keep the button fully interactive during/after reveal.
4. Save all three.

## Boundaries

- Do NOT add stagger to dashboard lists (secrets, members, audit) — functional, frequently seen; out of scope.
- Do NOT use `motion`'s shorthand under heavy load concerns here — these are one-shot first-view reveals, `y` is fine.
- Do NOT block clicks: `whileInView` must not gate pointer events; verify buttons work mid-animation.
- Do NOT add new dependencies (`motion` already present).
- Keep durations ≤300ms and stagger ≤40ms/item.
- If this feels like too much motion for the product's crisp personality during feel check, reducing scope to features.tsx only is acceptable — note it.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check apps/web/src/components/sections/{features,pricing,how-it-works}.tsx` clean; `bun run build` succeeds.
- **Feel check**: `bun run dev:web`, hard-reload and scroll down the landing page:
  - Each grid's items fade+rise in with a gentle cascade, once, as they enter view.
  - Scrolling back up and down again does NOT re-trigger the animation.
  - The how-it-works copy buttons are clickable during and after the reveal.
  - Enable `prefers-reduced-motion`: items appear immediately with no movement.
  - At 10% playback, no card overshoots or blocks interaction.
- **Done when**: The three grids reveal on first scroll-in, respect `once` + reduced motion, and remain interactive.
