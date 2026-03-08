import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      source: { entry: { index: './src/index.ts' } },
      format: 'esm',
      syntax: ['node 18'],
      dts: true,
      output: { distPath: { root: './dist' } },
    },
    {
      source: { entry: { stdio: './src/stdio.ts' } },
      format: 'esm',
      syntax: ['node 18'],
      dts: false,
      output: { distPath: { root: './dist' } },
    },
    {
      source: { entry: { http: './src/http.ts' } },
      format: 'esm',
      syntax: ['node 18'],
      dts: false,
      output: { distPath: { root: './dist' } },
    },
  ],
});
