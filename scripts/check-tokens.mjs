/**
 * Report how src/tokens/ differs from the defaults the installed Blend currently ships.
 *
 *   npm run tokens:check
 *
 * Two different things show up here and they look identical, which is the point:
 *
 *   - a value someone edited on purpose, to override Blend — expected, and the diff is the
 *     record of what this app changes;
 *   - a value Blend moved in a version bump that nobody here has looked at — silently stale,
 *     and the only reason this script exists.
 *
 * So a non-empty diff is not a failure. It is a list to read. Exits 1 so CI notices, and
 * `--quiet` reports counts only.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CURRENT = 'src/tokens'
const fresh = mkdtempSync(join(tmpdir(), 'blend-tokens-'))

try {
  execFileSync('node', ['scripts/gen-tokens.mjs', '--out', fresh], { stdio: 'pipe' })

  // Compare after Prettier, so formatting is never mistaken for a value change.
  execFileSync(
    'npx',
    ['prettier', '--no-semi', '--single-quote', '--print-width', '100', '--write', `${fresh}/*.ts`],
    { stdio: 'pipe' },
  )

  const files = readdirSync(fresh).filter((f) => f.endsWith('.ts'))
  const drifted = []
  const missing = []

  for (const file of files) {
    let current
    try {
      current = readFileSync(join(CURRENT, file), 'utf8')
    } catch {
      missing.push(file)
      continue
    }
    const generated = readFileSync(join(fresh, file), 'utf8')
    if (current === generated) continue

    // Count only the lines that carry a value, so a reworded header comment is not noise.
    const lines = (text) => text.split('\n').filter((l) => !l.trim().startsWith('*'))
    const a = lines(current)
    const b = lines(generated)
    const changed = a.filter((l, i) => l !== b[i]).length
    if (changed) drifted.push({ file, changed })
  }

  const quiet = process.argv.includes('--quiet')

  if (missing.length) {
    console.log(`missing from ${CURRENT} — run \`node scripts/gen-tokens.mjs\`:`)
    for (const f of missing) console.log(`  ${f}`)
  }

  if (!drifted.length && !missing.length) {
    console.log(`${files.length} token trees match the installed Blend defaults exactly.`)
    process.exit(0)
  }

  if (drifted.length) {
    console.log(`\n${drifted.length} of ${files.length} token trees differ from the defaults:\n`)
    for (const { file, changed } of drifted) {
      console.log(`  ${file.padEnd(22)} ${changed} line${changed === 1 ? '' : 's'}`)
    }
    if (!quiet) {
      console.log('\nTo see them:')
      console.log(`  node scripts/gen-tokens.mjs --out /tmp/blend-tokens`)
      console.log(`  npx prettier --no-semi --single-quote --print-width 100 -w '/tmp/blend-tokens/*.ts'`)
      console.log(`  diff -ru ${CURRENT} /tmp/blend-tokens`)
    }
    console.log(
      '\nEach one is either an override this app means to have, or a default Blend moved.\n' +
        'Read them before assuming the first.',
    )
  }
  process.exit(1)
} finally {
  rmSync(fresh, { recursive: true, force: true })
}
