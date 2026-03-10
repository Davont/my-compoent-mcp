# @my-design/mcp

my-design 组件库的 MCP Server，让 AI 能够查询组件文档、Props、示例、源码、Design Tokens，生成符合规范的代码。

## 工具一览

| 工具 | 说明 |
|------|------|
| `get_context_bundle` | 一次性获取组件的完整上下文（文档 + Props + 示例 + Tokens），适合代码生成场景 |
| `component_search` | 按关键词搜索组件，返回匹配列表和适用场景 |
| `component_details` | 获取组件详情（Props、Events、行为说明），支持按章节和属性过滤 |
| `theme_tokens` | 查询 Design Tokens（颜色、字号、间距等）和 CSS 变量映射 |
| `changelog_query` | 查询组件变更日志和 breaking changes |
| `source_inspect` | 查看组件源码结构和关键函数实现 |
| `fetch_design_data` | 从 Octo 平台下载设计稿到本地（支持分享口令和 fileKey） |
| `design_to_code` | 将设计稿 JSON 转换为 DSL / HTML / Vue 代码 |

## 快速开始

### 安装依赖

```bash
npm install
```

### 构建

```bash
npm run build
```

### 启动

**Stdio 模式**（Cursor / Claude Desktop 等 MCP 客户端）：

```bash
node dist/stdio.js
```

**HTTP 模式**：

```bash
node dist/http.js --port 3000
```

### MCP 客户端配置

```json
{
  "mcpServers": {
    "my-design": {
      "command": "node",
      "args": ["/path/to/dist/stdio.js"]
    }
  }
}
```

## 环境变量

| 变量 | 必需 | 说明 |
|------|------|------|
| `OCTO_API_BASE` | 否 | Octo API 地址（fileKey 下载模式需要） |
| `OCTO_TOKEN` | 否 | Octo 认证 Token（fileKey 下载模式需要） |
| `OCTO_DIR` | 否 | `.octo/` 目录路径，默认当前目录 |
| `COMPONENT_PACKAGE_ROOT` | 否 | 组件包源码路径（source_inspect 用），默认读 node_modules/@douyinfe/semi-ui |

## 项目结构

```
src/
  tools/          # MCP 工具定义和处理器
  utils/          # 工具函数（文档读取、源码解析等）
  server.ts       # MCP Server 创建和配置
  stdio.ts        # stdio 传输入口
  http.ts         # HTTP 传输入口
doc/
  components/     # 组件文档（Markdown）
  tokens/         # Design Tokens（JSON）
  guidelines/     # 设计规范
  changelog/      # 变更日志
  index.json      # 组件索引
tests/
  tools/          # 工具测试
  utils/          # 工具函数测试
```

## 开发

```bash
npm run build          # 构建
npm run dev            # watch 模式
npx rstest run         # 运行测试
```

## 控量策略

工具设计遵循渐进式获取，减少 token 消耗：

- `component_details` brief 模式只返回概述 + Props 名称列表
- `sections` 参数按需获取指定章节
- `propFilter` 只返回指定属性
- 大文档自动隐藏代码块，配合 `get_code_block` 按需获取
- `get_context_bundle` 一次打包常用上下文，减少多次调用
