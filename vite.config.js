import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

// Each project's files are a separate chunk, loaded when the project is opened.
export default defineConfig({ plugins: [vue()] });
