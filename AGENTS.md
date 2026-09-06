# Blend + Vite

This is a Vite + React SPA built on `@juspay/blend-design-system` ("Blend"), currently
installed at **0.0.37**. There is no server, no SSR and no framework router — `index.html`
mounts `src/main.tsx`, which renders one tree inside Blend's `ThemeProvider`.

Everything below is about **Blend**, not about Vite. Blend's own README and docs site
document an API that does not exist; these rules are what the installed source actually
says.

## Repo setup these rules assume

Some rules below reference files this repo may not have yet. Create them once, then the
rules apply as written. Full contents are in the appendix at the bottom.

| Need | Status |
|---|---|
| `src/primitives.tsx` — `Block`, `PrimitiveText`, `font()` | create (appendix A) |
| `src/motion.ts` — every duration and curve | create (appendix B) |
| `src/suppress-blend-noise.ts` — filters known Blend console noise | create (appendix C) |
| `lucide-react` — icons (rule 11) | `npm i lucide-react` |
| `.mcp.json` — wires up `blend-ui-mcp` (rule 2) | create (appendix D) |
| `blend-primitives/*` alias — reaches `Block` | see appendix A, **verify it builds** |

---

## The rules

### 1. Tailwind for layout. Blend for everything you can see. Tokens for every value.

| Concern | Use |
|---|---|
| flex, grid, gap, padding, width, page rhythm | Tailwind utilities |
| buttons, inputs, modals, tables, tags, charts — any UI | Blend components, never hand-rolled |
| colour, type scale, radius, shadow, border width | `FOUNDATION_THEME`, via inline `style` or Blend props |

**Never a Tailwind colour class** (`text-gray-600`, `bg-neutral-950`, `bg-blue-500`) and
**never a hex literal**. Blend's own site mixes these; we don't, because a UI that drifts off
the palette is arguing against the design system it is built on.

> The current `src/App.tsx` breaks this rule — it uses `bg-neutral-950 text-neutral-100`.
> That is scaffold left over from the Vite template. Replace it, don't copy it.

`Block` (from `src/primitives.tsx`) is still correct where you want token-driven layout or
`_hover`/`_focus` states. Tailwind is for the page scaffolding around it.

**Toasts are an open decision.** Blend ships `SnackbarV2`, called as `addSnackbarV2()` — not
as a component. If you want a different look, note that `SnackbarV2` *is*
[sonner](https://github.com/emilkowalski/sonner) underneath (it wraps `sonnerToast.custom()`
with `unstyled: true` around its own markup), so installing sonner directly and drawing your
own body keeps the same engine. Either is fine; pick one and put it in one file. Do not have
two toast systems.

### 2. Source is truth. Never trust Blend's README, its docs site, or your training data.

Before using any component, read its types at
`node_modules/@juspay/blend-design-system/lib/components/<Name>/*.types.ts`.

To settle "is X exported from the package root?":

```bash
node -e "import('@juspay/blend-design-system').then(m=>console.log('X' in m))"
```

⚠️ That command **throws** — `TypeError: Cannot read properties of undefined (reading 'Color')`.
Blend's bundle inlines two Highcharts UMD wrappers where the core does
`window._Highcharts = …` and a dependent module reads `window._Highcharts.Color`; with no
`window`, the read misses the write. This does not affect this app (rule 5), but it does mean
you cannot introspect the package from Node. Grep `dist/main.d.ts` for the export list
instead:

```bash
grep -o "declare const [A-Za-z0-9_]*" node_modules/@juspay/blend-design-system/dist/main.d.ts
```

The five things that will bite you every time:

- **No `className`, no `style`.** 38 type files `Omit` them. Tailwind goes on a wrapper you
  own, never on the Blend element.
- **V2 grouped flat props into objects — inconsistently.** `error: {show, message}`,
  `search: {show, placeholder}`, `menuPosition`/`menuDimensions`/`triggerDimensions`,
  `leftSlot: {slot, maxHeight}`. But `MultiValueInputV2`, `OTPInputV2` and `SearchInputV2`
  kept V1's flat shape.
- **`subLabel` vs `sublabel` vs `label.subtext`** — three spellings ship, and the wrong one
  fails silently. Same for `helpIconText` vs `helpIconHintText`.
- **`skeleton` has five different shapes.** Read the type; do not copy from a sibling.
- **Establish data-driven vs composition-only first.** `Tabs` takes `items`; `TabsV2` walks
  children. `Timeline` and `DrawerV2` are composition-only. `Snackbar` is neither — you call
  `addSnackbarV2()`.

**The `blend-design-system` MCP server is discovery, not authority.** Wire it up via
`.mcp.json` (appendix D). Its manifest is pinned at `blendPackageVersion: 0.0.36`, generated
before 0.0.37 shipped, and holds 50 components — **every one of them V1**. No `*V2` entry
exists at all, and `Sidebar` is missing outright.

| Tool | Verdict |
|---|---|
| `get_theme_tokens` | **Yes.** Values check out against 0.0.37. Its `spacing` is `FOUNDATION_THEME.unit`, its `borders` is `border.width`/`border.radius`. |
| `list_blend_components`, `search_components` | **Yes**, for "does Blend have anything for X?" Then confirm the real name against the install. |
| `get_component_composition` | Cross-check only. Compound shapes are stable; names may not be. |
| `get_blend_component_props`, `get_component_variants`, `generate_blend_component`, `scaffold_blend_section`, `validate_component_usage`, `generate_component_documentation` | **No.** V1-only and a version behind — they emit deprecated JSX and flag valid V2 props as invalid. Ask `get_component_variants` about `StatCard` and it answers `LINE\|PROGRESS_BAR\|BAR\|NUMBER`; V2 is `CHART\|PROGRESS_BAR\|NUMBER` and `LINE`/`BAR` do not exist. |

Re-check this table the day `blend-ui-mcp` ships a manifest whose `blendPackageVersion`
matches the install and includes V2 — most of the No row moves then.

### 3. The published package is not the GitHub repo, even at the same version.

npm `0.0.37` ships 81 component directories; the repo's `0.0.37` has 86. `EmptyState`,
`SelectListV2`, `SingleDatePicker`, `Spinner` and `TimePicker` exist on GitHub and not here.
So does `NavbarItem.id`. Reading the repo to understand a component is fine; writing code
against it is how you get `TS2353`. **Check the install.**

### 4. V2 first.

The authority is `v1TokenReplacementMap` in `lib/hooks/useResponsiveTokens.ts` — 34 pairs,
plus `ButtonGroup` and `CodeEditor` which carry a `@deprecated` barrel but no token slot.
36 real pairs. Rendering a V1 logs, once per component:

> `[Blend] Button is a v1 component and will be deprecated soon. Please migrate to ButtonV2.`

Absence of that warning is **not** evidence of V2 — `ButtonGroup` and `CodeEditor` never emit
it.

**V1 is the only option for:** `DataTable`, `DateRangePicker`, `Slider`, `Badge`, `Skeleton`,
`CodeBlock`, `Directory`, `SplitTag`, `VirtualList`, `AvatarGroup`, `DropdownInput`,
`UnitInput`. Using those is correct, not a regression.

### 5. There is no client/server split here. Do not invent one.

Blend cannot be evaluated in Node (rule 2). In a Next.js app that forces a whole apparatus:
`"use client"` on every file, `next/dynamic` with `ssr: false`, a two-file shape per route, a
styled-components SSR registry. **None of that applies to this repo** and none of it should be
added.

Concretely, if you find yourself writing any of these, stop:

- a `"use client"` directive (meaningless — there is no server)
- `clientOnly()` / `next/dynamic` / `ssr: false` wrappers
- a second file per route whose only job is to be a boundary
- `transpilePackages`, `compiler.styledComponents`, or any Next config

The one thing that carries over: **if this app ever adds SSR or prerendering** (SSG via
`vite-plugin-ssr`, a move to a meta-framework, a prerender step in CI), the Highcharts crash
in rule 2 becomes live and every Blend surface needs a client-only boundary. Re-read this rule
then.

### 6. Typography goes through `font()` from `src/primitives.tsx`.

Pass the whole scale entry, never a bare `.fontSize`:

```tsx
<PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={…}>
```

`PrimitiveText` has no line-height default, so passing only `.fontSize` — which is what
Blend's own docs show — silently drops the token's leading: 14px body renders at ~17px
instead of 20px.

`lineHeight` **must** be px-suffixed. styled-components lists `lineHeight` as a unitless CSS
property, so a bare `20` emits `line-height: 20` — *twenty times* the font size. `font()`
handles this.

Token names have no `spacing`, `borderRadius` or `fontSize` top-level key. It's `.unit[16]`,
`.border.radius[8]`, `.font.size.body.md`, `.font.weight[600]`.

### 7. Charts must set `colors` from the token ramps.

Blend tokenises axes and gridlines but never sets a series palette, so without it charts
render in Highcharts' stock `#2caffe`/`#544fc5`.

**Never pass a Highcharts key as `undefined`.** The merge onto Blend's defaults is shallow, so
`plotOptions: undefined` wipes the defaults and Highcharts dies reading `plotOptions.column`.
Spread the key in conditionally.

**`ChartContainerV2` has zero padding.** Put the chart in a
`<div className="flex flex-col gap-6 p-4">` or it sits 1px from the card border and the axis
titles clip. And `mergeChartOptions` force-sets `xAxis.labels.y`, the tick lengths and the
legend symbol *after* your options, so setting those does nothing.

### 8. One page shell, in one file. Never hand-roll `SidebarV2` per page.

Build a single `src/shell.tsx` exporting a `DashboardShell`, and render every page inside it.
`SidebarV2` is easy to use wrongly — all eight of these are verified against 0.0.37's source:

1. **It renders its OWN topbar internally** and passes a `topbar` prop into it
   (`SidebarV2.tsx:451-466`). So `topbar` takes heading *content*, not a `<TopbarV2>` —
   passing one stacks two chromes, two borders, 48px inside 48px. On desktop that slot is the
   whole story: `TopbarV2.tsx:354` is `<Block flexGrow={1}>{topbar}</Block>` and that is the
   entire desktop branch, so your topbar content does its own left/right layout inside it.
2. **Selection is driven by `isSelected`, NOT the `activeItem` prop.** `isSelected` wins
   unconditionally when set (`NavItem.tsx:300-304`), and the mobile nav reads only `isSelected`
   (`MobileNavigationItem.tsx:12`) — `activeItem` alone leaves the mobile bar unhighlighted.
   Both props exist; only one works everywhere.
3. **Nav items need `href` AND `onClick`.** `NavItem.tsx:352` calls `preventDefault()` on every
   plain left click and does no routing of its own — `href` alone navigates nowhere. It still
   earns its place: cmd/ctrl-click bails out early and opens the real URL.
4. **`showOnMobile: true` is mandatory.** Without it the mobile nav array is empty while the
   desktop nav is `display:none`, leaving no navigation at all from 320px to 1024px.
5. **`rightActions` is dead on desktop** — only the mobile branch renders it
   (`TopbarV2.tsx:317-323`). Use it *because* of that: below `lg` the `topbar` node is not
   rendered at all, so `rightActions` is the only way to keep a control on screen beside the
   mobile merchant switcher. Anything that must appear on desktop goes inside `topbar`.
6. **`sidebarCollapseKey` defaults to `"/"`**, which hijacks the slash key anywhere outside a
   form field. Set it to something else (`"["`) so a stray keystroke can't collapse the
   sidebar mid-demo.
7. **Nav item identity is the *label string*.** `NavbarItem` has no `id` in the published
   0.0.37 (rule 3) — passing one is a type error. So a copy edit to a label is also an identity
   change (expansion state, virtualizer keys, data attributes). Keep labels unique.
8. **The sticky bar is guarded on `topbar`.** `SidebarV2.tsx:439` wraps the whole thing in
   `{topbar && …}`, so passing nothing removes the bar entirely rather than leaving an empty
   one.

**Page content scrolls the internal `[data-main-content]` element, not the window.**
`window.scrollTo` and default-root `IntersectionObserver`s will silently do nothing.

**Every page opens with a `PageHeader`** — title, optional description, `actions` on the
right. Blend has no page-header component, so this is a rule 13 composition; write it once in
`src/page-header.tsx`. A page's CTA goes in `PageHeader actions`, never in the topbar — the
topbar is app-level chrome.

**A full-screen takeover is a legitimate exception to the shell**, for a flow that is one
decision at a time and where app nav beside it is an invitation to leave: no sidebar, a bar
with a ✕ and the flow's title, content centred. Two things follow. That bar is `TopbarV2` used
**standalone**, which is the one place a `<TopbarV2>` is correct — the ban in trap 1 is on
handing one to `SidebarV2`. And it should scroll **its own content element**, not the window,
with the bar as that element's sibling, so scrolling the form leaves the chrome still.

### 9. When you add routing, one registry is the only place a route is registered.

This repo has **no router today**. When one goes in, do not hand-maintain a nav tree beside
it: write `src/registry.tsx` as one row per route — `id`, `label`, `href`, `description`,
`icon` — and derive both the sidebar and any overview grid from it.

```tsx
export type AppRoute = {
  /** Stable identity, deliberately not the href — a route can move without becoming a
      different route. Used for React keys. */
  id: string;
  /** Sidebar label. Keep unique — it *is* nav item identity (trap 7 above). */
  label: string;
  href: string;
  /** One line, for an overview card. */
  description: string;
  icon: ReactNode;
};
```

Adding a route is then two steps: write the page, add a row. **Never add a nav item by hand.**
A hand-maintained nav and hand-maintained routing drift the moment there is more than a
handful of routes — a nav item pointing at nothing, or a route nothing links to. One list both
sides read can't drift.

### 10. Design language.

From Blend's own `DESIGN.md` §7:

- 4px spacing grid
- radius **8** for buttons and inputs, **12** for cards and menus, **16** for modals
- `gray.950`/`gray.900` for text, never `#000`
- body text minimum `gray.500` (`gray.400` is placeholders and disabled only)
- no shadow above 0.07 opacity
- only the seven palettes: gray, primary, purple, orange, red, green, yellow
- no gradients, text shadows or background patterns

**Weight is the one place to override `DESIGN.md`, deliberately.** Blend says 400 body. Set
**body copy to 500** and every heading — page, section, and rail headings inside a section —
to **600**.

You do not write the 500. `font()` in `src/primitives.tsx` emits it, so a `PrimitiveText` that
says nothing about weight is medium; a `fontWeight` prop *after* the spread overrides it,
which is how 600 headings are written. Put the prop **before** the spread and it silently
loses — TypeScript catches this as `TS2783`.

`font()` covers everything *you* draw. Everything **Blend** draws reads its weight from a
token slot, so remap the foundation's 400 slot to 500 in your theme setup — one line against
~70 component token files, and it cannot drift as components are added. Only that slot moves;
500 and 600 are already themselves.

Three texts in Blend reach `PrimitiveText`'s own 400 default instead of a token, and no token
can reach them — `Timeline`'s node description, byline and datetime, whose slots have no
`fontWeight` key at all. Pass your own markup into the openings Blend leaves (`children`,
`datetimeRightSlot`) rather than living with it. If you meet a stubborn 400 elsewhere, that is
the shape of the fix: read the token *type* first, and compose your own only where the slot
genuinely has nowhere to put a weight.

### 11. Icons: `lucide-react`.

What Blend itself uses. `npm i lucide-react`.

**An icon in an *input* slot is `FOUNDATION_THEME.colors.gray[400]`** — the placeholder colour
(`InputsV2/TextInputV2/TextInputV2.light.tokens.ts:81`). Lucide defaults to `currentColor`,
and what a slot inherits is the *value* colour, so an untinted search glyph reads as black
shouting beside grey text. Applies to `TextInputV2`, `SearchInputV2` and the selects. Button,
alert and menu slots keep inheriting, which is correct — there the icon and the label are one
thing.

### 12. `@juspay/blend-design-system/style.css` is imported, and only just.

It is 266 KB of almost entirely monaco-editor CSS. It is already in `src/main.tsx` and it
needs to stay if anything uses `Drawer`/`DrawerV2` (for its vaul patches) or
`CodeEditor`/`CodeEditorV2`. If nothing does, dropping it is a real win — check before you
assume.

Blend ships **no CSS reset** — `dist/style.css` contains zero `html`/`body` selectors.
Tailwind's Preflight covers box-sizing and margins; `html, body { height: 100% }` is on you.

Note the ordering: Tailwind's Preflight resets `button` to transparent with no border, and
Blend styles its buttons with styled-components, whose `<style>` tags are injected into
`<head>` after your stylesheet. Blend wins on source order. If a Blend control ever renders
unstyled, that ordering is the first thing to check — not `!important`.

### 13. Escape hatch, narrow and visible.

If Blend genuinely has no component for something, compose it from `Block` + `PrimitiveText` +
tokens and leave a `// blend-gap:` comment naming what was missing. **Never silently invent a
component.**

### 14. Motion comes from `src/motion.ts`. Three gestures, and they are not the same.

| Gesture | Values | Used by |
|---|---|---|
| Something covers your work — modal, sheet, popover | `OVERLAY_MS` 300, `OVERLAY_IN` entering, `OVERLAY_OUT` leaving | a custom sheet/drawer, and Blend's own `ModalV2` |
| A page or step arrives | `PAGE_MS` 260, `PAGE_EASING` | a `.page-enter` keyframe in your global CSS |
| Feedback inside a page — a result, a row ticking over, a press | `FEEDBACK_MS` 200 / `MICRO_MS` 150, `FEEDBACK_EASING` | any inline state change that should read as responsive rather than played at the user |

The overlay values are **Blend's**, copied from `ModalV2/modalAnimationV2.tsx:3-5`. That is
the one timing you cannot change — it is baked into every `ModalV2` you render — so a
hand-built sheet matches it rather than adding a third opinion. Two curves and not one because
entering and leaving are different: a panel arrives deliberately and dismisses gently.

**Animate a mount with `@keyframes`, never a transition between two states set a frame apart.**
`setState` → `requestAnimationFrame` → `setState` is a race, and the usual loser is the
animation: the callback beats React's commit, the element's first paint is already at its final
value, and it appears instead of moving. It fails *intermittently*, which is worse than
failing. A keyframe on a freshly mounted element starts at `from` whenever the frame lands.

So the shape for anything that has to animate out before it unmounts:

- one `rendered` flag, set **during render** (`if (open && !rendered) setRendered(true)`) —
  React's documented adjust-state-while-rendering;
- `data-state={open ? "open" : "closed"}` on the animated nodes, with the keyframes in your
  global CSS keyed off it;
- unmount from `onAnimationEnd`, guarded with `event.target !== event.currentTarget`, since
  `animationend` bubbles and any child can fire one. No `setTimeout` kept in sync by hand.

Every overlay honours `prefers-reduced-motion` — and its *exit* keeps a 1ms animation rather
than `animation: none`, or `onAnimationEnd` never fires and the panel stays mounted forever.

---

## Before you call it done

```bash
npm run lint && npm run build
```

`build` runs `tsc -b` before `vite build`, so that covers typechecking. Then load the page and
**check the browser console**.

Walk your new component in **both** Blend versions if the app exposes a V1/V2 switch. A page
that renders nothing looks identical to a page you never opened.

### The console baseline

`src/suppress-blend-noise.ts` (appendix C) filters known-upstream Blend noise — narrowly, by
format string *and* args, so the same warnings about *your* code still surface. Anything it
does not filter is yours.

**Expected remaining warnings, left alone on purpose:** a Highcharts accessibility notice, and
`[Blend] … is a v1 component`. That one is signal — it tells you a V1 component is rendering —
so muting it would cost more than it saves.

**Five of those V1 warnings are permanent, and none of them are yours.** The warning fires from
`useResponsiveTokens.ts:57`, which runs only when a real V1 *component* claims its token slot —
a V1 utility import never triggers it. Traced against 0.0.37:

| Warning | Emitted by | Where you see it |
|---|---|---|
| `SingleSelect` | `TopbarV2` renders V1 `SingleSelect` | `SidebarV2` renders `TopbarV2` — **every page** |
| `Tooltip` | `SelectV2` renders V1 `Tooltip` | under every `SingleSelectV2`/`MultiSelectV2`; also `MenuV2`, and `StatCardV2` whenever given `helpIconText` |
| `ProgressBar` | `StatCardV2` renders V1 `ProgressBar` (`StatCardV2.tsx:16-19`, used at :293) | any `StatCardV2` with `variant={PROGRESS_BAR}` |
| `MultiSelect` | `DataTable` renders V1 `MultiSelect` | any page with a table |
| `Popover` | `DataTable` renders V1 `Popover` | same |

None of these can be removed by migrating an import — there is nothing in your code to
migrate. `DataTable` has no V2 at all (rule 4), and the other three are V1 components rendered
*inside* V2 ones, where no prop reaches the choice.

These five are the baseline. The check for whether a **sixth** warning is yours: no file you
write should import a V1 component that has a V2 pair. Rule 4 lists the V1-only components,
which are the legitimate exceptions. A warning naming anything else is a real regression.

---

## Tooling worth knowing about

- **`npx -y blend-ui-mcp`** — Blend publishes an MCP server serving the real component
  manifest. It exists precisely to stop agents inventing APIs, which is the failure mode rule 2
  is written against. Note its generator scans V1 directories, so it lags on V2 (rule 2's
  table).
- **`npx blend-telemetry --dir .`** — scans this repo and reports component adoption, prop
  usage and V1→V2 migration progress.

---

## Appendix A — `src/primitives.tsx`

`Block` is Blend's real layout primitive — 258 files inside the library import it, and there
are 1354 `<Block` usages versus 8 uses of raw `styled.div`. But it is **not** among the
package root's exports; it exists only as raw `.tsx` under `lib/components/Primitives/`.

**Reaching it needs an alias, and you must verify it builds before depending on it.** These
are raw `.tsx` files inside `node_modules`, which Vite and `tsc` do not process by default.

`vite.config.ts`:

```ts
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      'blend-primitives': fileURLToPath(
        new URL(
          './node_modules/@juspay/blend-design-system/lib/components/Primitives',
          import.meta.url,
        ),
      ),
    },
  },
})
```

`tsconfig.app.json` → `compilerOptions`:

```jsonc
"baseUrl": ".",
"paths": {
  "blend-primitives/*": ["./node_modules/@juspay/blend-design-system/lib/components/Primitives/*"]
}
```

⚠️ **Verify with `npm run build` before writing code against this.** Two things can go wrong:
`tsc -b` will typecheck Blend's raw `.tsx` against this repo's stricter flags
(`noUnusedLocals`, `erasableSyntaxOnly`, `verbatimModuleSyntax`) and may report errors in
library code; and Vite's dep optimizer may need `optimizeDeps.exclude` for the aliased path.
**If it fights you, drop the alias.** Rule 1 already prefers Tailwind for layout — `Block` is
worth having for `_hover`/`_focus` and token-driven layout, not worth a broken build.

```tsx
import { FOUNDATION_THEME } from '@juspay/blend-design-system'

export { default as Block } from 'blend-primitives/Block/Block'
export type { BlockProps } from 'blend-primitives/Block/Block'
export { default as PrimitiveText } from 'blend-primitives/PrimitiveText/PrimitiveText'
export type { TextProps as PrimitiveTextProps } from 'blend-primitives/PrimitiveText/PrimitiveText'

/**
 * Apply a whole Blend type token to PrimitiveText — see rule 6.
 *
 * Blend's type scale entries are `{ fontSize, lineHeight, letterSpacing }` as unitless
 * numbers. Passing only `.fontSize` leaves line-height at the browser default (~1.2x)
 * instead of the designed leading.
 *
 * lineHeight MUST be px-suffixed: styled-components lists lineHeight as a unitless CSS
 * property, so a bare `20` emits `line-height: 20` — twenty times the font size.
 *
 * letterSpacing is intentionally omitted: every value in the scale is 0, and PrimitiveText
 * already defaults it to 'normal'.
 *
 * It also carries the weight, and the weight is 500 (rule 10). PrimitiveText defaults
 * fontWeight to 400, so every text node that said nothing would otherwise be regular.
 * A `fontWeight` prop *after* the spread still wins — that is how headings take 600.
 */
type FontToken = {
  // Blend types these as CSSObject values, so they widen even though every value in the
  // shipped scale is a plain number.
  fontSize?: number | string
  lineHeight?: number | string
}

export function font({ fontSize, lineHeight }: FontToken) {
  return {
    fontSize,
    lineHeight: typeof lineHeight === 'number' ? `${lineHeight}px` : lineHeight,
    fontWeight: FOUNDATION_THEME.font.weight[500],
  }
}
```

## Appendix B — `src/motion.ts`

```ts
/**
 * Every duration and curve the app animates on, in one place. See rule 14.
 */

/**
 * Overlay motion — modals, sheets, anything over a scrim.
 *
 * Copied from Blend's `ModalV2/modalAnimationV2.tsx:3-5`, which is the one set of values we
 * cannot change: it styles ModalV2 through styled-components and exports only
 * ANIMATION_DURATION. Re-check them if Blend's modal timing ever moves.
 */
export const OVERLAY_MS = 300
/** Entering. Slow out of the gate, so the panel reads as arriving rather than being thrown. */
export const OVERLAY_IN = 'cubic-bezier(0.16, 0, 0.3, 1)'
/** Leaving. Gentler than the entry — a dismissal should not snap away from you. */
export const OVERLAY_OUT = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

/**
 * Page and step arrivals. Shorter than an overlay because nothing has to be dismissed: it is
 * the page you asked for, and the animation says it changed.
 */
export const PAGE_MS = 260
export const PAGE_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)'

/**
 * Feedback inside a page — a result arriving, a row ticking over, a control acknowledging a
 * press. ease-out-cubic: everything here is an element *entering*, and ease-out puts the
 * acceleration at the start, which reads as responsive rather than played at you.
 */
export const FEEDBACK_MS = 200
export const MICRO_MS = 150
export const FEEDBACK_EASING = 'cubic-bezier(0.215, 0.61, 0.355, 1)'
```

## Appendix C — `src/suppress-blend-noise.ts`

Import this as the **first** line of `src/main.tsx`, above every Blend import — Blend emits its
`forwardRef` error at module evaluation.

```ts
/**
 * Dev-only filter for known-upstream console noise from Blend 0.0.37.
 *
 * These are real bugs, but they are inside the library and unfixable from here. Left alone
 * they train you to ignore the console — and then you miss a real error.
 *
 * Each rule matches the format string PLUS, where it helps, the specific arguments, so the
 * same warning about *our* code still gets through. Nothing here is a blanket mute.
 *
 * To check whether Blend has fixed these: delete this file and its import, then reload.
 */

type Rule = {
  /** Substring of the console format string (args[0]). */
  match: string
  /** All of these must appear in the remaining args. Narrows the rule to one known case. */
  args?: string[]
  why: string
}

const SUPPRESSED: Rule[] = [
  {
    match: 'forwardRef render functions accept exactly two parameters',
    why:
      'AlertV2.tsx:249, ChatInputV2.tsx:37 and MultiValueInputV2.tsx:44 call ' +
      'forwardRef((props) => …) with one parameter. React validates arity at definition ' +
      'time, so importing Blend at all triggers this — on every page.',
  },
  {
    match: 'React does not recognize the `%s` prop on a DOM element',
    args: ['enableVirtualization'],
    why:
      'SingleSelectV2.tsx:180 passes enableVirtualization to MobileSingleSelectV2, which ' +
      'never destructures it, so it lands in ...rest and is spread onto a DOM button. ' +
      'Fires below 1024px wherever a SingleSelectV2 renders in panel mode.',
  },
  {
    match: 'React does not recognize the `%s` prop on a DOM element',
    args: ['outlineOffset'],
    why:
      'StepStatusCircle.tsx:27 passes outlineOffset to a Block. Block declares it in its ' +
      'props and applies it in getStyles, but its shouldForwardProp allowlist ' +
      '(Block.tsx:181) contains only `outline` — so it is forwarded to the DOM. Fires ' +
      'wherever a StepperV2 renders.',
  },
]

/**
 * console.warn is a different bar. Both of these come out of code Blend ships pre-bundled,
 * so there is no version of this repo that does not emit them — and both are
 * NODE_ENV-guarded upstream, so neither ships in a production build.
 *
 * - motion() — dist/main.js calls the deprecated motion(Component) factory rather than
 *   motion.create(). Nothing here can change the call.
 * - several instances of styled-components — Blend declares styled-components a
 *   peerDependency and bundles a copy into dist/main.js anyway, so the package root and the
 *   raw lib/** primitives (appendix A's alias) each carry one. An inlined copy cannot be
 *   deduped by a bundler. If you skip the Block alias entirely, this one goes away.
 */
const SUPPRESSED_WARNINGS: Rule[] = [
  {
    match: 'motion() is deprecated',
    why: "Blend's dist calls the deprecated motion(Component) factory. Not reachable from here.",
  },
  {
    match: "several instances of 'styled-components'",
    why:
      'Blend bundles styled-components into dist while also declaring it a peer, so the ' +
      'package root and the lib/** primitives each carry one. Unfixable downstream.',
  },
]

if (import.meta.env.DEV) {
  const matches = (rules: Rule[], args: unknown[]) => {
    const format = typeof args[0] === 'string' ? args[0] : ''
    const rest = args.slice(1).map(String)
    return rules.some(
      (rule) =>
        format.includes(rule.match) &&
        (rule.args ?? []).every((needle) => rest.includes(needle)),
    )
  }

  const originalError = console.error
  console.error = (...args: unknown[]) => {
    if (matches(SUPPRESSED, args)) return
    originalError(...args)
  }

  const originalWarn = console.warn
  console.warn = (...args: unknown[]) => {
    if (matches(SUPPRESSED_WARNINGS, args)) return
    originalWarn(...args)
  }
}

export {}
```

## Appendix D — `.mcp.json`

```json
{
  "mcpServers": {
    "blend-design-system": {
      "command": "npx",
      "args": ["-y", "blend-ui-mcp"]
    }
  }
}
```

Read rule 2's table before trusting any of its tools.
