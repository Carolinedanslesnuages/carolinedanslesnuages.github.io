<script setup>
/**
 * A desktop window, built on the native modal <dialog>: the rest of the page becomes inert, focus
 * stays inside, Escape closes it, and focus goes back to the element that opened it (RGAA 7.1, 12.8).
 * On a phone the window takes the whole screen.
 */
import { ref, nextTick } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  windowId: { type: String, required: true },
});
const emit = defineEmits(['opened', 'closed']);
const dialog = ref(null);
let opener = null;

async function open(elementToFocus) {
  if (!dialog.value || dialog.value.open) return;
  opener = document.activeElement;
  dialog.value.showModal();
  await nextTick();
  emit('opened');
  const target = typeof elementToFocus === 'function' ? elementToFocus() : null;
  if (target) target.focus();
}

function close() {
  if (dialog.value && dialog.value.open) dialog.value.close();
}

function onClose() {
  emit('closed');
  if (opener && opener.isConnected) opener.focus();
  opener = null;
}

defineExpose({ open, close });
</script>

<template>
  <dialog ref="dialog" class="window" :aria-labelledby="`${props.windowId}-title`" @close="onClose">
    <div class="window-bar">
      <h2 :id="`${props.windowId}-title`">{{ props.title }}</h2>
      <span class="window-hint" aria-hidden="true">Échap pour fermer</span>
      <button class="window-close" type="button" :aria-label="`Fermer : ${props.title}`" @click="close">×</button>
    </div>
    <div class="window-body">
      <slot />
    </div>
  </dialog>
</template>
