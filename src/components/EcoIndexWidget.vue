<script setup>
/**
 * Desktop widget: the EcoIndex of the home page, measured at publication (ecoindex.json, written
 * by scripts/compute-ecoindex.py with the official package). Without a measurement, the widget is not
 * shown: no grade is ever invented.
 */
import { ref, computed, onMounted } from 'vue';

const GRADES = 'ABCDEFG';
const result = ref(null);

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}ecoindex.json`, { cache: 'no-cache' });
    if (!response.ok) return;
    const content = await response.json();
    if (GRADES.includes(content.grade) && content.grade.length === 1 && Number.isFinite(content.score)) result.value = content;
  } catch {
    /* no measurement: no widget */
  }
});

const measuredOn = computed(() =>
  result.value && result.value.measuredAt
    ? new Date(result.value.measuredAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '',
);
</script>

<template>
  <aside v-if="result" class="desk-widget eco-widget" aria-labelledby="eco-title">
    <h2 id="eco-title">EcoIndex de la page</h2>
    <p class="widget-value"><span :class="['eco-grade', `grade-${result.grade.toLowerCase()}`]">{{ result.grade }}</span> {{ result.score }}/100</p>
    <p>{{ result.nodes }} éléments · {{ result.requests }} requêtes · {{ Math.round(result.sizeKb) }} Ko transférés</p>
    <p class="widget-source">
      Calculé avec la méthode <a href="https://www.ecoindex.fr/comment-ca-marche/">EcoIndex</a> (GreenIT, CNUMR){{ measuredOn ? `, le ${measuredOn}` : '' }}.
    </p>
  </aside>
</template>
