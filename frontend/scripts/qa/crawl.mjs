// Parcourt toutes les routes : erreurs JS, page vide, débordement horizontal, liens morts internes
import { chromium } from '@playwright/test'
const ROUTES = ['/', '/sos', '/communautes', '/c/web', '/emplois', '/emplois/publier', '/certifications', '/skills', '/videos', '/sources', '/apprendre', '/apprendre/dev-web', '/apprendre/dev-web/structure', '/apprendre/dev-web/quiz-js', '/creer', '/templates', '/projets', '/projets/nouvelle', '/decouvrir', '/classement', '/u/moussa-diop', '/systalink', '/impact', '/regles', '/reglages', '/publier', '/admin', '/page-inexistante']
const b = await chromium.launch()
for (const [w, login] of [[1440, true]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: 860 } })
  const p = await ctx.newPage()
  let errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  p.on('console', (m) => m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text()) && errs.push(m.text()))
  await p.addInitScript(() => { localStorage.setItem('dh-tour-done', '1') })
  if (login) {
    await p.goto('http://127.0.0.1:5199/connexion')
    await p.getByRole('button', { name: /sans compte/i }).first().click()
    await p.waitForURL((u) => !u.pathname.startsWith('/connexion'))
  }
  const links = new Set()
  for (const r of ROUTES) {
    errs = []
    await p.goto('http://127.0.0.1:5199' + r, { waitUntil: 'networkidle' }).catch(() => {})
    await p.waitForTimeout(500)
    const info = await p.evaluate(() => ({ text: document.querySelector('main')?.innerText.trim().length ?? 0, overflow: document.documentElement.scrollWidth - window.innerWidth, path: location.pathname, links: [...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')) }))
    info.links.forEach((l) => links.add(l.split('?')[0].split('#')[0]))
    const bad = errs.length || info.text < 40 || info.overflow > 1
    if (bad) console.log(`[${w}${login ? ' connecté' : ''}] ${r} → ${info.path} texte=${info.text} débord=${info.overflow}px ${errs.slice(0, 2).join(' | ')}`)
  }
  console.log(`[${w}${login ? ' connecté' : ''}] ${ROUTES.length} routes vérifiées, ${links.size} liens internes`)
  if (w === 1440 && login) globalThis.LINKS = links
  await ctx.close()
}
// Liens internes, par lots de 20 avec une page neuve (mémoire limitée)
const all = [...globalThis.LINKS].filter((l) => !/^\/(admin|connexion|inscription)/.test(l))
let dead = 0
for (let k = 0; k < all.length; k += 20) {
  const ctx = await b.newContext(); const p = await ctx.newPage()
  await p.addInitScript(() => localStorage.setItem('dh-tour-done', '1'))
  await p.goto('http://127.0.0.1:5199/connexion'); await p.getByRole('button', { name: /sans compte/i }).first().click(); await p.waitForURL((u) => !u.pathname.startsWith('/connexion'))
  for (const l of all.slice(k, k + 20)) {
    await p.goto('http://127.0.0.1:5199' + l, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await p.waitForTimeout(400).catch(() => {})
    const nf = await p.evaluate(() => /introuvable|n’existe pas|n'existe pas|404/i.test(document.querySelector('main')?.innerText ?? '')).catch(() => false)
    if (nf) { dead++; console.log('lien mort :', l) }
  }
  await ctx.close()
}
console.log(`${all.length} liens testés, ${dead} morts`)
await b.close()
