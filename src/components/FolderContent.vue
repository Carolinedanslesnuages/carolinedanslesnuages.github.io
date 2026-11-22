<script setup>
/** The content of a desktop folder: its projects, with their tagline. A click opens the explorer. */
const props = defineProps({
  folder: { type: Object, default: null },
  projects: { type: Array, required: true },
});
const emit = defineEmits(['open']);
const TILE_COLORS = ['#ffb1df', '#6ff2c4', '#ffd36e', '#d8c6f3'];
const statusLabel = (project) => (project.status === 'trial' ? 'essai' : project.version || 'en cours');
</script>

<template>
  <div v-if="props.folder" class="folder-window">
    <p class="folder-tagline">{{ props.folder.tagline }}</p>
    <ul class="folder-list">
      <li v-for="(project, index) in props.projects" :key="project.folder">
        <button type="button" class="folder-entry" :data-project="project.folder" @click="emit('open', project)">
          <span class="icon-tile" aria-hidden="true" :style="{ background: TILE_COLORS[index % TILE_COLORS.length] }">{{ project.name.charAt(0) }}</span>
          <span class="folder-entry-text">
            <b>{{ project.name }}</b>
            <span>{{ project.tagline }}</span>
            <small>{{ statusLabel(project) }}</small>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
