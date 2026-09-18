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
  /*
   * The five below are one bug with five names, from V1 Drawer — which is what the report
   * config detail sheet uses, deliberately (see ConfigDetailSheet.tsx for why V1 and not
   * DrawerV2). `StyledContent` is `styled(VaulDrawer.Content)` and takes these as styling
   * props without the `$` prefix styled-components needs to mark a prop transient
   * (DrawerBase.tsx:51-63). Underlying element is a DOM div, so all five are forwarded.
   *
   * Listed one per prop rather than matched loosely, so the same message about a prop *we*
   * leaked still comes through. They fire once per drawer open.
   */
  ...['hasSnapPoints', 'contentDriven', 'customWidth', 'customMaxWidth', 'fullScreen'].map(
    (prop) => ({
      match: 'React does not recognize the `%s` prop on a DOM element',
      args: [prop],
      why:
        `DrawerBase.tsx's StyledContent declares ${prop} as a styling prop without a $ ` +
        'prefix, so styled-components forwards it to the underlying div. Fires whenever a ' +
        'V1 Drawer opens.',
    }),
  ),
  {
    match: 'requires a `DialogTitle` for the component to be accessible',
    why:
      'A false negative, and unreachable from here. radix checks for an element carrying ' +
      "the id *it* generated, but Blend's DrawerTitle overrides that id with a useId of " +
      'its own (DrawerBase.tsx:594) and wires it up through its own accessibility context ' +
      'instead — so the drawer IS labelled (StyledContent gets aria-labelledby, and ' +
      'ConfigDetailSheet also passes an aria-label), radix just cannot see it. Nothing a ' +
      'caller passes can change the id Blend writes.',
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
    match: 'Missing `Description` or `aria-describedby={undefined}`',
    why:
      "radix's other content check, and unreachable for the same reason as the DialogTitle " +
      'one above: Blend\'s DrawerDescription overrides radix\'s generated id with a useId of ' +
      'its own (DrawerBase.tsx:626), so radix cannot find a description whether one is ' +
      'rendered or not. Passing aria-describedby={undefined} — the escape hatch the message ' +
      'names — does not reach it either: DrawerContent resolves that prop against its own ' +
      'accessibility context before forwarding (DrawerBase.tsx:489). Fires on every V1 ' +
      'Drawer open.',
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
