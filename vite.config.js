import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Les fichiers des projets forment un gros morceau chargé après le premier affichage : c'est voulu.
export default defineConfig({ plugins: [vue()], build: { chunkSizeWarningLimit: 900 } });
