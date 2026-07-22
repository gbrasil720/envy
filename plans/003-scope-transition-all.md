# 003 — Scope `transition-all` and apply strong easing

- **Status**: DONE (depends on 001)
- **Commit**: 6b6e0f0
- **Severity**: MEDIUM
- **Category**: Easing & duration
- **Estimated scope**: ~7 files, small class-string edits

## Problem

`transition-all` appears across the shared UI primitives and the `.btn-*` / `.input-base` component classes. `transition: all` animates *every* animatable property (including layout-affecting ones) and, with no explicit timing function, uses Tailwind's weak default `cubic-bezier(0.4, 0, 0.2, 1)`. This makes hover/press/focus states feel generic and slightly mushy instead of crisp.

Current locations (verbatim class fragments):

- `packages/ui/src/components/button.tsx:6` — base cva string includes `... transition-all outline-none ...`
- `packages/ui/src/components/badge.tsx:7` — `... whitespace-nowrap transition-all focus-visible:...`
- `packages/ui/src/components/switch.tsx:17` — `... rounded-full border border-transparent transition-all outline-none ...`
- `packages/ui/src/components/tabs.tsx:58` — `... px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-foreground/60 transition-all ...`
- `packages/ui/src/components/toggle.tsx:8` — `... whitespace-nowrap transition-all outline-none hover:bg-muted ...`
- `packages/ui/src/styles/globals.css:403,407,411` — `.btn-primary` / `.btn-ghost` / `.btn-danger`, each `... transition-all hover:brightness-110 active:scale-95;`
- `packages/ui/src/styles/globals.css:415` — `.input-base` — `... outline-none transition-all focus:border-border-focus ...`

## Target

Replace each `transition-all` with an explicitly-scoped transition using the `ease-snappy` utility (`--ease-snappy: cubic-bezier(0.23, 1, 0.32, 1)` from plan 001) and a UI-appropriate duration ≤200ms. Only animate `color`, `background-color`, `border-color`, `box-shadow`, `transform`, and `opacity` — never layout properties.

Tailwind-utility targets (button/badge/switch/tabs/toggle):

```
/* replace: transition-all */
transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-snappy
```

CSS `@apply` targets in globals.css:

```css
/* .btn-primary / .btn-ghost / .btn-danger — replace `transition-all` */
@apply ... transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-snappy hover:brightness-110 active:scale-95;

/* .input-base — replace `transition-all` */
@apply ... transition-[color,border-color,box-shadow] duration-150 ease-snappy focus:border-border-focus focus:shadow-brand;
```

## Repo conventions to follow

- Requires plan 001 merged (the `ease-snappy` utility must exist).
- Preserve every other class exactly and in place — only swap the single `transition-all` token within each string.
- The `.btn-*` classes use scale on press (`active:scale-95`); keep that — it is correct press feedback.

## Steps

1. **button.tsx:6** — in the cva base string, replace `transition-all` with `transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-snappy`.
2. **badge.tsx:7** — same replacement.
3. **switch.tsx:17** — replace `transition-all` with `transition-[color,background-color,border-color,transform] duration-150 ease-snappy` (switch thumb slides via transform).
4. **tabs.tsx:58** — same as step 1's replacement.
5. **toggle.tsx:8** — same as step 1's replacement.
6. **globals.css:403 / 407 / 411** — in `.btn-primary`, `.btn-ghost`, `.btn-danger`, replace `transition-all` with `transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-snappy`.
7. **globals.css:415** — in `.input-base`, replace `transition-all` with `transition-[color,border-color,box-shadow] duration-150 ease-snappy`.

## Boundaries

- Do NOT touch `transition-colors` usages (hero, how-it-works, faq) — those are already scoped correctly.
- Do NOT change `usage-bar` / `progress` `transition-all` — handled in plan 009.
- Do NOT alter durations already set on overlays (dialog/popover/dropdown `duration-100`) — out of scope here.
- Do NOT change any non-transition class, colors, or layout.
- Do NOT add dependencies.
- If plan 001 is not merged (no `ease-snappy` utility), STOP.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check .` clean; `bun run build` succeeds; grep confirms zero remaining `transition-all` in the seven edited locations.
- **Feel check**: `bun run dev:web`:
  - Hover a `Button` and a `Badge` — color transitions feel crisp, not mushy; no layout jitter.
  - Toggle a `Switch` — thumb slides smoothly with the new curve.
  - Focus an input (`.input-base`) — border/shadow ease in without animating size.
  - In DevTools, computed `transition-timing-function` on these elements reads `cubic-bezier(0.23, 1, 0.32, 1)`.
- **Done when**: All seven locations use scoped transitions with `ease-snappy` and nothing animates a layout property.
