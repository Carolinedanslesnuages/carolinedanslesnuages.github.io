<script setup>
/**
 * The icons of the desktop: folders (a theme, several projects) and projects. Each icon has an
 * info bubble that appears on hover and on keyboard focus, stays while the pointer is on it, and
 * closes with Escape (WCAG 1.4.13). Arrow keys move between icons, on top of Tab.
 *
 * An item: { id, kind: 'folder' | 'project', name, letter, description, detail }.
 */
import { ref } from 'vue';

const props = defineProps({ items: { type: Array, required: true } });
const emit = defineEmits(['open']);
const list = ref(null);
const dismissedId = ref(null);
const TILE_COLORS = ['#ffb1df', '#6ff2c4', '#ffd36e', '#d8c6f3'];

function columnCount(buttons) {
  const firstRowTop = buttons[0].offsetTop;
  return Math.max(1, buttons.filter((button) => button.offsetTop === firstRowTop).length);
}

function onKeydown(event, index) {
  if (event.key === 'Escape' && dismissedId.value !== props.items[index].id) {
    dismissedId.value = props.items[index].id;
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

function forgetDismissal(itemId) {
  if (dismissedId.value === itemId) dismissedId.value = null;
}
</script>

<template>
  <ul id="projects" ref="list" class="icon-grid" aria-label="Dossiers et projets" tabindex="-1">
    <li
      v-for="(item, index) in props.items"
      :key="item.id"
      :class="['icon-cell', { quiet: dismissedId === item.id }]"
      @mouseleave="forgetDismissal(item.id)"
      @focusout="forgetDismissal(item.id)"
    >
      <button
        :class="['icon', item.kind]"
        type="button"
        :data-item="item.id"
        :aria-describedby="`bubble-${item.id}`"
        @click="emit('open', item)"
        @keydown="onKeydown($event, index)"
      >
        <span v-if="item.kind === 'folder'" class="icon-tile folder-tile" aria-hidden="true" :style="{ background: TILE_COLORS[index % TILE_COLORS.length] }">
          <span class="folder-count">{{ item.count }}</span>
        </span>
        <span v-else class="icon-tile" aria-hidden="true" :style="{ background: TILE_COLORS[index % TILE_COLORS.length] }">{{ item.letter }}</span>
        <span class="icon-name">{{ item.name }}<span v-if="item.kind === 'folder'" class="visually-hidden"> (dossier de {{ item.count }} projets)</span></span>
      </button>
      <span :id="`bubble-${item.id}`" class="bubble" role="tooltip">
        <b>{{ item.description }}</b>
        <span class="bubble-status">{{ item.detail }}</span>
      </span>
    </li>
  </ul>
</template>
