import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  target: 'es2020',
  outDir: 'dist',
  splitting: false,
  skipNodeModulesBundle: true,
  tsconfig: './tsconfig.json',
});

