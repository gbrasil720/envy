# 009 — Scope progress/usage-bar width transition

- **Status**: DONE
- **Commit**: 6b6e0f0
- **Severity**: LOW
- **Category**: Performance
- **Estimated scope**: 2 files, 1 class each

## Problem

Two bar fills animate with `transition-all`, which (a) uses the weak default curve and (b) leaves every property animatable when only `width` changes.

```tsx
/* apps/web/src/components/dashboard/usage-bar.tsx:29 — current */
className={`h-full rounded-full transition-all ${
  isNearLimit ? 'bg-amber-400' : 'bg-brand'
}`}
```

```tsx
/* packages/ui/src/components/progress.tsx:48 — current */
className={cn('h-full bg-primary transition-all', className)}
```

`width` transitions trigger layout, so this stays a `width` transition (acceptable for a bar), but it should be scoped and use an intentional curve/duration.

## Target

Scope to `width` (and `background-color` for the usage bar's near-limit color change) with a clear duration and easing. These are data indicators, not decorative — keep it calm: 300ms with the default `ease-out` built-in is fine (no dependency on plan 001, but if 001 is merged you may use `ease-snappy` instead for consistency).

```tsx
/* target — usage-bar.tsx */
className={`h-full rounded-full transition-[width,background-color] duration-300 ease-out ${
  isNearLimit ? 'bg-amber-400' : 'bg-brand'
}`}
```

```tsx
/* target — progress.tsx */
className={cn('h-full bg-primary transition-[width] duration-300 ease-out', className)}
```

## Repo conventions to follow

- Independent of plan 001 (uses built-in `ease-out`). Optional upgrade to `ease-snappy` only if 001 is merged.
- `progress.tsx` uses `cn(...)` with a passthrough `className` — keep the passthrough last so callers can still override.

## Steps

1. **usage-bar.tsx:29** — replace `transition-all` with `transition-[width,background-color] duration-300 ease-out`.
2. **progress.tsx:48** — replace `transition-all` with `transition-[width] duration-300 ease-out`.
3. Save both.

## Boundaries

- Do NOT convert the fill to a transform/scaleX approach (would complicate the rounded-cap geometry and percentage width logic) — keep `width`.
- Do NOT change the surrounding track, colors logic, or `pct` computation.
- Do NOT add dependencies.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check apps/web/src/components/dashboard/usage-bar.tsx packages/ui/src/components/progress.tsx` clean; `bun run build` succeeds.
- **Feel check**: `bun run dev:web`, view a project's usage bar / any Progress:
  - When the value changes, the fill eases to its new width smoothly (not instant, not sluggish).
  - The usage bar's color change at the near-limit threshold transitions rather than snapping.
  - DevTools computed `transition-property` lists only `width` (and `background-color` for usage-bar), not `all`.
- **Done when**: Both bars use scoped, eased width transitions.
