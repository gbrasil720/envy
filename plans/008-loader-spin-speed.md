# 008 — Speed up the loader spinner

- **Status**: DONE
- **Commit**: 6b6e0f0
- **Severity**: LOW
- **Category**: Performance (perceived)
- **Estimated scope**: 1 file, 1 class

## Problem

The route/loading spinner uses Tailwind's default `animate-spin` (1s per rotation, linear).

```tsx
/* apps/web/src/components/loader.tsx:8 — current */
<HugeiconsIcon icon={Loading02Icon} className="animate-spin" />
```

Emil's perceived-performance rule: a faster-spinning spinner makes the app *feel* like it loads faster, even when the actual load time is unchanged. 1s/rotation reads sluggish.

## Target

Spin at ~0.6s per rotation, still linear. Use an arbitrary animation-duration utility on top of `animate-spin`:

```tsx
/* target */
<HugeiconsIcon icon={Loading02Icon} className="animate-spin [animation-duration:0.6s]" />
```

`[animation-duration:0.6s]` overrides the `1s` baked into the `animate-spin` utility while keeping its linear timing and infinite iteration.

## Repo conventions to follow

- Arbitrary-property utilities (`[prop:value]`) are already used throughout the repo's class strings (e.g. `h-[calc(100%-1px)]` in tabs.tsx) — this matches that convention; no new token needed.
- This is independent of plan 001 (no easing token required — spin stays linear).

## Steps

1. Open `apps/web/src/components/loader.tsx`.
2. Append `[animation-duration:0.6s]` to the icon's `className`.
3. Save.

## Boundaries

- Do NOT change the `animate-spin` utility itself or `globals.css` (`--animate-spin-slow` is a separate decorative token — leave it).
- Do NOT change the icon, layout, or the wrapper.
- Do NOT add dependencies.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check apps/web/src/components/loader.tsx` clean.
- **Feel check**: `bun run dev:web`, trigger a loading state (navigate to a route that suspends). The spinner rotates noticeably faster (~0.6s/turn) and feels snappier without looking frantic. In DevTools computed styles, `animation-duration` reads `0.6s`.
- **Done when**: The loader spins at 0.6s/rotation.
