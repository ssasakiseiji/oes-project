import path from 'node:path';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    // Mismo alias que vite.config.ts. Sin esto no se puede testear ningún
    // componente que toque los de ui/ (todos importan `@/lib/utils`), y el
    // fallo llega como "Failed to resolve import", no como un test rojo.
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.js',
        css: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'src/test/',
                '**/*.spec.{js,jsx}',
                '**/*.test.{js,jsx}',
            ],
        },
    },
});
