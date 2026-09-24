/**
 * Generate the component-token scaffold in src/tokens/ from the INSTALLED Blend source.
 *
 * Not from the docs site. Its `ButtonV2TokensType` carries `focusRing` and `slotMaxHeight`,
 * neither of which exists in the installed 0.0.37 — a tree transcribed from it would not
 * typecheck. `lib/components/<Name>/<name>.light.tokens.ts` is what the running code reads.
 *
 *   node scripts/gen-tokens.mjs [--out <dir>]
 *
 * `npm run tokens:check` runs this into a temp directory and diffs, so a Blend upgrade that
 * moves a default fails loudly instead of leaving a stale value silently pinned here.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const LIB = 'node_modules/@juspay/blend-design-system/lib'
const COMPONENTS = join(LIB, 'components')

/**
 * The components this app actually renders and overrides a token on.
 *
 * V2 throughout bar one: `Drawer`, which has no V2 worth using (DrawerV2 ships no tokens at
 * all — see ConfigDetailSheet.tsx) and so is the V1 exception rule 4 allows.
 */
const RENDERED = [
  'AccordionV2',
  'AlertV2',
  'AvatarV2',
  'ButtonV2',
  'CardV2',
  'SelectorV2/CheckboxV2',
  'MenuV2',
  'ModalV2',
  'PopoverV2',
  'ProgressBarV2',
  'SidebarV2',
  'SingleSelectV2',
  'SelectorV2/SwitchV2',
  'TabsV2',
  'TagV2',
  // V1, and the second exception rule 4 allows: MultiValueInputV2 renders V1 Tag for its
  // value chips (MultiValueInputV2.tsx:246) and its `tags` prop carries no colour key, so
  // the token tree is the only way to reach them. Nothing in this app renders Tag directly.
  'Tags',
  'InputsV2/TextInputV2',
  'TopbarV2',
  'Drawer',
]

/**
 * Responsive token types the package root does not re-export, and what a generated file
 * should say instead.
 *
 * Only Drawer so far: its index publishes the components and `DrawerTokensType` and stops
 * short of `ResponsiveDrawerTokens`. The breakpoint map is the type's whole content
 * (`{ [key in BreakpointType]: DrawerTokensType }`), so spelling it out is structurally the
 * same type — and it typechecks against the ComponentTokenType slot, which is the test that
 * matters.
 */
const TYPE_FALLBACK = {
  ResponsiveDrawerTokens: {
    type: "Record<'sm' | 'lg', DrawerTokensType>",
    imports: ['DrawerTokensType'],
  },
  // Tags publishes neither ResponsiveTagTokens nor TagTokensType from the package root, and
  // the deep path into lib/ carries no declarations (TS2307). The slot on ComponentTokenType
  // is the same type by construction — initComponentTokens resolves TAGS as
  // `componentTokens.TAGS ?? getTagTokens(…)` — and it is exported, so it is read from there.
  ResponsiveTagTokens: {
    type: "NonNullable<ComponentTokenType['TAGS']>",
    imports: ['ComponentTokenType'],
  },
}

/** SLOT name ← the responsive token type it is declared with, read out of ThemeContext. */
const slotsByType = new Map()
for (const line of readFileSync(join(LIB, 'context/ThemeContext.tsx'), 'utf8').split('\n')) {
  const m = line.match(/^\s+([A-Z_0-9]+)\??:\s*(Responsive\w+)/)
  if (m) slotsByType.set(m[2], m[1])
}

/** Read a balanced bracketed span starting at `from`. */
function balanced(src, from, open, close) {
  let depth = 0
  for (let i = from; ; i++) {
    if (src[i] === open) depth++
    else if (src[i] === close) depth--
    if (depth === 0) return src.slice(from, i + 1)
  }
}

// TextInputV2 names its parameter `foundationTokens`; everything else uses the singular.
const rewrite = (s) => s.replace(/foundationTokens?\./g, 'FOUNDATION_THEME.')

/**
 * The token tree a getter produces, as source.
 *
 * Three shapes ship in 0.0.37 and all three have to work, because getting it wrong is
 * silent — an extractor that only understands the first emits `{ sm: smTokens }` referencing
 * identifiers that do not exist in the generated file, and that still looks plausible.
 *
 *   1. `=> { return { … } }`                                       most components
 *   2. `=> ({ … })`                                                TopbarV2
 *   3. `=> { const smTokens = { … }; return { sm: smTokens } }`     CardV2, SingleSelectV2
 *
 * Shape 3 keeps its locals — they are hoisted into the generated file, so the tree stays
 * editable in place instead of being flattened into something that no longer resembles the
 * source it came from.
 */
function extract(src, type) {
  const arrow = src.indexOf('=>', src.indexOf(`): ${type}`))
  const after = arrow + 2 + src.slice(arrow + 2).search(/\S/)

  if (src[after] === '(') {
    return { locals: '', tree: rewrite(balanced(src, after, '(', ')').slice(1, -1).trim()) }
  }

  const block = balanced(src, after, '{', '}').slice(1, -1)
  const lastReturn = block.lastIndexOf('return ')
  return {
    locals: rewrite(block.slice(0, lastReturn).trim()),
    tree: rewrite(balanced(block, block.indexOf('{', lastReturn), '{', '}')),
  }
}

const outDir = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : 'src/tokens'
mkdirSync(outDir, { recursive: true })

const generated = []
for (const folder of RENDERED) {
  const dir = join(COMPONENTS, folder)
  // V2 components split light and dark; the V1s ship one tree in `<name>.tokens.ts`.
  const files = readdirSync(dir)
  const file =
    files.find((f) => /\.light\.tokens?\.tsx?$/.test(f)) ??
    files.find((f) => /^[a-z][\w.]*\.tokens\.tsx?$/.test(f))
  if (!file) throw new Error(`no token file in ${folder}`)

  const src = readFileSync(join(dir, file), 'utf8')
  const type = src.match(/\):\s*(Responsive\w+)\s*=>/)?.[1]
  if (!type) throw new Error(`no return type in ${folder}/${file}`)

  const slot = slotsByType.get(type)
  if (!slot) throw new Error(`${type} is not a ComponentTokenType slot`)

  const { locals, tree } = extract(src, type)
  // A short tree is fine when the substance is in hoisted locals (SingleSelectV2 returns
  // `{ sm: baseTokens, lg: baseTokens }`). A short tree with nothing hoisted is not.
  if ((locals + tree).replace(/\s/g, '').length < 80) {
    throw new Error(`extracted tree for ${folder} looks empty — check the getter shape`)
  }

  const stem = folder.split('/').pop()
  const constName = `${slot}_TOKENS`

  // Several trees key their maps off the component's own enums — `[AvatarV2Size.SM]:`,
  // `[TabsV2Variant.BOXED]:`. Those identifiers have to be imported too, or the generated
  // file is syntactically fine and refers to nothing.
  const enums = [...new Set([...(locals + tree).matchAll(/\b([A-Z][A-Za-z0-9]+)\./g)]
    .map((m) => m[1])
    .filter((name) => name !== 'FOUNDATION_THEME'))].sort()

  const fallback = TYPE_FALLBACK[type]
  const typeNames = [...enums.map((e) => e), ...(fallback?.imports ?? [type]).map((t) => `type ${t}`)]

  const header = [
    `import { FOUNDATION_THEME, ${typeNames.join(', ')} } from '@juspay/blend-design-system'`,
    '',
    '/**',
    ` * \`${slot}\` — the complete token tree for this component, at the values 0.0.37 ships.`,
    ' *',
    ` * GENERATED by scripts/gen-tokens.mjs from lib/components/${folder}/${file}. Edit a value`,
    ' * in place to override it; `npm run tokens:check` then reports the difference against the',
    ' * installed default — which is the point. An intentional override shows up, and so does a',
    ' * Blend upgrade that moves a default nobody touched.',
    ' *',
    ' * The whole tree is here because overrides REPLACE rather than merge: initComponentTokens',
    ` * resolves every slot as \`componentTokens.${slot} ?? get…(…)\`, so a partial object`,
    ' * discards everything it does not mention. Never prune paths.',
    ' *',
    ' * ⚠️ Light values. Handing this to ThemeProvider replaces the dark defaults too, so it',
    ' * pins the component to light until a dark tree is generated beside it.',
    ' */',
  ].join('\n')

  const body = `${header}\n${locals ? `${locals}\n\n` : ''}export const ${constName}: ${fallback?.type ?? type} = ${tree}\n`
  writeFileSync(join(outDir, `${stem}.ts`), body)
  generated.push({ stem, slot, constName, lines: body.split('\n').length })
}

const barrel = `/**
 * Every component-token tree this app carries. GENERATED — see scripts/gen-tokens.mjs.
 */
${generated.map((g) => `export { ${g.constName} } from './${g.stem}'`).join('\n')}
`
writeFileSync(join(outDir, 'generated.ts'), barrel)

console.log(generated.map((g) => `  ${g.slot.padEnd(18)} ${g.stem}.ts (${g.lines})`).join('\n'))
console.log(`\n${generated.length} components, ${generated.reduce((n, g) => n + g.lines, 0)} lines`)
