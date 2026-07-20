# 004 — Sheet: drawer curve + percentage translate

- **Status**: DONE (depends on 001)
- **Commit**: 6b6e0f0
- **Severity**: MEDIUM
- **Category**: Physicality & origin
- **Estimated scope**: 1 file, 1 class string

## Problem

The Sheet (side drawer) enters/exits with a generic `ease-in-out` curve and hardcoded `2.5rem` translate offsets. Two issues:

1. A drawer sliding from a screen edge should use an iOS-style drawer curve, not the weak generic `ease-in-out`.
2. Translate offsets are hardcoded pixels-equivalent (`2.5rem`). Emil's rule: use percentage translates relative to the element's own size so the motion adapts to content and reads as the panel fully leaving/entering its edge.

Current content class (`packages/ui/src/components/sheet.tsx:54`):

```
'fixed z-50 flex flex-col bg-popover ... shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:...data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] ... data-[side=left]:data-ending-style:translate-x-[-2.5rem] ... data-[side=right]:data-ending-style:translate-x-[2.5rem] ... data-[side=top]:data-ending-style:translate-y-[-2.5rem] ...'
```

## Target

1. Swap `ease-in-out` → `ease-drawer` (`--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1)` from plan 001). Keep `duration-200`.
2. Replace each `2.5rem` translate offset with a full own-size percentage so the panel slides fully off its edge:
   - bottom side: `translate-y-[100%]` (starting + ending)
   - top side: `translate-y-[-100%]`
   - left side: `translate-x-[-100%]`
   - right side: `translate-x-[100%]`

```
/* target fragments */
transition duration-200 ease-drawer
data-[side=bottom]:data-starting-style:translate-y-[100%]  data-[side=bottom]:data-ending-style:translate-y-[100%]
data-[side=top]:data-starting-style:translate-y-[-100%]    data-[side=top]:data-ending-style:translate-y-[-100%]
data-[side=left]:data-starting-style:translate-x-[-100%]   data-[side=left]:data-ending-style:translate-x-[-100%]
data-[side=right]:data-starting-style:translate-x-[100%]   data-[side=right]:data-ending-style:translate-x-[100%]
```

## Repo conventions to follow

- Requires plan 001 (the `ease-drawer` utility).
- Sheet already uses Base UI `data-starting-style` / `data-ending-style` for enter/exit — keep that mechanism; only change the curve token and the translate magnitudes.
- The overlay (`sheet.tsx:29`) uses `transition-opacity duration-150` — leave it as-is.

## Steps

1. Open `packages/ui/src/components/sheet.tsx`, find the content `cn(...)` string (line ~54).
2. Replace `ease-in-out` with `ease-drawer`.
3. For each side, replace both the `data-starting-style` and `data-ending-style` `2.5rem` translate with the matching `100%` / `-100%` value from Target.
4. Save.

## Boundaries

- Do NOT change the overlay transition (`sheet.tsx:29`).
- Do NOT change `duration-200`, opacity handling, side layout classes (`w-3/4`, `sm:max-w-sm`, borders), or markup.
- Do NOT add dependencies.
- If plan 001 is unmerged (no `ease-drawer`), STOP.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check packages/ui/src/components/sheet.tsx` clean; `bun run build` succeeds.
- **Feel check**: `bun run dev:web`, open a component that uses Sheet (e.g. mobile sidebar via `app-sidebar.tsx`, or `preferences-sheet.tsx`):
  - The panel slides fully in from its edge and fully out — no partial 2.5rem hop.
  - At 10% DevTools playback the motion decelerates with the drawer curve (fast start, soft settle), not the flat generic ease.
  - Toggle `prefers-reduced-motion` (Rendering panel): confirm behavior is acceptable (opacity still fades). If the movement is jarring under reduced motion, note it — a reduced-motion override can be added but is out of scope here.
- **Done when**: Drawer uses `ease-drawer` and percentage translates on all four sides.
