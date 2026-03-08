/**
 * Octo MCP Server 共享配置
 *
 * 精简版 MCP Server，只注册 get_design_data 一个工具，无 Resources。
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tools, toolHandlers } from './tools/index.js';
import { SERVER_NAME } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getPackageVersion(): string {
  for (const rel of ['./package.json', '../package.json', '../../package.json']) {
    try {
      return JSON.parse(readFileSync(join(__dirname, rel), 'utf-8')).version;
    } catch { /* try next */ }
  }
  return '0.1.0';
}

export function createOctoMCPServer(): Server {
  const version = getPackageVersion();

  const server = new Server(
    { name: SERVER_NAME, version },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const handler = toolHandlers[name];
    if (!handler) throw new Error(`未知的工具: ${name}`);
    return handler(args || {});
  });

  return server;
}

export { getPackageVersion };
