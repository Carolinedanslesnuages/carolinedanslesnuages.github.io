// Runs the site in Chromium: boot, commands, clicks, keyboard, accessibility (axe-core).
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

for (const [deviceName, viewport] of [['ordinateur', { width: 1280, height: 900 }], ['telephone', { width: 390, height: 844 }]]) {
  const page = await browser.newPage({ viewport, reducedMotion: 'reduce' });
  page.on('pageerror', (error) => errors.push(`${deviceName} : ${error.message}`));
  // A Google font that fails to load (network) is not a site error: it is ignored, and only it.
  // Any other failing resource stays an error.
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
  await page.goto(SITE_URL);
  await page.waitForSelector('text=Terminal prêt', { state: 'attached', timeout: 15000 });
  check(true, `${deviceName} : démarrage, annonce « Terminal prêt »`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 0, `${deviceName} : pas de défilement horizontal (${overflow}px)`);
  if (deviceName === 'ordinateur') {
    await page.fill('#command', 'cd projets');
    await page.press('#command', 'Enter');
    await page.waitForTimeout(300);
    check((await page.textContent('label[for=command]')).includes('~/projets'), 'cd projets : invite mise à jour');
    check((await page.textContent('[role=status]')).includes('éléments dans ~/projets'), 'annonce courte de la liste');
    await page.click('.output button.entry:has-text("val/")');
    await page.waitForTimeout(300);
    check((await page.textContent('label[for=command]')).includes('~/projets/val'), 'clic sur un dossier : on y entre');
    await page.fill('#command', 'cat READ');
    await page.press('#command', 'Tab');
    check((await page.inputValue('#command')) === 'cat README.md ', 'Tab complète « README.md »');
    await page.press('#command', 'Enter');
    await page.waitForTimeout(400);
    check((await page.textContent('.output')).includes('# Val'), 'cat README.md affiche le fichier');
    await page.fill('#command', 'chercher gitleaks');
    await page.press('#command', 'Enter');
    await page.waitForTimeout(400);
    check((await page.locator('.output mark').count()) > 0, 'chercher : mots surlignés');
    await page.click('.cartridge:has-text("Constance")');
    await page.waitForTimeout(400);
    check((await page.textContent('.output')).includes('> constance'), 'cartouche Constance : résumé affiché');
    await page.click('button[aria-label="Changer la couleur du boîtier"]');
    await page.waitForTimeout(200);
    check((await page.getAttribute('main.deck', 'data-palette')) === 'menthe', 'touche couleur : coque menthe');
    // Keyboard trap: Tab with nothing to complete must leave the field.
    await page.fill('#command', 'zzz');
    await page.focus('#command');
    await page.keyboard.press('Tab');
    check((await page.evaluate(() => document.activeElement && document.activeElement.id)) !== 'command', 'Tab sans complétion : le focus sort du champ');
  }
  await page.addScriptTag({ content: AXE_SOURCE });
  const axeResult = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] }));
  check(axeResult.violations.length === 0, `${deviceName} : axe-core WCAG 2.1 AA, ${axeResult.violations.length} violation(s)`);
  for (const violation of axeResult.violations) {
    console.log(`   - ${violation.id} (${violation.impact}) : ${violation.help} · ${violation.nodes.length} élément(s) · ${violation.nodes[0].target.join(' ')}`);
  }
  await page.close();
}
check(errors.length === 0, `aucune erreur JavaScript${errors.length ? ' : ' + errors.join(' | ') : ''}`);
await browser.close();
if (failureCount) process.exit(1);
