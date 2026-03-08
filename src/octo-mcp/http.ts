#!/usr/bin/env node

/**
 * Octo MCP Server - HTTP (Streamable) 入口
 *
 * 启动方式: node dist/octo-http.js [--port PORT] [--host HOST] [--stateless] [--timeout MINUTES]
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createOctoMCPServer, getPackageVersion } from './server.js';
import { tools } from './tools/index.js';
import { SERVER_NAME, SERVER_DISPLAY_NAME } from './config.js';

interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

const sessions = new Map<string, SessionInfo>();
let SESSION_TIMEOUT = 30 * 60 * 1000;

function parseArgs(): { port: number; host: string; stateless: boolean; timeout: number } {
  const args = process.argv.slice(2);
  let port = 3001;
  let host = '0.0.0.0';
  let stateless = false;
  let timeout = 30;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      port = parseInt(args[i + 1], 10); i++;
    } else if ((args[i] === '--host' || args[i] === '-h') && args[i + 1]) {
      host = args[i + 1]; i++;
    } else if (args[i] === '--stateless') {
      stateless = true;
    } else if ((args[i] === '--timeout' || args[i] === '-t') && args[i + 1]) {
      timeout = parseInt(args[i + 1], 10); i++;
    } else if (args[i] === '--help') {
      console.log(`
${SERVER_DISPLAY_NAME} MCP Server (Streamable HTTP)

Usage: octo-mcp-http [options]

Options:
  --port, -p PORT       监听端口 (默认: 3001)
  --host, -h HOST       监听地址 (默认: 0.0.0.0)
  --stateless           无状态模式
  --timeout, -t MINUTES 会话超时（分钟，默认: 30）
  --help                帮助信息

Endpoints:
  POST /mcp         MCP 消息端点
  GET  /mcp         SSE 流端点
  GET  /health      健康检查
`);
      process.exit(0);
    }
  }

  return { port, host, stateless, timeout };
}

function cleanupSessions() {
  const now = Date.now();
  for (const [id, info] of sessions) {
    if (now - info.lastActivity > SESSION_TIMEOUT) {
      sessions.delete(id);
      info.transport.close().catch(() => {});
    }
  }
}

setInterval(cleanupSessions, 60 * 1000);

async function main() {
  const { port, host, stateless, timeout } = parseArgs();
  const version = getPackageVersion();

  SESSION_TIMEOUT = timeout * 60 * 1000;

  const server = createOctoMCPServer();

  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

    if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok', name: SERVER_NAME, version,
        transport: 'streamable-http', stateless,
        activeSessions: sessions.size,
      }));
      return;
    }

    if (url.pathname === '/mcp') {
      const sessionId = req.headers['mcp-session-id'] as string;

      const MAX_BODY_SIZE = 1024 * 1024;
      let body = '';
      let bodySize = 0;
      let bodyTooLarge = false;

      req.on('data', (chunk) => {
        if (bodyTooLarge) return;
        bodySize += chunk.length;
        if (bodySize > MAX_BODY_SIZE) {
          bodyTooLarge = true;
          if (!res.headersSent) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Request body too large' }));
          }
          req.destroy();
        } else {
          body += chunk.toString();
        }
      });

      await new Promise<void>((resolve) => {
        req.on('close', resolve);
        req.on('error', resolve);
        req.on('end', async () => {
          if (bodyTooLarge) { resolve(); return; }
          try {
            let transport: StreamableHTTPServerTransport;

            if (stateless) {
              transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
              await server.connect(transport);
            } else if (sessionId && sessions.has(sessionId)) {
              transport = sessions.get(sessionId)!.transport;
              sessions.get(sessionId)!.lastActivity = Date.now();
            } else {
              const newId = sessionId || crypto.randomUUID();
              transport = new StreamableHTTPServerTransport({ sessionIdGenerator: () => newId });
              await server.connect(transport);
              sessions.set(newId, { transport, lastActivity: Date.now() });
            }

            if (req.method === 'GET') {
              transport.handleRequest(req, res).catch(() => {});
              resolve();
              return;
            }

            let parsedBody: Record<string, unknown> | undefined;
            if (body.trim()) {
              try { parsedBody = JSON.parse(body); } catch { parsedBody = undefined; }
            }
            await transport.handleRequest(req, res, parsedBody);
          } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32000, message: msg }, id: null }));
            }
          }
          resolve();
        });
      });
      return;
    }

    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: SERVER_NAME, version,
        description: `${SERVER_DISPLAY_NAME} MCP Server`,
        transport: 'streamable-http', stateless,
        tools: tools.map(t => t.name),
      }, null, 2));
      return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown endpoint', path: url.pathname }));
  });

  httpServer.listen(port, host, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║  ${SERVER_DISPLAY_NAME} MCP Server v${version.padEnd(10)}          ║
╠════════════════════════════════════════════════╣
║  地址: http://${host}:${port}
║  模式: ${stateless ? '无状态' : '有状态'}
║  工具: ${tools.map(t => t.name).join(', ')}
╚════════════════════════════════════════════════╝
`);
  });

  const shutdown = async () => {
    console.log('\n正在关闭...');
    for (const [, info] of sessions) {
      try { await info.transport.close(); } catch { /* ignore */ }
    }
    sessions.clear();
    httpServer.close(() => { console.log('已关闭'); process.exit(0); });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  const msg = error instanceof Error ? error.message : String(error);
  console.error(`${SERVER_DISPLAY_NAME} MCP Server (HTTP) 启动失败: ${msg}`);
  process.exit(1);
});
