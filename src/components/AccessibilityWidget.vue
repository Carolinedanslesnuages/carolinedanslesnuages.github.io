<script setup>
/**
 * Desktop widget: the RGAA checks of the last publication (accessibilite.json, written by
 * test/browser/rgaa.mjs in the publishing workflow). Without a result, the widget is not shown.
 */
import { ref, onMounted } from 'vue';

const result = ref(null);

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}accessibilite.json`, { cache: 'no-cache' });
    if (!response.ok) return;
    const content = await response.json();
    if (Number.isInteger(content.passed) && Number.isInteger(content.total) && content.total > 0) result.value = content;
  } catch {
    /* no result: no widget */
  }
});
</script>

<template>
  <aside v-if="result" class="desk-widget access-widget" aria-labelledby="access-title">
    <h2 id="access-title">Accessibilité</h2>
    <p class="widget-value">{{ result.passed }}/{{ result.total }}</p>
    <p>vérifications RGAA réussies<template v-if="result.criteria">, sur {{ result.criteria }} critères</template>, à chaque publication.</p>
    <p class="widget-source">
      Grâce à <a href="https://github.com/Carolinedanslesnuages/marguerite">Marguerite</a>, qui donne les textes officiels du RGAA,
      et <a href="https://github.com/Carolinedanslesnuages/emmanuelle">Emmanuelle</a>, qui contrôle le site.
    </p>
  </aside>
</template>
