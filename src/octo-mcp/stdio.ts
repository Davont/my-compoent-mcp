#!/usr/bin/env node

/**
 * Octo MCP Server - stdio 入口
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createOctoMCPServer } from './server.js';
import { SERVER_DISPLAY_NAME } from './config.js';

async function main() {
  const server = createOctoMCPServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${SERVER_DISPLAY_NAME} MCP Server (stdio) 启动失败: ${msg}\n`);
  process.exit(1);
});
