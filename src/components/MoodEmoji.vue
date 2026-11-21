<script setup>
/**
 * "humeur" easter egg: an emoji that runs through expressions while shaking, then settles.
 * Accessibility: the animation lasts under 5 seconds (RGAA 13.8: no pause needed below that), no
 * animation when the system asks for less motion, and the changing emoji is hidden from screen
 * readers: only the final mood is read (the command's announcement).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({ mood: { type: Object, required: true } });
const DURATION_MS = 3600;
const STEP_MS = 170;

const shownEmoji = ref(props.mood.emoji);
const settled = ref(false);
let timer = null;

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    settled.value = true;
    return;
  }
  const startedAt = Date.now();
  let position = 0;
  timer = setInterval(() => {
    if (Date.now() - startedAt >= DURATION_MS) {
      clearInterval(timer);
      shownEmoji.value = props.mood.emoji;
      settled.value = true;
      return;
    }
    position = (position + 1 + Math.floor(Math.random() * 3)) % props.mood.sequence.length;
    shownEmoji.value = props.mood.sequence[position];
  }, STEP_MS);
});
onBeforeUnmount(() => timer && clearInterval(timer));
</script>

<template>
  <span class="mood">
    <span :class="['mood-emoji', { shaking: !settled }]" aria-hidden="true">{{ shownEmoji }}</span>
    <span v-if="settled" class="mood-text"><b>{{ mood.name }}</b> · {{ mood.detail }}</span>
  </span>
</template>
