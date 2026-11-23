import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './' so the built files also work inside the Android app
export default defineConfig({ base: './', plugins: [react()] });
