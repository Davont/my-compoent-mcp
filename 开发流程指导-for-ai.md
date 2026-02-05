# MCP 参考实现对比（magic-mcp vs semi-mcp）

本文基于 `reference/mcp/` 下的两个参考实现：

- `reference/mcp/magic-mcp`（Magic UI MCP）
- `reference/mcp/semi-mcp`（Semi MCP Server）

目标是帮助第一次开发 MCP 的同学快速理解：**一个“组件库 MCP”通常长什么样**、两种实现路线的**共同点与关键取舍**，以及对自研 **my-design MCP** 的落地建议。

---

## 1. 共同点（组件库 MCP 的“标准形态”）

两者虽然工程/能力差异很大，但在 MCP 形态上高度一致：

- **都基于 `@modelcontextprotocol/sdk`**：实现 MCP Server，让 MCP Client（Cursor/Claude 等）可调用。
- **默认支持 stdio transport**：适配 IDE 本地通过 `npx ...` 拉起进程，走 JSON-RPC 通信。
- **以 Tools 为主**：把能力拆成一组工具（tool name + description + input schema + content output）。
- **npm 分发 + CLI 启动**：`package.json` 中提供 `bin`，支持 `npx -y <pkg>` 或全局安装后直接运行。
- **工程分层相似**：
  - 入口（server/transport）
  - tools 定义与 handlers
  - utils（数据获取、格式化、缓存、解析等）

---

## 2. 核心差异（两条路线：工具聚合 vs 通用查询 + 控量）

### 2.1 工具设计策略

#### `magic-mcp`：多工具、按类别聚合（解决“tool 数量限制”）

- 工具按类别拆分：`getLayout` / `getMedia` / `getMotion` ...（多数 **无入参**）。
- 原因在 README 里写得很直白：一些 MCP Client 对可调用工具数量有限制，因此通过“分类”来控制 tool 数量与调用路径。
- 结果是：工具语义更“高层”，更像“一次性返回一类组件的实现细节”。

#### `semi-mcp`：少工具、强参数化（解决“版本/大文档/大代码/稳定性”）

- 少量通用工具：文档、文件列表、文件代码、函数代码、文档代码块等。
- 每个工具都有明确的参数（组件名/版本/路径/函数名/分页等），便于扩展与精确查询。
- 结果是：工具语义更“底层/通用”，更像“查询接口 + 组合工作流”。

### 2.2 数据源与适配复杂度

#### `magic-mcp`

- 直接请求站点数据（`registry.json`、组件/示例 JSON）。
- 本质是“在线 registry → 结构化 JSON → 返回”。
- 优点：实现简单、输出结构化，维护成本较低。
- 风险：对外网/公开站点依赖强；如果是内网组件库，需要替换为内网数据源。

#### `semi-mcp`

- 同时面向“文档内容”和“npm 包文件内容”（用 unpkg/npmmirror 拉取），并提供版本解析。
- 优点：适配“组件文档 + 源码/构建产物”双维度，并能在版本上精确定位。
- 风险：实现复杂，需要解决版本解析、缓存、网络失败、以及大内容的控量输出。

### 2.3 输出控量（上下文友好）

`semi-mcp` 在控量方面做得更“产品化”，典型做法：

- **大文档隐藏代码块**：返回占位提示，另一个工具 `get_semi_code_block` 再取指定代码块。
- **changelog 分页**：`changelog-1/changelog-2...`，每页固定行数。
- **大文件去函数体**：`get_file_code` 默认只给结构（函数体替换 `{ ... }`），再用 `get_function_code` 精读目标函数。

`magic-mcp` 的主要控量手段是“按类别拆 tool”，并通过“分组工具”减少工具数量限制压力，但对“单次返回内容的体量”控制相对弱一些。

### 2.4 传输层与服务化能力

- `magic-mcp`：主打 stdio。
- `semi-mcp`：同时提供 **stdio** 与 **Streamable HTTP**（`semi-mcp-http`），并支持 stateful/stateless 会话模式与健康检查，更贴近“可服务化部署”的路径。

### 2.5 Resources / Prompts 覆盖情况

- **Resources**：
  - `semi-mcp`：实现了资源 `semi://components`（list/read）。
  - `magic-mcp`：基本不做 resources（以 tools 输出为主）。
- **Prompts**：
  - 两者都没有重点实现 prompts（更偏“工具型 MCP server”）。

---

## 3. 对照 MCP 规范：你应该重点关注的能力面

结合两个参考实现，可以把 MCP 能力拆成 4 层（从“能跑”到“可规模化”）：

1. **协议与传输**：stdio / streamable HTTP（是否需要服务化、是否需要断线恢复）
2. **Tools**：工具集合是否足够“通用 + 可组合”，以及 input/output 是否结构化、可控量
3. **Resources**：稳定的数据（组件列表/规范/token/示例索引/figma链接等）是否更适合放 resources
4. **Prompts/Skills（上层）**：如果要“生成符合规范的页面”，更应该放到 Skills 工作流里，通过工具取事实、再产出代码与建议

---

## 4. 对 my-design MCP 的落地建议（基于内网 + 规范绑定）

你当前诉求是：**大部门统一使用 my-design + `xxx 设计规范`，希望 AI 生成默认符合规范的页面**。
这类需求更接近 `semi-mcp` 的路线：**少量通用工具 + 强参数化 + 强控量 + 版本/缓存**，再配 Skills 做“交付型工作流”。

### 4.1 MCP（工具与资源层）建议做什么

#### 最小可用（建议先做）

- `component_list`：组件列表（建议同时提供分类/状态等元数据）
- `component_search`：按需求检索组件 + 替代方案 + 适用/不适用条件
- `component_details`：组件 API（props/slots/events/variants/defaults + 约束 + a11y + 依赖/初始化）
- `component_examples`：最小示例 + 常见组合（最好可按框架/工程模板返回）
- `theme_tokens`：token 定义 + CSS 变量映射 + 主题差异
- `changelog_query`：breaking changes + 迁移提示（必要时分页/按版本过滤）

#### 可选增强（把“深度理解/排查/二开”补齐）

- `get_component_file_list` / `get_file_code` / `get_function_code`（或等价能力）
- 大文档/大文件控量策略（代码块提取、分页、去函数体）
- 版本解析 + 缓存（尤其是“latest→实际版本”的解析与缓存）
- resources：把“稳定索引类数据”放资源（组件清单、规范目录、token 词典、Figma 链接索引等）

### 4.2 Skills（落地与生成层）建议做什么

Skills 的定位是：**把 MCP 的事实数据，变成“能交付的页面/方案/迁移步骤”**，尤其是规范绑定场景：

- 规范驱动页面生成：把需求 → 页面结构/布局 → 组件组合 → token 赋值 → 产出代码 + 校验清单
- 选型决策工作流：`component_search` → `component_details` → 最终推荐 + 理由
- 迁移工作流：`changelog_query` → 影响面分析 → 迁移步骤 + 风险点 + 回滚建议
- 排查/二开工作流：文件列表 → 结构阅读 → 精读函数 → 给出修复建议

### 4.3 一句话决策：什么时候学谁

- **先跑通 + 快速出效果**：先学 `magic-mcp`（简单、直观、工具多但逻辑简单）
- **要版本、要控量、要服务化、要深度排查**：学 `semi-mcp`（产品化、可规模化）
- **内网组件库 + 规范绑定**：工具层建议学 `semi-mcp`，工作流/生成建议用 Skills 承接

---

## 5. 推荐你复刻/对照阅读的关键文件（按优先级）

### `semi-mcp`（建议重点学）

- `src/server.ts`：capabilities + ListTools/CallTool + Resources
- `src/stdio.ts`：stdio 入口与“不要污染 stdout”的注意事项
- `src/http.ts`：Streamable HTTP（服务化路线）
- `src/tools/*`：通用工具设计（文档/代码/函数/分页/控量）
- `src/utils/*`：版本解析、缓存、unpkg/npmmirror 双源容错

### `magic-mcp`（建议学工具分组思路）

- `src/server.ts`：`McpServer` 高层封装、按类别注册工具、应对客户端工具数限制
