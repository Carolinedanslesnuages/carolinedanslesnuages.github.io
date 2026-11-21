import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Project files form a large chunk loaded after the first paint: this is intended.
export default defineConfig({ plugins: [vue()], build: { chunkSizeWarningLimit: 1500 } });
