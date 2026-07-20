# 002 — Remove command palette open/close animation

- **Status**: DONE
- **Commit**: 6b6e0f0
- **Severity**: HIGH
- **Category**: Purpose & frequency
- **Estimated scope**: 1 file, ~2 lines

## Problem

The command palette is opened with a keyboard shortcut (Cmd/Ctrl+K) — an action a user performs dozens to hundreds of times a day. It currently animates open and closed through the shared Base UI `DialogContent`, which applies `zoom-in-95` + `fade-in` on open and `zoom-out-95` + `fade-out` on close with `duration-100`.

`apps/web/src/components/dashboard/command-palette.tsx` renders `CommandDialog` (from `packages/ui/src/components/command.tsx`), which wraps `DialogContent`:

```tsx
/* packages/ui/src/components/command.tsx:44 — current */
<DialogContent
  className={cn(
    'top-1/3 translate-y-0 overflow-hidden rounded-xl p-0',
    className
  )}
  showCloseButton={showCloseButton}
>
```

`DialogContent` base classes (`packages/ui/src/components/dialog.tsx:56`):

```
... duration-100 ... data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95
```

Emil's rule: **never animate keyboard-initiated actions.** Animation makes a hundreds-of-times-a-day surface feel slow and disconnected. Raycast has zero open/close animation — that is the target experience.

## Target

Make the command palette open and close instantly, with no zoom or fade delay, while leaving the generic `Dialog` (used by every modal elsewhere) untouched.

Override the animation on the `CommandDialog`'s `DialogContent` only, by forcing `duration-0`. `cn()` uses tailwind-merge, which treats `duration-*` as a single conflicting group, so appending `duration-0` reliably wins over the base `duration-100` — collapsing every enter/exit keyframe to 0ms (visually instant):

```tsx
/* target — packages/ui/src/components/command.tsx CommandDialog */
<DialogContent
  className={cn(
    'top-1/3 translate-y-0 overflow-hidden rounded-xl p-0 duration-0',
    className
  )}
  showCloseButton={showCloseButton}
>
```

## Repo conventions to follow

- `CommandDialog` already customizes `DialogContent` purely through the `className` prop merged with `cn()` — extend that same string, do not fork the component.
- tailwind-merge dedupes conflicting utilities; rely on it (as the rest of the repo does) rather than editing `dialog.tsx`.

## Steps

1. Open `packages/ui/src/components/command.tsx`, locate the `CommandDialog` function's `<DialogContent>` (around line 44).
2. Append `duration-0` to the first argument string of `cn(...)` so it reads `'top-1/3 translate-y-0 overflow-hidden rounded-xl p-0 duration-0'`.
3. Save.

## Boundaries

- Do NOT edit `packages/ui/src/components/dialog.tsx` — other modals (new-project, invite, secret-add/edit, alert-dialog) must keep their `zoom-in-95` animation. Modals are occasional-frequency and correctly animated.
- Do NOT remove the backdrop element or change palette markup/logic.
- Do NOT add dependencies.
- If `duration-0` does not visually kill the zoom (verify in feel check), fall back to also appending `data-open:animate-none data-closed:animate-none`; if that still animates, STOP and report — do not restructure the component.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check packages/ui/src/components/command.tsx` clean.
- **Feel check**: `bun run dev:web`, go to the dashboard, press Cmd+K repeatedly:
  - The palette appears and disappears instantly — no scale-up, no fade-in delay.
  - In DevTools Animations panel at 10% playback, opening the palette shows no running animation on the content element.
  - Confirm a normal modal (e.g. "New project" dialog) STILL zooms/fades — proving the change is scoped to the palette only.
- **Done when**: Cmd+K feels instantaneous and no other modal lost its animation.
