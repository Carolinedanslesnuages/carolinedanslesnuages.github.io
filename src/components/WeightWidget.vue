<script setup>
/**
 * Desktop widget: the weight of the site, as Solange measured it when the site was published
 * (poids.json, written by the publishing workflow). Without a measurement, the widget is not shown:
 * no figure is ever invented.
 */
import { ref, computed, onMounted } from 'vue';

const measurement = ref(null);

onMounted(async () => {
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}poids.json`, { cache: 'no-cache' });
    if (!response.ok) return;
    const content = await response.json();
    if (Number.isFinite(content.totalBytes) && Number.isFinite(content.budgetBytes) && content.budgetBytes > 0) measurement.value = content;
  } catch {
    /* no measurement: no widget */
  }
});

const kilobytes = (bytes) => Math.round(bytes / 1000);
const share = computed(() => (measurement.value ? Math.round((measurement.value.totalBytes / measurement.value.budgetBytes) * 100) : 0));
const measuredOn = computed(() =>
  measurement.value && measurement.value.measuredAt
    ? new Date(measurement.value.measuredAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : '',
);
</script>

<template>
  <aside v-if="measurement" class="weight-widget" aria-labelledby="weight-title">
    <h2 id="weight-title">Poids du site</h2>
    <p class="weight-value">{{ kilobytes(measurement.totalBytes) }} Ko</p>
    <div class="weight-bar" aria-hidden="true"><span :style="{ width: `${Math.min(100, share)}%` }"></span></div>
    <p>{{ share }} % du budget de {{ kilobytes(measurement.budgetBytes) }} Ko</p>
    <p class="weight-source">Mesuré par Solange{{ measuredOn ? ` le ${measuredOn}` : '' }}, en taille compressée.</p>
  </aside>
</template>
