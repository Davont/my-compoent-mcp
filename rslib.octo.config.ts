import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      source: { entry: { stdio: './src/octo-mcp/stdio.ts' } },
      format: 'esm',
      syntax: ['node 18'],
      dts: false,
      output: { distPath: { root: './dist-octo' } },
    },
    {
      source: { entry: { http: './src/octo-mcp/http.ts' } },
      format: 'esm',
      syntax: ['node 18'],
      dts: false,
      output: { distPath: { root: './dist-octo' } },
    },
  ],
});
