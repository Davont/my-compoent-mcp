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
export {};
