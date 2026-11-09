import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  build: { target: 'es2022' },
  test: {
    environment: 'node',
    // Tests are pure and short. A slow test is a bug: keep simulations under ~2,000 steps.
    testTimeout: 5_000,
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/render.ts',
        'src/scenery.ts',
        'src/camera.ts',
        'src/audio.ts',
        'src/**/*.test.ts',
      ],
      thresholds: { lines: 85, functions: 85, branches: 75, statements: 85 },
    },
  },
});
