<script setup>
/**
 * The project icons of the desktop. Each icon has an info bubble that appears on hover and on
 * keyboard focus, stays while the pointer is on it, and closes with Escape (WCAG 1.4.13).
 * Arrow keys move between icons, on top of Tab.
 */
import { ref } from 'vue';

const props = defineProps({ projects: { type: Array, required: true } });
const emit = defineEmits(['open']);
const list = ref(null);
const dismissedFolder = ref(null);
const TILE_COLORS = ['#ffb1df', '#6ff2c4', '#ffd36e', '#d8c6f3'];

const statusLabel = (project) => (project.status === 'trial' ? 'essai' : project.version || 'en cours');

function columnCount(buttons) {
  const firstRowTop = buttons[0].offsetTop;
  const count = buttons.filter((button) => button.offsetTop === firstRowTop).length;
  return Math.max(1, count);
}

function onKeydown(event, index) {
  if (event.key === 'Escape' && dismissedFolder.value !== props.projects[index].folder) {
    dismissedFolder.value = props.projects[index].folder;
    event.stopPropagation();
    return;
  }
  const buttons = [...list.value.querySelectorAll('.icon')];
  const moves = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: columnCount(buttons), ArrowUp: -columnCount(buttons) };
  let target = null;
  if (event.key in moves) target = index + moves[event.key];
  else if (event.key === 'Home') target = 0;
  else if (event.key === 'End') target = buttons.length - 1;
  if (target === null || target < 0 || target >= buttons.length) return;
  event.preventDefault();
  buttons[target].focus();
}

function forgetDismissal(folder) {
  if (dismissedFolder.value === folder) dismissedFolder.value = null;
}

defineExpose({ focusProject: (folder) => list.value && list.value.querySelector(`[data-folder="${folder}"]`)?.focus() });
</script>

<template>
  <ul id="projects" ref="list" class="icon-grid" aria-label="Projets" tabindex="-1">
    <li
      v-for="(project, index) in props.projects"
      :key="project.folder"
      :class="['icon-cell', { quiet: dismissedFolder === project.folder }]"
      @mouseleave="forgetDismissal(project.folder)"
      @focusout="forgetDismissal(project.folder)"
    >
      <button
        class="icon"
        type="button"
        :data-folder="project.folder"
        :aria-describedby="`bubble-${project.folder}`"
        @click="emit('open', project)"
        @keydown="onKeydown($event, index)"
      >
        <span class="icon-tile" aria-hidden="true" :style="{ background: TILE_COLORS[index % TILE_COLORS.length] }">{{ project.name.charAt(0) }}</span>
        <span class="icon-name">{{ project.name }}</span>
      </button>
      <span :id="`bubble-${project.folder}`" class="bubble" role="tooltip">
        <b>{{ project.tagline }}</b>
        <span class="bubble-status">{{ statusLabel(project) }}</span>
      </span>
    </li>
  </ul>
</template>
