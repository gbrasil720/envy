# 001 — Add strong easing token foundation

- **Status**: DONE
- **Commit**: 6b6e0f0
- **Severity**: MEDIUM (foundation — unblocks 003, 004, 005, 006, 007)
- **Category**: Cohesion & tokens
- **Estimated scope**: 1 file, ~6 lines

## Problem

The codebase has no custom easing vocabulary. Every interactive transition falls back to Tailwind's default `transition-all` timing function `cubic-bezier(0.4, 0, 0.2, 1)`, which is weak and lacks intentional punch. There are no `--ease-*` design tokens; the only defined curves are decorative keyframe animations (orbs, beam, spin-slow) in `packages/ui/src/styles/globals.css`.

Emil Kowalski's rule: built-in CSS easings are too weak for UI. Define strong custom curves once, reuse everywhere. Every later animation plan (003–007) references these tokens, so this plan must land first.

## Target

Add three collision-free easing tokens to the existing `@theme` block in `packages/ui/src/styles/globals.css`. **Do NOT name them `--ease-out` / `--ease-in-out`** — those already exist as Tailwind v4 built-ins and redefining them would silently alter every existing `ease-out` / `ease-in-out` class in the app. Use distinct names so they generate *new, additive* utilities:

```css
/* target — inside the existing `@theme inline {` block in globals.css */
--ease-snappy: cubic-bezier(0.23, 1, 0.32, 1);   /* Emil "ease-out": entrances, UI feedback */
--ease-smooth: cubic-bezier(0.77, 0, 0.175, 1);  /* Emil "ease-in-out": on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);   /* iOS drawer curve (Ionic) */
```

In Tailwind v4 these auto-generate the utilities `ease-snappy`, `ease-smooth`, `ease-drawer`, usable directly in `className` (e.g. `transition-transform duration-200 ease-snappy`).

## Repo conventions to follow

- Design tokens live in `packages/ui/src/styles/globals.css`. The `@theme inline {` block starts at **globals.css:144** and already maps custom properties, e.g. `packages/ui/src/styles/globals.css:152` → `--color-brand: var(--custom-brand);`.
- Decorative animation tokens already use the `--animate-*` naming under `@theme`, e.g. `--animate-spin-slow` — follow the same `@theme` placement for these `--ease-*` tokens.

## Steps

1. Open `packages/ui/src/styles/globals.css`. Find the `@theme inline {` block (starts line 144).
2. Inside that block, add the three token lines from the Target section above (place them near the other animation-related tokens for cohesion).
3. Save. No other file changes in this plan — consumers come in later plans.

## Boundaries

- Do NOT rename or override the existing `--ease-out`, `--ease-in`, or `--ease-in-out` Tailwind built-ins.
- Do NOT change any component yet. This plan only defines tokens.
- Do NOT add dependencies.
- If the `@theme inline` block is not at globals.css:144 (drift), find it by searching `@theme` and add there; if no `@theme` block exists, STOP and report.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check packages/ui/src/styles/globals.css` clean; `bun run build` succeeds.
- **Feel check**: Temporarily add `ease-snappy` to any button, run `bun run dev:web`, open DevTools → inspect the element → confirm computed `transition-timing-function` reads `cubic-bezier(0.23, 1, 0.32, 1)`. Remove the temporary class.
- **Done when**: The three utilities `ease-snappy` / `ease-smooth` / `ease-drawer` resolve to their curves in a built page, and no existing animation changed behavior.
