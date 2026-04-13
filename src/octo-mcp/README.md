# Octo Design MCP Server

Octo Design MCP Server 是一个面向 AI 的设计稿处理服务，支持从 Octo 平台下载设计稿并转换为可用的代码文件。

## 功能

提供两个 MCP 工具：

### 工具一：`get_design_data`

下载设计稿并转换为 DSL / HTML / Vue，支持四种用法：

| 用法 | 参数 | 说明 |
|------|------|------|
| 下载（分享口令） | `input: "##53085E4C##"` | 通过口令下载预生成的代码文件到 `.octo/`，无需 Token |
| 下载 + 转换（fileKey） | `input: "abc123"` | 下载原始设计稿 JSON 并转换为 DSL / HTML / Vue |
| 转换本地文件 | `file: "page-home"` | 转换 `.octo/` 目录下已有的文件 |
| 列出本地文件 | 不传参数 | 列出 `.octo/` 目录下所有可用文件 |

### 工具二：`generate_arkui_dsl`

从本地设计稿 JSON + 截图生成 ArkUI DSL JSON。

**流程：** 读取截图 → base64 → YOLO 检测 → 设计稿 JSON + YOLO 结果 → 布局引擎 → ArkUI DSL → 保存到 `.octo/`

## 使用示例

### 场景 1：有设计稿 JSON + 截图（完整模式）

用户对 AI 说：

> "帮我把 `.octo/design.json` 和 `.octo/screenshot.png` 生成 ArkUI DSL"

AI 调用：

```json
generate_arkui_dsl({
  projectRoot: "/Users/xxx/my-project",
  designJson: ".octo/design.json",
  image: ".octo/screenshot.png"
})
```

输出：`.octo/design.arkui-dsl.json`

### 场景 2：只有设计稿 JSON，没有截图

用户对 AI 说：

> "把 `.octo/home-page.json` 转成 ArkUI DSL"

AI 调用时不传 `image`，跳过 YOLO 检测，仅用设计稿 JSON 生成（精度略低但仍可用）。

### 场景 3：指定页面名和输出名

用户对 AI 说：

> "用 `design/login.json` 和 `design/login.png` 生成 ArkUI，页面名叫'登录页'"

```json
generate_arkui_dsl({
  projectRoot: "/Users/xxx/my-project",
  designJson: "design/login.json",
  image: "design/login.png",
  pageName: "登录页"
})
```

### 场景 4：先下载设计稿，再生成 ArkUI DSL

> 第一步："下载设计稿 `##53085E4C##`"
>
> → AI 调用 `get_design_data`，文件保存到 `.octo/`
>
> 第二步："用下载的 JSON 和我的截图 `screenshots/home.png` 生成 ArkUI DSL"
>
> → AI 调用 `generate_arkui_dsl`

## 前提条件

使用 `generate_arkui_dsl` 时，用户本地项目需要准备：

| 文件 | 必需 | 说明 |
|------|------|------|
| 设计稿 JSON | 是 | 从 Pixso/Octo 导出，或通过 `get_design_data` 下载 |
| 页面截图 | 否 | 设计稿的截图（PNG/JPG/WebP），提供时启用 YOLO 视觉识别增强精度 |

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

### `get_design_data`

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

### `generate_arkui_dsl`

```
generate_arkui_dsl({
  projectRoot: string   // 【必填】项目根目录绝对路径
  designJson:  string   // 【必填】设计稿 JSON 文件路径（相对 projectRoot 或绝对路径）
  image?:      string   // 截图文件路径，提供时调用 YOLO 检测增强精度
  pageName?:   string   // 页面名称，默认 "Page"
  saveName?:   string   // 输出文件名（不含扩展名），默认从 designJson 推导
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
