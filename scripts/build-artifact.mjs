#!/usr/bin/env node
/**
 * Bundle the built app into a single self-contained HTML file.
 *
 * Artifact hosting applies a strict CSP that blocks every external request, and
 * wraps the file it is given in its own <!doctype>/<head>/<body>, so the output
 * here is page content only — no <html> or <body> tags of its own — with the
 * stylesheet and the JS bundle inlined rather than linked.
 *
 * Run after `npm run build`. Writes dist/sideline.html.
 */

import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const ASSETS = join(DIST, 'assets')

function readOnly(extension) {
  const matches = readdirSync(ASSETS).filter((name) => name.endsWith(extension))
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one ${extension} in dist/assets, found ${matches.length}. `
      + 'Run `npm run build` first, and clear dist if it has stale output.',
    )
  }
  return readFileSync(join(ASSETS, matches[0]), 'utf8')
}

const css = readOnly('.css')
const js = readOnly('.js')

/**
 * A literal `</script` anywhere in the bundle would close the tag early. It can
 * legitimately appear inside a JS string, so neutralise it.
 */
const safeJs = js.replace(/<\/script/gi, '<\\/script')

const html = `<title>Sideline — Field Hockey Manager</title>
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="theme-color" content="#080d17" />
<style>
${css}

/* The host page supplies its own body; make sure the app still owns the full
   viewport and paints its own ground rather than borrowing the host's theme. */
html, body { height: 100%; margin: 0; background: #080d17; }
#root { min-height: 100%; }
</style>
<div id="root"></div>
<script type="module">
${safeJs}
</script>
`

const out = join(DIST, 'sideline.html')
writeFileSync(out, html)

const kb = (n) => `${Math.round(n / 1024)}KB`
console.log(`Wrote ${out}`)
console.log(`  css ${kb(css.length)} + js ${kb(js.length)} = ${kb(html.length)} total`)
