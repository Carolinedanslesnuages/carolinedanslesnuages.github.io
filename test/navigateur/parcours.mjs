// Essai du site dans Chromium : démarrage, commandes, clics, clavier, accessibilité (axe-core).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const URL = process.env.URL || 'http://localhost:4173/';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
let echecs = 0;
const ok = (c, m) => { if (!c) echecs++; console.log((c ? '✅ ' : '❌ ') + m); };
const navigateur = await chromium.launch();
const erreurs = [];
for (const [nom, taille] of [['ordinateur', { width: 1280, height: 900 }], ['telephone', { width: 390, height: 844 }]]) {
  const page = await navigateur.newPage({ viewport: taille, reducedMotion: 'reduce' });
  page.on('pageerror', (e) => erreurs.push(`${nom} : ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && erreurs.push(`${nom} console : ${m.text()}`));
  await page.goto(URL);
  await page.waitForSelector('text=Terminal prêt', { state: 'attached', timeout: 15000 });
  ok(true, `${nom} : démarrage, annonce « Terminal prêt »`);
  const largeur = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok(largeur <= 0, `${nom} : pas de défilement horizontal (${largeur}px)`);
  if (nom === 'ordinateur') {
    await page.fill('#commande', 'cd projets');
    await page.press('#commande', 'Enter');
    await page.waitForTimeout(300);
    ok((await page.textContent('label[for=commande]')).includes('~/projets'), 'cd projets : invite mise à jour');
    ok((await page.textContent('[role=status]')).includes('éléments dans ~/projets'), 'annonce courte de la liste');
    await page.click('.sortie button.entree:has-text("val/")');
    await page.waitForTimeout(300);
    ok((await page.textContent('label[for=commande]')).includes('~/projets/val'), 'clic sur un dossier : on y entre');
    await page.fill('#commande', 'cat READ');
    await page.press('#commande', 'Tab');
    ok((await page.inputValue('#commande')) === 'cat README.md ', 'Tab complète « README.md »');
    await page.press('#commande', 'Enter');
    await page.waitForTimeout(400);
    ok((await page.textContent('.sortie')).includes('# Val'), 'cat README.md affiche le fichier');
    await page.fill('#commande', 'chercher gitleaks');
    await page.press('#commande', 'Enter');
    await page.waitForTimeout(400);
    ok((await page.locator('.sortie mark').count()) > 0, 'chercher : mots surlignés');
    await page.click('.cartouche:has-text("Constance")');
    await page.waitForTimeout(400);
    ok((await page.textContent('.sortie')).includes('> constance'), 'cartouche Constance : résumé affiché');
    await page.click('button[aria-label="Changer la couleur du boîtier"]');
    await page.waitForTimeout(200);
    ok((await page.getAttribute('main.deck', 'data-palette')) === 'menthe', 'touche couleur : coque menthe');
    // Piège clavier : Tab sans rien à compléter doit quitter le champ.
    await page.fill('#commande', 'zzz');
    await page.focus('#commande');
    await page.keyboard.press('Tab');
    ok((await page.evaluate(() => document.activeElement && document.activeElement.id)) !== 'commande', 'Tab sans complétion : le focus sort du champ');
  }
  await page.addScriptTag({ content: axe });
  const r = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
  ok(r.violations.length === 0, `${nom} : axe-core WCAG 2.1 AA, ${r.violations.length} violation(s)`);
  for (const v of r.violations) console.log(`   - ${v.id} (${v.impact}) : ${v.help} · ${v.nodes.length} élément(s) · ${v.nodes[0].target.join(' ')}`);
  await page.close();
}
ok(erreurs.length === 0, `aucune erreur JavaScript${erreurs.length ? ' : ' + erreurs.join(' | ') : ''}`);
await navigateur.close();
if (echecs) process.exit(1);
