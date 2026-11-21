<script setup>
/**
 * Easter egg « humeur » : un emoji qui enchaîne les expressions en tremblant, puis se pose.
 * Accessibilité : l'animation dure moins de 5 secondes (RGAA 13.8 : pas besoin de pause en
 * dessous), aucune animation si le système en demande moins, et l'emoji qui défile est masqué
 * aux lecteurs d'écran : seule l'humeur finale est lue (annonce de la commande).
 */
import { ref, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({ humeur: { type: Object, required: true } });
const DUREE_MS = 3600;
const PAS_MS = 170;

const affiche = ref(props.humeur.emoji);
const fini = ref(false);
let minuteur = null;

onMounted(() => {
  const calme = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (calme) {
    fini.value = true;
    return;
  }
  const debut = Date.now();
  let i = 0;
  minuteur = setInterval(() => {
    if (Date.now() - debut >= DUREE_MS) {
      clearInterval(minuteur);
      affiche.value = props.humeur.emoji;
      fini.value = true;
      return;
    }
    i = (i + 1 + Math.floor(Math.random() * 3)) % props.humeur.suite.length;
    affiche.value = props.humeur.suite[i];
  }, PAS_MS);
});
onBeforeUnmount(() => minuteur && clearInterval(minuteur));
</script>

<template>
  <span class="humeur">
    <span :class="['humeur-emoji', { agite: !fini }]" aria-hidden="true">{{ affiche }}</span>
    <span v-if="fini" class="humeur-texte"><b>{{ humeur.nom }}</b> · {{ humeur.detail }}</span>
  </span>
</template>
