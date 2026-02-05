#!/usr/bin/env node

/**
 * my-design MCP Server - HTTP (Streamable) 入口
 * 
 * 使用 Streamable HTTP 作为传输层的 MCP 服务器
 * 这是 MCP 推荐的服务化部署方案，支持无状态通信和连接恢复
 * 
 * 启动方式: node dist/http.js [--port PORT] [--host HOST] [--stateless] [--timeout MINUTES]
 * 默认端口: 3000
 * 默认主机: 0.0.0.0 (监听所有网络接口)
 * 默认超时: 30 分钟
 */

import { createServer, IncomingMessage, ServerResponse } from 'http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMCPServer, getPackageVersion } from './server.js';

// 会话存储：sessionId -> transport
interface SessionInfo {
  transport: StreamableHTTPServerTransport;
  lastActivity: number;
}

const sessions = new Map<string, SessionInfo>();
let SESSION_TIMEOUT = 30 * 60 * 1000; // 默认 30 分钟

/**
 * 解析命令行参数
 */
function parseArgs(): { port: number; host: string; stateless: boolean; timeout: number } {
  const args = process.argv.slice(2);
  let port = 3000;
  let host = '0.0.0.0';
  let stateless = false;
  let timeout = 30;

  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--port' || args[i] === '-p') && args[i + 1]) {
      port = parseInt(args[i + 1], 10);
      i++;
    } else if ((args[i] === '--host' || args[i] === '-h') && args[i + 1]) {
      host = args[i + 1];
      i++;
    } else if (args[i] === '--stateless') {
      stateless = true;
    } else if ((args[i] === '--timeout' || args[i] === '-t') && args[i + 1]) {
      timeout = parseInt(args[i + 1], 10);
      i++;
    } else if (args[i] === '--help') {
      console.log(`
my-design MCP Server (Streamable HTTP)

Usage: my-design-mcp-http [options]

Options:
  --port, -p PORT       指定监听端口 (默认: 3000)
  --host, -h HOST       指定监听地址 (默认: 0.0.0.0)
  --stateless           无状态模式，不生成 session ID
  --timeout, -t MINUTES 会话超时时间，单位分钟 (默认: 30)
  --help                显示帮助信息

Endpoints:
  POST /mcp         MCP 消息端点 (Streamable HTTP)
  GET  /mcp         SSE 流端点 (用于服务器推送)
  GET  /health      健康检查端点
`);
      process.exit(0);
    }
  }

  return { port, host, stateless, timeout };
}

/**
 * 清理过期会话
 */
function cleanupSessions() {
  const now = Date.now();
  for (const [sessionId, info] of sessions) {
    if (now - info.lastActivity > SESSION_TIMEOUT) {
      sessions.delete(sessionId);
    }
  }
}

// 每分钟清理一次过期会话
setInterval(cleanupSessions, 60 * 1000);

async function main() {
  const { port, host, stateless, timeout } = parseArgs();
  const version = getPackageVersion();
  
  SESSION_TIMEOUT = timeout * 60 * 1000;

  // 创建 MCP 服务器
  const server = createMCPServer();

  // 创建 HTTP 服务器
  const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
    res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

    // 处理 OPTIONS 预检请求
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // 健康检查端点
    if (url.pathname === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        name: 'my-design-mcp',
        version,
        transport: 'streamable-http',
        stateless,
        sessionTimeout: `${timeout} minutes`,
        activeSessions: sessions.size,
      }));
      return;
    }

    // MCP 端点
    if (url.pathname === '/mcp') {
      const sessionId = req.headers['mcp-session-id'] as string;

      // 读取请求体
      let body = '';
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      await new Promise<void>((resolve) => {
        req.on('end', async () => {
          try {
            let transport: StreamableHTTPServerTransport;

            if (stateless) {
              // 无状态模式
              transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
              });
              await server.connect(transport);
            } else {
              // 有状态模式
              if (sessionId && sessions.has(sessionId)) {
                // 复用已有会话
                transport = sessions.get(sessionId)!.transport;
                sessions.get(sessionId)!.lastActivity = Date.now();
              } else {
                // 创建新会话
                const newSessionId = sessionId || crypto.randomUUID();
                transport = new StreamableHTTPServerTransport({
                  sessionIdGenerator: () => newSessionId,
                });
                await server.connect(transport);
                
                sessions.set(newSessionId, {
                  transport,
                  lastActivity: Date.now(),
                });
              }
            }

            // GET 请求（SSE 流）
            if (req.method === 'GET') {
              transport.handleRequest(req, res).catch(() => {});
              resolve();
              return;
            }
            
            // POST 请求：解析请求体
            let parsedBody: Record<string, unknown> | undefined;
            if (body.trim()) {
              try {
                parsedBody = JSON.parse(body);
              } catch {
                parsedBody = undefined;
              }
            }
            
            await transport.handleRequest(req, res, parsedBody);

          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (!res.headersSent) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ 
                jsonrpc: '2.0',
                error: { code: -32000, message: errorMessage },
                id: null,
              }));
            }
          }
          
          resolve();
        });
      });
      return;
    }

    // 根路径
    if (url.pathname === '/' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        name: 'my-design-mcp',
        version,
        description: 'my-design MCP Server (Streamable HTTP)',
        transport: 'streamable-http',
        stateless,
        sessionTimeout: `${timeout} minutes`,
        endpoints: {
          mcp: { POST: '/mcp', GET: '/mcp (SSE)' },
          health: '/health',
        },
        tools: [
          'component_list',
          'component_search', 
          'component_details',
          'component_examples',
          'theme_tokens',
          'changelog_query',
        ],
      }, null, 2));
      return;
    }

    // 404
    console.log(`[404] 未知端点: ${req.method} ${url.pathname}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unknown endpoint', path: url.pathname, method: req.method }));
  });

  // 启动服务器
  httpServer.listen(port, host, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           my-design MCP Server (Streamable HTTP) v${version.padEnd(10)}      ║
╠══════════════════════════════════════════════════════════════════════╣
║  监听地址: http://${host}:${port}                                      
║  模式: ${stateless ? '无状态 (Stateless)' : '有状态 (Stateful) '}                                        
║  会话超时: ${String(timeout).padEnd(3)} 分钟                                              
║                                                                      ║
║  可用端点:                                                           ║
║    POST   /mcp      发送 MCP 请求                                    ║
║    GET    /mcp      SSE 流 (服务器推送)                              ║
║    GET    /health   健康检查                                         ║
║                                                                      ║
║  可用工具:                                                           ║
║    - component_list      获取组件列表                                ║
║    - component_search    搜索组件                                    ║
║    - component_details   获取组件详情                                ║
║    - component_examples  获取组件示例                                ║
║    - theme_tokens        获取 Design Token                           ║
║    - changelog_query     查询变更日志                                ║
╚══════════════════════════════════════════════════════════════════════╝
`);
  });

  // 优雅关闭
  const shutdown = async () => {
    console.log('\n正在关闭服务器...');

    for (const [, info] of sessions) {
      try {
        await info.transport.close();
      } catch {
        // 忽略关闭错误
      }
    }
    sessions.clear();

    httpServer.close(() => {
      console.log('服务器已关闭');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`my-design MCP Server (Streamable HTTP) 启动失败: ${errorMessage}`);
  process.exit(1);
});
