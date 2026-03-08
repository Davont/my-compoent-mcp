#!/usr/bin/env node

/**
 * 为 dist-octo/ 生成独立的 package.json
 * 运行时机：npm run build 之后、npm run pack:octo 之前
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootPkg = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf-8'));

const octoPkg = {
  name: '@octo/mcp',
  version: rootPkg.version,
  description: 'Octo MCP Server - 通用设计稿处理工具，下载设计数据并转换为 DSL / HTML / Vue',
  type: 'module',
  bin: {
    'octo-mcp': './stdio.js',
    'octo-mcp-http': './http.js',
  },
  engines: { node: '>=18.0.0' },
  license: rootPkg.license,
  dependencies: {
    '@modelcontextprotocol/sdk': rootPkg.dependencies['@modelcontextprotocol/sdk'],
    'adm-zip': rootPkg.dependencies['adm-zip'],
  },
};

writeFileSync(
  join(__dirname, '../dist-octo/package.json'),
  JSON.stringify(octoPkg, null, 2) + '\n',
);

console.log('dist-octo/package.json generated');
