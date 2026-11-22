<script setup>
/**
 * The cyberdeck, whose screen is a desktop: a dock on the left (terminal, explorer, mood, color),
 * one icon per project, and the widgets (EcoIndex, accessibility). Projects open in the explorer, in a window.
 */
import { ref, shallowRef, nextTick, onBeforeUnmount } from 'vue';
import AppWindow from './components/AppWindow.vue';
import ExplorerContent from './components/ExplorerContent.vue';
import ProjectIcons from './components/ProjectIcons.vue';
import Terminal from './components/Terminal.vue';
import EcoIndexWidget from './components/EcoIndexWidget.vue';
import AccessibilityWidget from './components/AccessibilityWidget.vue';
import { createTerminal } from './terminal/engine.js';
import { loadAllFiles } from './data/project-files.js';
import siteData from './data/projects.json';

const terminal = shallowRef(null);
const terminalView = ref(null);
const terminalWindow = ref(null);
const explorerWindow = ref(null);
const explorer = ref(null);
const announcement = ref('');
/** Palette names are shown to the visitor ("Coque : menthe"): they stay in French. */
const PALETTES = ['bonbon', 'menthe', 'peche'];
const PALETTE_STORAGE_KEY = 'nuages-palette';
const palette = ref('bonbon');
let terminalLoading = null;

try {
  const saved = localStorage.getItem(PALETTE_STORAGE_KEY);
  if (PALETTES.includes(saved)) palette.value = saved;
} catch {
  /* storage unavailable: default palette */
}

function announce(message) {
  announcement.value = '';
  setTimeout(() => (announcement.value = message), 60);
}

function changeColor(confirmColor) {
  palette.value = PALETTES[(PALETTES.indexOf(palette.value) + 1) % PALETTES.length];
  try {
    localStorage.setItem(PALETTE_STORAGE_KEY, palette.value);
  } catch {
    /* nothing to do */
  }
  if (typeof confirmColor === 'function') confirmColor(palette.value);
  else announce(`Coque : ${palette.value}.`);
}

/** The terminal searches every project: all the files are loaded the first time it opens. */
function startTerminal() {
  if (!terminalLoading) {
    terminalLoading = loadAllFiles().then((files) => {
      terminal.value = createTerminal({ files, data: siteData });
    });
  }
  return terminalLoading;
}

async function openTerminal(command) {
  terminalWindow.value.open(() => document.getElementById('command'));
  await startTerminal();
  await nextTick();
  if (command) terminalView.value.runCommand(command);
}

const runOnTerminal = (command) => terminalView.value && terminalView.value.runCommand(command);

function openExplorer(folder) {
  const current = explorer.value.currentProject();
  const wanted = folder || (current ? current.folder : siteData.projects[0].folder);
  if (!current || current.folder !== wanted) explorer.value.openProject(wanted);
  explorerWindow.value.open(() => document.querySelector('.explorer-projects [aria-current="true"]'));
}

const DOCK_APPS = [
  { label: 'Terminal', glyph: '>_', tint: 'pink', action: () => openTerminal() },
  { label: 'Explorateur de fichiers', glyph: '▤', tint: 'mint', action: () => openExplorer() },
  { label: 'Humeur', glyph: '☺', tint: 'yellow', action: () => openTerminal('humeur') },
  { label: 'Changer la couleur du boîtier', glyph: '◐', tint: 'paper', action: () => changeColor() },
];

const clock = ref('--:--');
const today = new Date().toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const updateClock = () => (clock.value = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
updateClock();
const clockTimer = setInterval(updateClock, 20000);
onBeforeUnmount(() => clearInterval(clockTimer));
</script>

<template>
  <a class="skip-link" href="#projects">Aller aux projets</a>
  <div class="page">
    <header class="site-header">
      <h1>{{ siteData.nickname }}<span aria-hidden="true">_</span></h1>
      <p>{{ siteData.tagline }}</p>
    </header>

    <main class="deck" :data-palette="palette">
      <span class="screw top-left"></span><span class="screw top-right"></span><span class="screw bottom-left"></span><span class="screw bottom-right"></span>
      <svg class="sticker cloud" width="92" height="56" viewBox="0 0 92 56" aria-hidden="true">
        <path d="M22 50 C6 50 4 30 18 28 C16 12 38 6 46 18 C52 6 76 8 74 26 C90 26 90 50 72 50 Z" fill="#fff7fc" stroke="#2b1d3f" stroke-width="3" stroke-linejoin="round" />
        <circle cx="38" cy="36" r="2.6" fill="#2b1d3f" /><circle cx="56" cy="36" r="2.6" fill="#2b1d3f" />
        <path d="M43 42 Q47 46 51 42" fill="none" stroke="#2b1d3f" stroke-width="2.4" stroke-linecap="round" />
        <circle cx="32" cy="41" r="3.4" fill="#ff9fd2" /><circle cx="62" cy="41" r="3.4" fill="#ff9fd2" />
      </svg>
      <span class="sticker words">{{ siteData.words.join(' · ') }}</span>

      <section class="desktop-frame" aria-labelledby="desktop-title">
        <div class="screen-bar">
          <h2 id="desktop-title"><span class="status-light" aria-hidden="true"></span>nuages-os 3.0 · bureau</h2>
          <span aria-hidden="true"><span class="desktop-date">{{ today }} · </span>{{ clock }}</span>
        </div>
        <div class="desktop">
          <nav class="dock" aria-label="Applications">
            <ul>
              <li v-for="dockApp in DOCK_APPS" :key="dockApp.label" class="dock-cell">
                <button :class="['dock-key', dockApp.tint]" type="button" :aria-label="dockApp.label" @click="dockApp.action()">{{ dockApp.glyph }}</button>
                <span class="dock-bubble" aria-hidden="true">{{ dockApp.label }}</span>
              </li>
            </ul>
          </nav>
          <ProjectIcons :projects="siteData.projects" @open="(project) => openExplorer(project.folder)" />
          <div class="widgets">
            <EcoIndexWidget />
            <AccessibilityWidget />
          </div>
        </div>
      </section>

      <AppWindow ref="explorerWindow" title="Explorateur" window-id="explorer-window">
        <ExplorerContent ref="explorer" :projects="siteData.projects" />
      </AppWindow>

      <AppWindow ref="terminalWindow" title="Terminal" window-id="terminal-window">
        <div class="terminal-window">
          <Terminal ref="terminalView" :terminal="terminal" @change-color="changeColor" />
          <nav class="keys" aria-label="Commandes rapides">
            <button class="key" type="button" @click="runOnTerminal('moi')">MOI</button>
            <button class="key" type="button" @click="runOnTerminal('projets')">PROJETS</button>
            <button class="key" type="button" @click="runOnTerminal('ls ~')">DOSSIERS</button>
            <button class="key" type="button" @click="terminalView.prepare('chercher ')">CHERCHER</button>
            <button class="key" type="button" @click="runOnTerminal('aide')">AIDE</button>
            <button class="key" type="button" @click="runOnTerminal('effacer')">EFFACER</button>
          </nav>
        </div>
      </AppWindow>

      <p class="visually-hidden" role="status" aria-live="polite">{{ announcement }}</p>
    </main>

    <footer class="site-footer">
      <span>Projets open source · fichiers repris de GitHub chaque nuit.</span>
      <a :href="`https://github.com/${siteData.account}`">github.com/{{ siteData.account }}</a>
    </footer>
  </div>
</template>
