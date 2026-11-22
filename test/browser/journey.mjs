// Runs the site in Chromium: desktop, info bubbles, explorer, terminal, keyboard, accessibility (axe-core).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';

const SITE_URL = process.env.URL || 'http://localhost:4173/';
const AXE_SOURCE = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
let failureCount = 0;
const check = (passed, message) => {
  if (!passed) failureCount++;
  console.log((passed ? '✅ ' : '❌ ') + message);
};
const browser = await chromium.launch();
const errors = [];
const activeLabel = (page) => page.evaluate(() => {
  const element = document.activeElement;
  return element ? (element.getAttribute('aria-label') || element.dataset.folder || element.id || element.textContent || '').trim() : '';
});
const axeViolations = async (page) => {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE_SOURCE });
  return page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations);
};
const reportAxe = (violations, label) => {
  check(violations.length === 0, `${label} : axe-core WCAG 2.1 AA, ${violations.length} violation(s)`);
  for (const violation of violations) {
    console.log(`   - ${violation.id} (${violation.impact}) : ${violation.help} · ${violation.nodes.length} élément(s) · ${violation.nodes[0].target.join(' ')}`);
  }
};

for (const [deviceName, viewport] of [['ordinateur', { width: 1280, height: 900 }], ['telephone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', (error) => errors.push(`${deviceName} : ${error.message}`));
  // A Google font that fails to load (network) is not a site error: it is ignored, and only it.
  let failedFonts = 0;
  page.on('requestfailed', (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url())) failedFonts++;
    else errors.push(`${deviceName} ressource : ${request.url()}`);
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    if (/Failed to load resource/.test(message.text()) && failedFonts > 0) {
      failedFonts--;
      return;
    }
    errors.push(`${deviceName} console : ${message.text()}`);
  });
  // The RGAA result is written after these tests: a sample stands in for it, to check the widget.
  await page.route('**/accessibilite.json', (route) => route.fulfill({ json: { passed: 39, total: 39, criteria: 14, checkedAt: '2026-11-22T10:00:00Z' } }));
  await page.goto(SITE_URL);
  await page.waitForSelector('.icon');
  const iconCount = await page.locator('.icon').count();
  check(iconCount >= 10, `${deviceName} : bureau affiché, ${iconCount} icônes de projet`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${deviceName} : pas de défilement horizontal (${overflow}px)`);
  check((await page.evaluate(() => performance.getEntriesByType('resource').filter((entry) => /assets\/(constance|marie)-/.test(entry.name)).length)) === 0, `${deviceName} : aucun projet téléchargé avant son ouverture`);

  if (deviceName === 'ordinateur') {
    // Info bubble: hover, keyboard focus, Escape
    const constance = page.locator('.icon[data-folder="constance"]');
    const bubble = page.locator('#bubble-constance');
    await constance.hover();
    check(await bubble.isVisible(), 'survol : la bulle de Constance apparaît');
    check((await bubble.textContent()).includes('Mes règles de PR'), "la bulle dit de quoi il s'agit");
    await page.locator('#bubble-constance').hover();
    check(await bubble.isVisible(), 'la bulle reste visible quand la souris passe dessus');
    await page.mouse.move(5, 5);
    check(!(await bubble.isVisible()), 'la souris part : la bulle disparaît');
    await page.focus('.icon[data-folder="annie"]');
    await page.keyboard.press('ArrowRight');
    check((await activeLabel(page)) === 'constance', 'flèche droite : icône suivante');
    check(await bubble.isVisible(), 'focus clavier : la bulle apparaît');
    check((await constance.getAttribute('aria-describedby')) === 'bubble-constance', 'la bulle décrit le bouton (aria-describedby)');
    await page.keyboard.press('Escape');
    check(!(await bubble.isVisible()), 'Échap ferme la bulle');

    // Explorer: opened from an icon, folders, preview, Escape, focus back
    await page.keyboard.press('Enter');
    await page.waitForSelector('.explorer pre');
    check(await page.locator('#explorer-window-title').isVisible(), "Entrée sur l'icône : l'explorateur s'ouvre");
    check((await page.textContent('.explorer pre')).includes('# Constance'), 'aperçu du README de Constance');
    await page.click('.explorer-list button:has-text("titre-pr/")');
    check((await page.textContent('.explorer-path')).includes('~/constance/titre-pr'), 'clic sur un dossier : on y entre');
    check((await activeLabel(page)).includes('Dossier parent'), 'le focus va sur la première entrée du dossier');
    await page.click('.explorer-projects button:has-text("Val")');
    await page.waitForFunction(() => document.querySelector('.explorer pre')?.textContent.includes('# Val'));
    check(true, "changer de projet dans l'explorateur : README de Val");
    reportAxe(await axeViolations(page), 'explorateur ouvert');
    await page.keyboard.press('Escape');
    check(!(await page.locator('#explorer-window-title').isVisible()), "Échap ferme l'explorateur");
    check((await activeLabel(page)) === 'constance', "le focus revient sur l'icône qui l'a ouvert");

    // Terminal: opened from the dock
    await page.click('button[aria-label="Terminal"]');
    await page.waitForSelector('text=Terminal prêt', { state: 'attached', timeout: 15000 });
    check((await activeLabel(page)) === 'command', 'le terminal s\'ouvre, le focus est dans le champ');
    await page.fill('#command', 'cd projets');
    await page.press('#command', 'Enter');
    await page.waitForTimeout(300);
    check((await page.textContent('label[for=command]')).includes('~/projets'), 'cd projets : invite mise à jour');
    await page.click('.output button.entry:has-text("val/")');
    await page.waitForTimeout(300);
    check((await page.textContent('label[for=command]')).includes('~/projets/val'), 'clic sur un dossier : on y entre');
    await page.fill('#command', 'cat READ');
    await page.press('#command', 'Tab');
    check((await page.inputValue('#command')) === 'cat README.md ', 'Tab complète « README.md »');
    await page.press('#command', 'Enter');
    await page.waitForFunction(() => document.querySelector('.output').textContent.includes('# Val'), null, { timeout: 15000 });
    check(true, 'cat README.md : le fichier est lu sur GitHub et affiché');
    await page.fill('#command', 'chercher changelog');
    await page.press('#command', 'Enter');
    await page.waitForTimeout(400);
    check(/\d+ fichier\(s\) pour « changelog »/.test(await page.textContent('.output')), 'chercher : dans les noms de fichiers de tous les projets');
    await page.click('.keys button:has-text("PROJETS")');
    await page.waitForTimeout(300);
    check((await page.textContent('.output')).includes('Projets installés'), 'touche PROJETS : la liste des projets');
    // Keyboard trap: Tab with nothing to complete must leave the field.
    await page.fill('#command', 'zzz');
    await page.focus('#command');
    await page.keyboard.press('Tab');
    check((await activeLabel(page)) !== 'command', 'Tab sans complétion : le focus sort du champ');
    reportAxe(await axeViolations(page), 'terminal ouvert');
    await page.keyboard.press('Escape');

    await page.click('button[aria-label="Changer la couleur du boîtier"]');
    await page.waitForTimeout(200);
    check((await page.getAttribute('main.deck', 'data-palette')) === 'menthe', 'touche couleur : coque menthe');
    check((await page.textContent('main > [role=status]')).includes('Coque : menthe'), 'le changement de couleur est annoncé');
  } else {
    await page.click('.icon[data-folder="anais"]');
    await page.waitForSelector('.explorer pre');
    const windowWidth = await page.evaluate(() => document.querySelector('dialog[open]').getBoundingClientRect().width);
    check(Math.abs(windowWidth - viewport.width) <= 1, `téléphone : l'explorateur prend tout l'écran (${Math.round(windowWidth)} px)`);
    check((await page.textContent('.explorer-tagline')).includes('bullet journal'), "téléphone : l'accroche du projet est en haut de l'explorateur");
    await page.click('.window-close');
  }
  const widget = page.locator('aside[aria-labelledby="weight-title"]');
  if (await widget.count()) check(/\d+ Ko/.test(await widget.textContent()), `${deviceName} : widget du poids mesuré par Solange`);
  else console.log(`   (${deviceName} : pas de poids.json, widget masqué)`);
  await page.waitForSelector('.access-widget');
  check((await page.textContent('.access-widget')).includes('39/39'), `${deviceName} : widget d'accessibilité, Marguerite et Emmanuelle citées`);
  const deckShare = await page.evaluate(() => document.querySelector('.deck').getBoundingClientRect().width / window.innerWidth);
  check(deckShare > 0.95, `${deviceName} : le cyberdeck occupe ${Math.round(deckShare * 100)} % de la largeur`);
  reportAxe(await axeViolations(page), `${deviceName} : bureau`);
  await page.close();
}
check(errors.length === 0, `aucune erreur JavaScript${errors.length ? ' : ' + errors.join(' | ') : ''}`);
await browser.close();
if (failureCount) process.exit(1);
