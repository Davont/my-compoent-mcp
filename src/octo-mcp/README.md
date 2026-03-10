# Octo Design MCP Server

Octo Design MCP Server 是一个面向 AI 的设计稿处理服务，支持从 Octo 平台下载设计稿并转换为可用的代码文件。

## 功能

提供一个 MCP 工具 `get_design_data`，支持三种用法：

| 用法 | 参数 | 说明 |
|------|------|------|
| 下载（分享口令） | `input: "##53085E4C##"` | 通过口令下载预生成的代码文件到 `.octo/`，无需 Token |
| 下载 + 转换（fileKey） | `input: "abc123"` | 下载原始设计稿 JSON 并转换为 DSL / HTML / Vue |
| 转换本地文件 | `file: "page-home"` | 转换 `.octo/` 目录下已有的文件 |
| 列出本地文件 | 不传参数 | 列出 `.octo/` 目录下所有可用文件 |

## 快速开始

### 1. 构建

```bash
npm run build
```

### 2. 启动

**Stdio 模式**（用于 Cursor、Claude Desktop 等 MCP 客户端）：

```bash
node dist/octo-stdio.js
```

**HTTP 模式**（用于 Web 集成）：

```bash
node dist/octo-http.js --port 3001
```

### 3. MCP 客户端配置示例

```json
{
  "mcpServers": {
    "octo-design": {
      "command": "node",
      "args": ["/path/to/dist/octo-stdio.js"],
      "env": {
        "OCTO_API_BASE": "https://your-octo-api.example.com/api/v1",
        "OCTO_TOKEN": "your-token"
      }
    }
  }
}
```

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `OCTO_API_BASE` | fileKey 模式需要 | Octo 平台 API 地址 |
| `OCTO_TOKEN` | fileKey 模式需要 | Octo 平台认证 Token |
| `OCTO_DIR` | 否 | 自定义 `.octo/` 目录路径，默认为当前目录下的 `.octo/` |

> 分享口令模式不需要配置任何环境变量。

## 工具参数

```
get_design_data({
  input?:      string   // 设计稿标识（口令或 fileKey），与 file 二选一
  file?:       string   // 本地文件名（不含扩展名），与 input 二选一
  outputMode?: string   // 输出格式：dsl / html / vue（默认 html，仅 fileKey 模式生效）
  nodeId?:     string   // 节点 ID，只下载指定子树（仅 fileKey 模式）
  saveName?:   string   // 自定义保存文件名
  timeout?:    number   // 超时时间（毫秒），默认 30000
  overwrite?:  boolean  // 是否覆盖已有文件，默认 true
})
```

## HTTP 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/mcp` | MCP 消息端点 |
| GET | `/mcp` | SSE 流端点 |
| GET | `/health` | 健康检查 |

HTTP 启动参数：

```
--port, -p PORT        监听端口（默认 3001）
--host, -h HOST        监听地址（默认 0.0.0.0）
--stateless            无状态模式
--timeout, -t MINUTES  会话超时（分钟，默认 30）
```
