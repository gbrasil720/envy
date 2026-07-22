# 005 — Animate FAQ accordion open/close

- **Status**: DONE (depends on 001)
- **Commit**: 6b6e0f0
- **Severity**: MEDIUM
- **Category**: Missed opportunity (preventing jarring change)
- **Estimated scope**: 1 file, small markup + class change

## Problem

FAQ answers teleport in and out — the answer is conditionally rendered with no transition, so it snaps open and closed. The `+`/`−` indicator also hard-swaps characters.

```tsx
/* apps/web/src/components/sections/faq.tsx:56 — current */
{isOpen ? (
  <p className="max-w-[560px] px-6 pb-6 text-[14px] leading-[1.65] text-text-secondary sm:px-8">
    {item.a}
  </p>
) : null}
```

Toggle indicator (`faq.tsx:53`): `{isOpen ? '−' : '+'}`.

Purpose of animating: **preventing a jarring change** + **state indication**. Frequency is occasional (landing page), so a standard sub-250ms reveal is appropriate.

## Target

Use the CSS grid-rows `0fr → 1fr` height technique (animates cleanly without measuring height in JS) plus opacity, with `ease-snappy` (plan 001) at 200ms. Always render the answer wrapper; drive open state via classes. Rotate a single `+` glyph 45° to become `×` instead of swapping characters.

```tsx
/* target — replace the conditional block */
<div
  className={cn(
    'grid transition-[grid-template-rows,opacity] duration-200 ease-snappy',
    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
  )}
>
  <div className="overflow-hidden">
    <p className="max-w-[560px] px-6 pb-6 text-[14px] leading-[1.65] text-text-secondary sm:px-8">
      {item.a}
    </p>
  </div>
</div>
```

```tsx
/* target — toggle glyph (faq.tsx:52-54): rotate one '+' instead of swapping */
<span
  className={cn(
    'shrink-0 font-mono text-[13px] text-text-muted transition-transform duration-200 ease-snappy',
    isOpen && 'rotate-45'
  )}
>
  +
</span>
```

Reduced motion: wrap the movement so users who opt out still get the content. Add, once near the top of the file's JSX or via existing pattern, a `motion-reduce:` guard — Tailwind's `motion-reduce` variant. Simplest: append `motion-reduce:transition-none` to the grid wrapper and the glyph so they snap (acceptable) rather than animate.

## Repo conventions to follow

- Requires plan 001 (`ease-snappy`).
- `cn` is imported from `@envy/ui/lib/utils` in this codebase; check the file's existing imports — if `cn` is not already imported into `faq.tsx`, add `import { cn } from '@envy/ui/lib/utils'` (match how sibling components import it).
- Keep the existing `useState<number | null>` open logic and button markup untouched.

## Steps

1. Open `apps/web/src/components/sections/faq.tsx`. Confirm/add the `cn` import.
2. Replace the `{isOpen ? <p/> : null}` block (line ~56) with the grid-wrapper Target markup.
3. Replace the `{isOpen ? '−' : '+'}` span (line ~52) with the rotating `+` Target markup.
4. Append `motion-reduce:transition-none` to both the grid wrapper and the glyph span.
5. Save.

## Boundaries

- Do NOT change the `open === i` single-open state logic or the header button.
- Do NOT animate height with JS or add a library (grid-rows is pure CSS).
- Do NOT add dependencies.
- Keep `overflow-hidden` on the inner wrapper — without it the answer bleeds during collapse.
- If plan 001 is unmerged, STOP.

## Verification

- **Mechanical**: `bun run check-types` passes; `bunx biome check apps/web/src/components/sections/faq.tsx` clean; `bun run build` succeeds.
- **Feel check**: `bun run dev:web`, scroll to FAQ:
  - Clicking a question expands the answer with a smooth height+opacity reveal, no snap.
  - The `+` rotates to `×` in sync with the reveal.
  - Rapidly toggling never leaves a half-open row stuck (grid transition retargets).
  - At 10% playback, height and opacity finish together.
  - Enable `prefers-reduced-motion`: content still shows/hides (snaps), no broken layout.
- **Done when**: FAQ answers animate open/closed and the indicator rotates.
