import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTerminal, MOODS } from '../src/terminal/engine.js';
import { resolvePath } from '../src/terminal/filesystem.js';
import { keepPath, namesakeOf, desktopFolders, isHidden } from '../scripts/collect.mjs';

const FILES = {
  'projets/constance/README.md': { content: '# Constance\n\nGitleaks vérifié.\nLigne 4', url: 'https://github.com/x/constance/blob/main/README.md' },
  'projets/constance/titre-pr/check.sh': { content: 'echo titre', url: 'u' },
  'projets/constance/image.png': { url: 'https://github.com/x/constance/blob/main/image.png' },
  'projets/irene/AGENTS.md': { content: "Irène protège contre l'arnaque.", url: 'u' },
};
const SITE_DATA = {
  tagline: 'Bonjour.',
  presentation: ['carolinedanslesnuages', 'Curieuse.'],
  projects: [
    {
      name: 'Constance', command: 'constance', folder: 'constance', tagline: 'Règles', description: 'Les mêmes règles', version: 'v1.0.0', status: 'released', url: 'https://github.com/x/constance',
      commits: [
        { sha: 'aaaaaaa', title: 'feat: 🌸 ajouter X', date: '2026-11-20T10:00:00Z', url: 'https://github.com/x/constance/commit/a' },
        { sha: 'bbbbbbb', title: 'fix: corriger Y', date: '2026-11-18T10:00:00Z', url: 'https://github.com/x/constance/commit/b' },
      ],
    },
    {
      name: 'Irène', command: 'irene', folder: 'irene', tagline: 'Alerte', description: 'Extension', version: null, status: 'trial', url: 'https://github.com/x/Irene',
      commits: [{ sha: 'ccccccc', title: 'docs: 📝 guide', date: '2026-11-19T10:00:00Z', url: 'https://github.com/x/Irene/commit/c' }],
    },
  ],
  upcoming: [{ name: 'Olympe', tagline: 'Skills' }],
};
const newTerminal = () => createTerminal({ files: FILES, data: SITE_DATA });
const screenText = (result) => result.lines.map((line) => line.parts.map((part) => (typeof part === 'string' ? part : JSON.stringify(part))).join('')).join('\n');

test('chemins : relatifs, .., ~, /', () => {
  assert.equal(resolvePath('projets/a', '..'), 'projets');
  assert.equal(resolvePath('projets/a', '~'), '');
  assert.equal(resolvePath('projets/a', '/projets'), 'projets');
  assert.equal(resolvePath('projets', 'a/b'), 'projets/a/b');
  assert.equal(resolvePath('projets', ''), 'projets');
});

test('naviguer : cd, ls, pwd, invite', () => {
  const terminal = newTerminal();
  const result = terminal.execute('cd projets');
  assert.equal(terminal.prompt(), '~/projets');
  assert.match(result.announcement, /2 éléments dans ~\/projets : constance \(dossier\), irene \(dossier\)/);
  terminal.execute('cd constance');
  assert.equal(terminal.execute('pwd').lines[0].parts[0], '~/projets/constance');
  assert.match(terminal.execute('cd ..').announcement, /~\/projets/);
  assert.match(screenText(terminal.execute('cd nulle-part')), /aucun dossier/);
  assert.match(screenText(terminal.execute('cd ~/projets/constance/README.md')), /est un fichier/);
});

test('lire un fichier, un binaire, un dossier', () => {
  const terminal = newTerminal();
  const result = terminal.execute('cat projets/constance/README.md');
  assert.equal(result.instant, true);
  assert.match(result.announcement, /Fichier ~\/projets\/constance\/README\.md affiché, 4 lignes/);
  assert.match(screenText(result), /Gitleaks vérifié/);
  assert.match(screenText(terminal.execute('cat projets/constance/image.png')), /binaire/);
  assert.match(screenText(terminal.execute('cat projets')), /est un dossier/);
});

test('un fichier du projet est lu sur GitHub : cat attend son texte', () => {
  const files = { ...FILES, 'projets/constance/AGENTS.md': { url: 'https://github.com/x/constance/blob/main/AGENTS.md', raw: 'https://raw.githubusercontent.com/x/constance/main/AGENTS.md' } };
  const terminal = createTerminal({ files, data: SITE_DATA });
  const waiting = terminal.execute('cat projets/constance/AGENTS.md');
  assert.deepEqual(waiting.pendingFile, { path: 'projets/constance/AGENTS.md', raw: 'https://raw.githubusercontent.com/x/constance/main/AGENTS.md' });
  assert.match(screenText(waiting), /Lecture de ~\/projets\/constance\/AGENTS\.md sur GitHub/);
  const shown = terminal.fileLines('projets/constance/AGENTS.md', 'Règles\nde travail\n');
  assert.match(shown.announcement, /2 lignes/);
  assert.match(screenText(shown), /de travail/);
  const unreachable = terminal.fileLines('projets/constance/AGENTS.md', null);
  assert.match(unreachable.announcement, /impossible de le lire sur GitHub/);
  assert.ok(unreachable.lines.some((line) => line.parts.some((part) => typeof part === 'object' && part.link && part.link.url.endsWith('/AGENTS.md'))));
  terminal.execute('cd projets/constance');
  assert.match(terminal.execute('chercher agents').announcement, /1 fichier/, 'trouvé par son nom, sans son texte');
});

test('un fichier en anglais est marqué comme tel (RGAA 8.7)', () => {
  const files = { ...FILES, 'projets/constance/LICENSE': { content: 'MIT License\nPermission is hereby granted', lang: 'en', url: 'u' } };
  const terminal = createTerminal({ files, data: SITE_DATA });
  const fileLines = (command) => terminal.execute(command).lines.filter((line) => line.style === 'file-line');
  assert.ok(fileLines('cat projets/constance/LICENSE').every((line) => line.lang === 'en'));
  assert.ok(fileLines('cat projets/constance/README.md').every((line) => line.lang === undefined));
});

test('chercher dans les noms et le contenu, sans accents, dans le dossier courant', () => {
  const terminal = newTerminal();
  const result = terminal.execute('chercher GITLEAKS');
  assert.match(result.announcement, /2 fichier\(s\)/, 'README.md et lisez-moi.txt (qui donne cet exemple)');
  assert.ok(result.lines.some((line) => line.parts.some((part) => part.highlight === 'Gitleaks')));
  assert.match(terminal.execute('chercher arnaqué').announcement, /1 fichier/);
  terminal.execute('cd projets/irene');
  assert.match(screenText(terminal.execute('chercher gitleaks')), /Rien trouvé .* dans ~\/projets\/irene/);
});

test('projets et commandes de chaque projet', () => {
  const terminal = newTerminal();
  const projectList = screenText(terminal.execute('projets'));
  assert.match(projectList, /constance\s+v1\.0\.0/);
  assert.match(projectList, /irene\s+projet d'essai/);
  assert.match(projectList, /olympe\s+en préparation/);
  assert.match(screenText(terminal.execute('irène')), /Extension/);
  assert.match(screenText(terminal.execute('constance')), /github\.com\/x\/constance/);
});

test('effacer, couleur, inconnue, vide', () => {
  const terminal = newTerminal();
  assert.equal(terminal.execute('effacer').clearScreen, true);
  assert.equal(terminal.execute('couleur').changeColor, true);
  assert.match(screenText(terminal.execute('nimporte')), /Commande inconnue/);
  assert.equal(terminal.execute('   '), null);
});

test('complétion : commande, chemin unique, plusieurs propositions, rien', () => {
  const terminal = newTerminal();
  assert.deepEqual(terminal.complete('chE'), { value: 'chercher ' });
  assert.deepEqual(terminal.complete('cd pro'), { value: 'cd projets/' });
  assert.match(terminal.complete('cd projets/').announcement, /2 possibilités/);
  assert.equal(terminal.complete('cd zzz'), null);
  assert.match(terminal.complete('cd projets/constance/').announcement, /3 possibilités/);
  assert.equal(terminal.complete('xyz'), null);
});

test('les annonces restent courtes', () => {
  const terminal = newTerminal();
  for (const command of ['aide', 'projets', 'tree', 'cat projets/constance/README.md', 'chercher e']) {
    assert.ok(terminal.execute(command).announcement.length <= 400, command);
  }
});

test('collecte : pourquoi ce nom, repris du README en texte simple', () => {
  const readme = '# Val\n\nL\'empreinte.\n\nLe nom rend hommage à *Valérie*,\nau [GIEC](https://ipcc.ch).\n\n## Suite';
  assert.equal(namesakeOf(readme), 'Le nom rend hommage à Valérie, au GIEC.');
  assert.equal(namesakeOf('# Sans\n\nAucune explication.'), '');
  assert.equal(namesakeOf(undefined), '');
});

test('collecte : dossiers du bureau, et un dépôt inconnu arrête tout', () => {
  const configured = [{ depot: 'constance' }, { depot: 'Irene', nom: 'Irène' }];
  const projects = [{ folder: 'constance' }, { folder: 'irene' }];
  assert.deepEqual(desktopFolders([{ nom: 'Pull requests', accroche: 'Relire', projets: ['constance', 'Irene'] }], projects, configured), [{ name: 'Pull requests', tagline: 'Relire', projects: ['constance', 'irene'] }]);
  assert.throws(() => desktopFolders([{ nom: 'Sites', projets: ['inconnu'] }], projects, configured), /cite « inconnu »/);
  assert.deepEqual(desktopFolders(undefined, projects, configured), []);
});

test('collecte : fichiers et dossiers masqués par projet', () => {
  assert.equal(isHidden('revues/story-2.md', ['revues', 'ada.json']), true);
  assert.equal(isHidden('revues', ['revues/']), true);
  assert.equal(isHidden('ada.json', ['revues', 'ada.json']), true);
  assert.equal(isHidden('revues-bis/a.md', ['revues']), false, 'même début de nom, autre dossier');
  assert.equal(isHidden('src/ada.json', ['ada.json']), false, 'seulement à la racine');
  assert.equal(isHidden('README.md'), false);
});

test('collecte : dossiers cachés et dépendances écartés', () => {
  assert.equal(keepPath('src/a.ts'), true);
  assert.equal(keepPath('.github/workflows/ci.yml'), true);
  assert.equal(keepPath('.claude/skills/x/SKILL.md'), false);
  assert.equal(keepPath('.agents/x'), false);
  assert.equal(keepPath('node_modules/x/index.js'), false);
  assert.equal(keepPath('a/dist/b.js'), false);
  assert.equal(keepPath('package-lock.json'), false);
});

test('log : derniers commits, du plus récent au plus ancien, emoji à part', () => {
  const terminal = newTerminal();
  const result = terminal.execute('log');
  assert.equal(result.lines.length, 4);
  assert.match(result.announcement, /3 derniers commits de tous les projets/);
  const newest = result.lines[1].parts;
  assert.ok(newest.some((part) => part.emoji === '🌸'));
  assert.ok(newest.some((part) => part.link && /le commit « feat: 🌸 ajouter X » de Constance/.test(part.link.detail)));
  assert.ok(result.lines[2].parts.some((part) => part.emoji === '📝'), 'Irène, 19/11, en deuxième');
  const constanceLog = terminal.execute('log constance');
  assert.equal(constanceLog.lines.length, 3);
  assert.match(constanceLog.announcement, /de Constance/);
  assert.match(screenText(terminal.execute('log personne')), /pas de projet « personne »/);
  assert.match(screenText(terminal.execute('log irène')), /Derniers commits de Irène/);
});

test('humeur : une humeur choisie au hasard, annoncée en entier, absente de l\'aide', () => {
  const terminal = createTerminal({ files: FILES, data: SITE_DATA, random: () => 0.2 });
  const result = terminal.execute('humeur');
  const mood = result.lines[1].parts[0].mood;
  assert.equal(mood.emoji, MOODS[2][0]);
  assert.equal(mood.sequence.length, MOODS.length);
  assert.match(result.announcement, /^Humeur du moment : loufoque\./);
  assert.doesNotMatch(screenText(terminal.execute('aide')), /humeur/);
});
