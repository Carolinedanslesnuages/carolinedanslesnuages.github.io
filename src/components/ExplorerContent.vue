<script setup>
/**
 * The file explorer: the projects on the left, the files of the open folder, and a preview of the
 * selected file. A project's file tree is downloaded when it is opened; a file's text is read from
 * GitHub when it is selected.
 */
import { ref, computed, nextTick, watch } from 'vue';
import { createFileSystem } from '../terminal/filesystem.js';
import { loadProjectFiles } from '../data/project-files.js';
import { readFileText } from '../data/file-text.js';
import { statusLabel } from '../data/project-status.js';

const props = defineProps({
  projects: { type: Array, required: true },
  folders: { type: Array, default: () => [] },
});
const fileSystem = ref(null);
const project = ref(null);
const currentFolder = ref('');
const selectedPath = ref('');
const loading = ref(false);
const announcement = ref('');
const entryList = ref(null);
const previewText = ref(null);
/** 'none' (not a readable file), 'loading', 'ready' or 'failed'. */
const previewState = ref('none');
let openRequest = 0;
let previewRequest = 0;

const projectRoot = computed(() => (project.value ? `projets/${project.value.folder}` : ''));
const relativeFolder = computed(() => currentFolder.value.slice(projectRoot.value.length + 1));
const entries = computed(() => (fileSystem.value ? fileSystem.value.childrenOf(currentFolder.value) : []));
const selectedFile = computed(() => (fileSystem.value && selectedPath.value ? fileSystem.value.nodes[selectedPath.value] : null));
const nameOf = (path) => path.split('/').pop();
/** The projects of the left column, grouped like the desktop folders ("Autres" for the rest). */
const projectGroups = computed(() => {
  const byFolder = new Map(props.projects.map((listed) => [listed.folder, listed]));
  const groups = props.folders.map((folder) => ({ name: folder.name, projects: folder.projects.map((projectFolder) => byFolder.get(projectFolder)).filter(Boolean) }));
  const grouped = new Set(groups.flatMap((group) => group.projects.map((listed) => listed.folder)));
  const others = props.projects.filter((listed) => !grouped.has(listed.folder));
  if (others.length) groups.push({ name: groups.length ? 'Autres' : 'Projets', projects: others });
  return groups;
});
const isFolder = (path) => fileSystem.value.isFolder(path);

watch(selectedFile, async (file) => {
  const request = ++previewRequest;
  previewText.value = null;
  if (!file) return;
  if (typeof file.content === 'string') {
    previewText.value = file.content;
    previewState.value = 'ready';
    return;
  }
  if (!file.raw) {
    previewState.value = 'none';
    return;
  }
  previewState.value = 'loading';
  const text = await readFileText(file.raw);
  if (request !== previewRequest) return; // another file was selected in the meantime
  previewText.value = text;
  previewState.value = text === null ? 'failed' : 'ready';
});

function announce(message) {
  announcement.value = '';
  setTimeout(() => (announcement.value = message), 60);
}

async function openProject(folder) {
  const chosen = props.projects.find((candidate) => candidate.folder === folder) || props.projects[0];
  if (!chosen) return;
  const request = ++openRequest;
  project.value = chosen;
  loading.value = true;
  const files = await loadProjectFiles(chosen.folder);
  if (request !== openRequest) return; // another project was chosen in the meantime
  fileSystem.value = createFileSystem(files);
  currentFolder.value = `projets/${chosen.folder}`;
  const readme = fileSystem.value.childrenOf(currentFolder.value).find((path) => /^readme\.md$/i.test(nameOf(path)));
  selectedPath.value = readme || '';
  loading.value = false;
  announce(`${chosen.name} ouvert : ${entries.value.length} éléments.`);
}

async function enterFolder(path) {
  currentFolder.value = path;
  announce(`Dossier ${nameOf(path)} : ${entries.value.length} éléments.`);
  await nextTick();
  // The clicked entry is gone: focus goes to the first entry of the new list.
  const firstEntry = entryList.value && entryList.value.querySelector('button');
  if (firstEntry) firstEntry.focus();
}

function goUp() {
  enterFolder(currentFolder.value.split('/').slice(0, -1).join('/'));
}

function choose(path) {
  if (isFolder(path)) enterFolder(path);
  else selectedPath.value = path;
}

defineExpose({ openProject, currentProject: () => project.value });
</script>

<template>
  <div class="explorer">
    <nav class="explorer-projects" aria-label="Projets de l'explorateur">
      <template v-for="(group, groupIndex) in projectGroups" :key="group.name">
        <p :id="`explorer-group-${groupIndex}`" class="explorer-group">{{ group.name }}</p>
        <ul :aria-labelledby="`explorer-group-${groupIndex}`">
          <li v-for="listed in group.projects" :key="listed.folder">
            <button type="button" class="explorer-entry" :aria-current="project && listed.folder === project.folder ? 'true' : undefined" @click="openProject(listed.folder)">{{ listed.name }}</button>
          </li>
        </ul>
      </template>
    </nav>

    <section class="explorer-files" aria-labelledby="explorer-files-title" :aria-busy="loading">
      <template v-if="project">
        <h3 id="explorer-files-title">{{ project.name }} <small>· {{ statusLabel(project) }}</small></h3>
        <p v-if="project.namesake" class="explorer-namesake">{{ project.namesake }}</p>
        <p class="explorer-tagline">{{ project.tagline }}</p>
        <p v-if="loading">Chargement des fichiers…</p>
        <template v-else>
          <p class="explorer-path">~/{{ project.folder }}{{ relativeFolder ? '/' + relativeFolder : '' }}</p>
          <ul ref="entryList" class="explorer-list">
            <li v-if="currentFolder !== projectRoot">
              <button type="button" class="explorer-entry" @click="goUp"><span aria-hidden="true">↑ </span>Dossier parent</button>
            </li>
            <li v-for="path in entries" :key="path">
              <button type="button" :class="['explorer-entry', { folder: isFolder(path) }]" :aria-current="path === selectedPath ? 'true' : undefined" @click="choose(path)">
                <span class="explorer-glyph" aria-hidden="true">{{ isFolder(path) ? '▸' : '·' }}</span>{{ nameOf(path) }}<template v-if="isFolder(path)">/<span class="visually-hidden"> (dossier)</span></template>
              </button>
            </li>
          </ul>
        </template>
      </template>
      <h3 v-else id="explorer-files-title">Choisissez un projet</h3>
    </section>

    <article class="explorer-preview" aria-labelledby="explorer-preview-title">
      <template v-if="selectedFile">
        <h3 id="explorer-preview-title">{{ nameOf(selectedPath) }}</h3>
        <pre v-if="previewState === 'ready'" tabindex="0" :lang="selectedFile.lang" aria-label="Contenu du fichier">{{ previewText }}</pre>
        <p v-else-if="previewState === 'loading'" class="explorer-waiting">Lecture du fichier sur GitHub…</p>
        <p v-else-if="previewState === 'failed'">Impossible de lire ce fichier sur GitHub pour l'instant.</p>
        <p v-else>Ce fichier ne s'affiche pas ici (image, ou fichier trop grand).</p>
        <a v-if="selectedFile.url" :href="selectedFile.url" target="_blank" rel="noopener">Ouvrir {{ nameOf(selectedPath) }} sur GitHub<span class="visually-hidden"> (nouvel onglet)</span></a>
      </template>
      <h3 v-else id="explorer-preview-title">Aucun fichier sélectionné</h3>
    </article>

    <p class="visually-hidden" role="status" aria-live="polite">{{ announcement }}</p>
  </div>
</template>
