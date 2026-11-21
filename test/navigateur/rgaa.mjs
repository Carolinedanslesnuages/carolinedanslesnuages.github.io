// Vérifications RGAA dans Chromium, critère par critère (textes officiels lus avec Marguerite).
// Lancé par « npm run test:navigateur », site servi sur le port 4173. Échoue si un critère échoue.
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const URL = process.env.URL || 'http://localhost:4173/';
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const res = [];
const ok = (critere, c, m) => { res.push(c); console.log(`${c ? '✅' : '❌'} ${critere} · ${m}`); };
const b = await chromium.launch();
const ouvrir = async (taille) => { const p = await b.newPage({ viewport: taille, reducedMotion: 'reduce' }); await p.goto(URL); await p.waitForSelector('text=Terminal prêt', { state: 'attached', timeout: 15000 }); return p; };
const debord = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

let p = await ouvrir({ width: 1280, height: 900 });
// 12.7 lien d'évitement
await p.keyboard.press('Tab');
ok('12.7', (await p.evaluate(() => document.activeElement.textContent)) === 'Aller au terminal', "premier Tab : le lien d'évitement « Aller au terminal »");
await p.keyboard.press('Enter');
ok('12.7', (await p.evaluate(() => location.hash)) === '#commande', 'il mène au champ du terminal');
// 12.8 ordre de tabulation
await p.goto(URL); await p.waitForSelector('text=Terminal prêt', { state: 'attached' });
const ordre = [];
for (let i = 0; i < 12; i++) { await p.keyboard.press('Tab'); ordre.push(await p.evaluate(() => { const e = document.activeElement; return (e.getAttribute('aria-label') || e.id || e.textContent || '').trim().slice(0, 18); })); }
console.log('   ordre :', ordre.join(' → '));
const iTouche = ordre.indexOf('MOI'), iCart = ordre.findIndex((x) => x.startsWith('Constance'));
const iChamp = ordre.indexOf('commande');
ok('12.8', ordre[1] === 'Écran du terminal' && iChamp > 1 && iTouche === iChamp + 1 && iCart > iTouche, 'écran (et ses liens), champ, touches, puis cartouches');
// 9.3 listes
await p.fill('#commande', 'ls ~/projets'); await p.press('#commande', 'Enter'); await p.waitForTimeout(300);
ok('9.3', (await p.locator('.sortie ul.grille > li > button').count()) >= 5, 'liste de dossiers en <ul>/<li>');
ok('9.3', (await p.locator('ul.liste-cartouches > li').count()) >= 6, 'cartouches en <ul>/<li>');
// 13.5 contenu cryptique : aucun trait, puce ou dessin lisible par un lecteur d'écran
await p.fill('#commande', 'tree ~/projets/val'); await p.press('#commande', 'Enter');
await p.fill('#commande', 'projets'); await p.press('#commande', 'Enter');
await p.fill('#commande', 'nuages'); await p.press('#commande', 'Enter'); await p.waitForTimeout(400);
const cryptique = await p.evaluate(() => {
  const w = document.createTreeWalker(document.querySelector('.sortie'), NodeFilter.SHOW_TEXT);
  const trouves = [];
  while (w.nextNode()) { const n = w.currentNode; if (/[├└│─●◌]|\.{4,}|\(___/.test(n.nodeValue) && !n.parentElement.closest('[aria-hidden="true"]')) trouves.push(n.nodeValue.trim().slice(0, 30)); }
  return trouves;
});
ok('13.5', cryptique.length === 0, `aucun contenu cryptique restitué${cryptique.length ? ' : ' + cryptique.join(' | ') : ''}`);
ok('13.5', (await p.textContent('.sortie')).includes('Deux petits nuages, dessinés en caractères.'), 'le dessin a une alternative dans le contexte');
// 8.7 changement de langue
await p.fill('#commande', 'cat ~/projets/constance/LICENSE'); await p.press('#commande', 'Enter'); await p.waitForTimeout(300);
ok('8.7', (await p.locator('.sortie .ligne[lang=en]').count()) > 5, 'la licence en anglais est marquée lang="en"');
// 6.1 liens explicites : les liens « voir » de log disent quel commit ils ouvrent
await p.fill('#commande', 'log'); await p.press('#commande', 'Enter'); await p.waitForTimeout(300);
const nomsLiens = await p.evaluate(() => [...document.querySelectorAll('.sortie a')].filter((a) => a.textContent.startsWith('voir')).map((a) => a.textContent));
ok('6.1', nomsLiens.length > 0 && nomsLiens.every((t) => /voir : le commit « .+ » de .+ sur GitHub/.test(t)), `liens « voir » de log explicites (${nomsLiens.length})`);
const titresAvecEmoji = await p.evaluate(() => [...document.querySelectorAll('.sortie .ligne')].some((l) => /\p{Extended_Pictographic}/u.test(l.textContent)));
if (titresAvecEmoji) ok('log', (await p.locator('.sortie .emoji-rose').count()) > 0, 'log : les emoji des commits sont teintés en rose');
// 3.3 contraste du champ
const contraste = await p.evaluate(() => {
  const lum = (c) => { const [r, g, b] = c.match(/\d+/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const bord = getComputedStyle(document.querySelector('#commande')).borderBottomColor;
  const fond = getComputedStyle(document.querySelector('.ecran-cadre')).backgroundColor;
  const [a, bb] = [lum(bord), lum(fond)].sort((x, y) => y - x);
  return (a + 0.05) / (bb + 0.05);
});
ok('3.3', contraste >= 3, `bordure du champ : ${contraste.toFixed(1)}:1`);
// 10.7 focus visible sur chaque type d'élément
for (const sel of ['#commande', '.cartouche', '.touche', '.sortie .entree', '.ecran']) {
  await p.focus(sel);
  const o = await p.evaluate((s) => { const e = document.activeElement; const st = getComputedStyle(e); return st.outlineStyle !== 'none' && parseFloat(st.outlineWidth) >= 2 || st.borderBottomStyle !== 'none' && e.id === 'commande'; }, sel);
  ok('10.7', o, `focus visible sur ${sel}`);
}
// 7.5 message de statut
ok('7.5', (await p.getAttribute('[role=status]', 'aria-live')) === 'polite', 'les annonces passent par un message de statut');
const a = await p.evaluate(async (axe) => { eval(axe); return (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] })).violations.map((v) => v.id); }, axe);
ok('axe', a.length === 0, `axe-core : ${a.length ? a.join(', ') : '0 violation'}`);
await p.close();

// 10.11 et 10.4 : 320 px de large, et l'équivalent d'un zoom à 200 %
for (const [crit, t] of [['10.11', { width: 320, height: 640 }], ['10.4', { width: 640, height: 450 }]]) {
  p = await ouvrir(t);
  ok(crit, (await debord(p)) <= 0, `${t.width} px : pas de défilement horizontal`);
  const sorties = await p.evaluate(() => { const cadre = document.querySelector('.ecran-cadre').getBoundingClientRect(); return [...document.querySelectorAll('.ecran, .saisie, .saisie input, .ecran-barre')].filter((e) => e.getBoundingClientRect().right > cadre.right + 1).map((e) => e.className || e.id); });
  ok(crit, sorties.length === 0, `${t.width} px : rien ne déborde du cadre de l'écran${sorties.length ? ' (' + sorties.join(', ') + ')' : ''}`);
  await p.close();
}
// 13.8 contenu en mouvement : l'animation de « humeur » s'arrête seule en moins de 5 s,
// et n'a pas lieu quand le système demande moins d'animations.
{
  const anime = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
  await anime.goto(URL); await anime.waitForSelector('text=Terminal prêt', { state: 'attached', timeout: 15000 });
  await anime.fill('#commande', 'humeur'); await anime.press('#commande', 'Enter');
  const vus = new Set();
  const debut = Date.now();
  while (Date.now() - debut < 6000) {
    const e = await anime.locator('.humeur-emoji').last().textContent().catch(() => null);
    if (e) vus.add(e);
    if (await anime.locator('.humeur-texte').count()) break;
    await anime.waitForTimeout(100);
  }
  const duree = Date.now() - debut;
  ok('13.8', vus.size > 2 && duree < 5000 && (await anime.locator('.humeur-emoji.agite').count()) === 0, `humeur : ${vus.size} expressions, animation arrêtée seule en ${(duree / 1000).toFixed(1)} s`);
  await anime.close();
  const calme = await b.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  await calme.goto(URL); await calme.waitForSelector('text=Terminal prêt', { state: 'attached', timeout: 15000 });
  await calme.fill('#commande', 'humeur'); await calme.press('#commande', 'Enter'); await calme.waitForTimeout(150);
  ok('13.8', (await calme.locator('.humeur-texte').count()) === 1 && (await calme.locator('.humeur-emoji.agite').count()) === 0, 'humeur : aucune animation quand le système en demande moins');
  ok('7.5', /^Humeur du moment : /.test(await calme.textContent('[role=status]')), "humeur : l'humeur finale est annoncée");
  await calme.close();
}
// 10.12 espacement du texte redéfini
p = await ouvrir({ width: 1280, height: 900 });
await p.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }' });
const coupes = await p.evaluate(() => [...document.querySelectorAll('.cartouche b, .cartouche small, .touche, h1, .entete p')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.trim().slice(0, 20)));
ok('10.12', (await debord(p)) <= 0 && coupes.length === 0, `espacement redéfini : rien de coupé${coupes.length ? ' (' + coupes.join(', ') + ')' : ''}`);
await b.close();
console.log(`\n${res.filter(Boolean).length}/${res.length} vérifications réussies`);
if (res.some((x) => !x)) process.exit(1);
