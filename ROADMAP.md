# my-design MCP & Skills 路线图（参考 semi-mcp 模式）

本文用于规划 my-design 组件库的 **MCP Server** 与 **Skills** 建设路线，整体参考 `reference/mcp/semi-mcp` 的工程化方式：**共享 server 配置 + stdio/http 双入口 + 通用工具集合 + 版本/缓存/控量**，并在 Skills 层承接“规范驱动的页面生成”工作流。

---

## 0. 目标与边界（先对齐再开工）

- **目标**：让 AI 在内网环境下，基于 my-design 组件库 + `xxx 设计规范` + token，完成组件选型、代码生成、规范对齐、迁移排查等任务。
- **边界**：
  - MCP 层只做“**可调用的工具与资源**”（返回结构化事实数据/可验证信息）。
  - Skills 层做“**工作流与交付**”（把多个工具串起来产出页面代码与建议）。
- **关键约束**：
  - **控量**：大文档/大代码必须分页/隐藏/按需读取（避免上下文爆炸）。
  - **版本**：必须支持按版本查询（至少支持 `latest` + 指定版本）。
  - **内网数据源**：优先对接内网文档站/JS 资源/Markdown 文件/TypeScript 类型定义（`type.ts`/`.d.ts`）与内部 npm 制品；外网 fetch 仅作为本地开发参考。

---

## 1. 架构设计（推荐：按 semi-mcp 分层）

### 1.0 为什么要区分 MCP Client/Host 与 MCP Server（即使你只发布一个 npm 包）

你最终发布成 **一个 npm 包**，通常发布的是 **MCP Server 的可执行程序（CLI）**；而 **MCP Client/Host** 是 Cursor/Claude 等产品内置的“工具调用宿主”，你不需要开发它。

- **MCP Client/Host（你不做）**：负责对话、选择何时调用工具、启动/管理 MCP Server 进程、通过 MCP 协议（JSON-RPC）发请求/收结果。
- **MCP Server（你做，打包成 npm）**：提供 tools/resources 的实现，接收请求并返回结构化结果。

从“交付形态”看是一个 npm 包，但从“运行时协议角色”看仍然是两端：**Host（客户端）⇄ Server（工具提供方）**。这也是为什么文档/架构图里会把两者分开写，方便你在设计接口、控量、日志、错误处理时不混淆职责。

### 1.1 分层结构

```text
MCP Client/Host (Cursor/Claude/etc 内置，你无需实现)
  |
  |  Transport: stdio (local) / streamable HTTP (service)
  v
MCP Server
  - capabilities: tools/resources
  - ListTools / CallTool / ListResources / ReadResource handlers
  |
  +--> tools/      (工具定义 + handler：只做参数校验与编排)
  |
  +--> utils/      (数据访问/解析/缓存/格式化：可复用、可测试)
        - source adapters (docs/code/registry)
        - cache (file-cache)
        - version resolve
        - output control (paginate, hide blocks, strip bodies)
        - parsers (md/tsx/ast)
  |
  +--> resources/  (稳定索引类数据：组件列表、token字典、规范目录、Figma索引等)
```

### 1.2 设计要点（沿用 semi-mcp 的“工程化套路”）

- **共享 server 配置**：`createMCPServer()` 里统一注册 tools/resources；`stdio.ts` 与 `http.ts` 只负责 transport。
- **服务化优先**：生产环境以 **Streamable HTTP** 为主（交付平台部门部署）；`stdio` 仅用于本地开发/调试。
- **输出控量三板斧**：
  - 大文档：代码块隐藏 + `get_*_code_block` 定点读取
  - changelog：分页（`changelog-1/changelog-2...`）或参数分页（`page/pageSize`）
  - 大代码：结构化返回（去函数体）+ `get_function_code` 精读
- **缓存与容错**：
  - 版本解析缓存（`latest` → 实际版本）
  - 文档/文件内容缓存（key = `package@resolvedVersion/path`）
  - 数据源 fallback（内网优先，必要时镜像/备源）
- **stdio 注意事项**：不要向 stdout/stderr 打印非 JSON-RPC 内容（stdio transport 会被污染）。

---

## 2. 推荐的目录与文件排版（目标：像 semi-mcp 一样可扩展）

### 2.0 数据源策略（基于你的现状：网站链接 + JS 链接 + MD + type.ts + npm 包）

建议不要把“组件库源码仓库”作为 MCP Server 运行时的硬依赖（服务化场景下平台更难挂载/鉴权）。更推荐按如下优先级接入：

1. **优先：npm 制品（可版本化）**  
   - 从组件 npm 包（或独立的 `@my-design/mcp-data` 包）读取：组件索引、示例、token、规范摘要、类型（`.d.ts`/`type.ts` 产物）。
2. **补充：文档站/JS 资源（可作为兜底与富文本）**  
   - 用于补齐 narrative 文档、最佳实践、迁移说明等；尽量避免抓取 HTML，优先消费 MD/JSON/JS manifest。
3. **推荐：随 MCP Server npm 包发布一份专用 `doc/`（MCP Docs）**  
   - 你提到“可以单独写一个 md 文件夹”，这会显著提升落地速度与稳定性：服务化部署时**不依赖源码仓库挂载**，也不依赖文档站可用性；并且内容可控、可索引、可版本化。

#### 2.0.1 参考：`semi-mcp` 是怎么“引用/读取”Semi 的组件库数据的

`semi-mcp` 的思路非常适合拿来复刻：**运行时不依赖源码仓库**，而是把“已发布产物（npm 包）”当作主要数据源，然后通过公共文件服务按需拉取并缓存。

- **主要数据源**：已发布的 npm 包（`@douyinfe/semi-ui`、`@douyinfe/semi-foundation`）
  - **组件列表**：从 `@douyinfe/semi-ui` 的 `lib/` 目录推导组件名（构建产物是稳定入口）
  - **组件文档**：从 `@douyinfe/semi-ui` 的 `content/` 目录读取 Markdown（`content/{category}/{componentName}/index.md`）
  - **源码/实现阅读**：按文件路径从包里读取内容（配合“文件列表 → 文件结构 → 函数精读”）
- **获取方式（不 clone 仓库）**：
  - **目录列表**：调用 unpkg 的 `?meta` 接口获取目录文件清单；同时支持 npmmirror（并做递归扁平化）
  - **文件内容**：同时请求 unpkg 与 npmmirror，使用第一个成功返回的结果（并缓存）
- **版本策略**：
  - 支持 `latest` 等 tag → 解析为实际版本号（每日缓存一次）
  - 对过低版本做 fallback（避免拿到不兼容的旧包结构）
- **强控量（上下文友好）**：
  - 大文档：代码块隐藏为占位符，另提供 `get_semi_code_block` 定点读取
  - changelog：强制分页（`changelog-1/changelog-2...`）
  - 大文件：默认去函数体，只返回结构；再用 `get_function_code` 精读目标函数
- **缓存**：把目录列表/文件内容缓存到用户目录（`~/.semi-mcp/cache`），显著降低重复请求成本
- **传输**：同时提供 stdio 与 Streamable HTTP（服务化），并提供 `/health` 健康检查

> 换句话说：`semi-mcp` 把“npm 制品 + 可版本化文件读取 + 缓存 + 控量”打成了一个可规模化的 MCP Server。

#### 2.0.2 `doc/` 目录规范（随 MCP Server 包发布，降低解析难度与幻觉）

你提到“可以针对 MCP 单独写一个 md 文件夹”，这非常关键：它能让 MCP 的输出更稳定、更可控、更适配自动化索引。

**推荐做法（你已选择）**：把 `doc/` **随 MCP Server npm 包一起发布**（最省平台接入成本、运行时最快）。

- **后续可选演进**：如果 `doc/` 体积膨胀或需要独立发布节奏，再拆分为单独数据包（例如 `@my-design/mcp-data`），由 MCP Server 作为依赖引用。

**建议目录结构**（可从最小集开始）：

```text
doc/
├── index.json                  # 组件索引（供 component_list/search 快速使用）
├── components/
│   ├── button.md               # 单组件文档（机器友好）
│   └── table.md
├── guidelines/
│   ├── overview.md             # `xxx 设计规范` 总览
│   ├── layout.md               # 栅格/间距/布局规则
│   ├── typography.md           # 字体/字号/行高规则
│   └── accessibility.md        # a11y 规则
├── tokens/
│   ├── tokens.json             # token 定义（含分类/描述/默认值）
│   ├── css-variables.json      # token ↔ CSS variable 映射
│   └── themes.json             # 主题差异（light/dark/brand...）
└── changelog/
    └── changelog.md            # 可选：迁移说明（建议分页/按版本拆）
```

**组件文档格式建议**：每个 `components/*.md` 使用 YAML frontmatter 提供“可索引字段”，正文用固定标题，便于工具解析。

示例（仅示意）：

```md
---
name: Button
category: form
status: stable
since: 1.2.0
aliases: ["Btn"]
keywords: ["primary", "loading", "icon"]
figma: "figma://..."
tokens: ["--md-color-primary", "--md-radius-sm"]
---

## Overview
...

## When to use
...

## Props
...

## Examples
...

## Accessibility
...
```

**强烈建议提供 `index.json`**（避免运行时遍历/解析全部 MD），最少包含：

- `name`、`aliases`、`category`、`status`、`keywords`
- 文档路径（如 `components/button.md`）
- 关联 token（可选）、figma（可选）、since/deprecated（可选）

**打包要点（确保 `doc/` 真正随 npm 包交付）**：

- `package.json` 的 `files` 必须包含 `doc/`（以及构建产物 `dist/`）
- 运行时用相对 `dist/` 的路径读取（例如 `../doc`），不要写死绝对路径

### 2.1 MCP Server 推荐结构

```text
my-design-mcp/
├── package.json
├── tsconfig.json
├── rslib.config.ts              # 或 tsc 构建
├── src/
│   ├── server.ts                # createMCPServer()：注册 tools/resources
│   ├── index.ts                 # 导出 tools/handlers/utils（可选）
│   ├── stdio.ts                 # CLI 入口（stdio transport，本地调试）
│   ├── http.ts                  # 必选：Streamable HTTP 入口（内网服务化部署）
│   ├── tools/
│   │   ├── index.ts
│   │   ├── component-list.ts
│   │   ├── component-search.ts
│   │   ├── component-details.ts
│   │   ├── component-examples.ts
│   │   ├── theme-tokens.ts
│   │   ├── changelog-query.ts
│   │   ├── get-component-file-list.ts      # 可选增强
│   │   ├── get-file-code.ts                # 可选增强
│   │   └── get-function-code.ts            # 可选增强
│   └── utils/
│       ├── source/
│       │   ├── docs.ts          # 读文档（站点/JS/MD；优先拿原始数据而非 HTML）
│       │   ├── npm.ts           # 读 npm 制品（按版本读取文件/类型/示例）
│       │   ├── doc.ts           # 读随 MCP Server 包发布的 doc/（机器友好文档与索引）
│       │   └── registry.ts      # 组件索引（组件元数据、分类、状态、别名）
│       ├── cache/
│       │   ├── file-cache.ts
│       │   └── version-cache.ts
│       ├── output/
│       │   ├── paginate.ts
│       │   ├── hide-code-blocks.ts
│       │   └── strip-function-bodies.ts
│       └── schemas.ts           # zod/json schema（可选）
├── tests/
│   └── *.test.ts
└── README.md
```

### 2.2 Skills 推荐结构

```text
skills/
├── SKILL.md                     # Skills 总览：定位、适用范围、输入输出风格
├── BEST_PRACTICES.md            # 引入/主题/规范/常见坑
└── WORKFLOWS.md                 # 工作流：选型→实现→规范对齐→迁移/排查
```

---

## 3. 路线图（1-5 步：每步要做什么）

> 每一步都建议写清楚：**目标**、**产出物**、**关键实现点**、**完成标准（DoD）**。

### 步骤 1：定义数据源与“最小工具集”（先把输入端理顺）

- **目标**：明确 MCP 能读到什么（组件/文档/token/变更/示例），以及“最小可用工具”边界。
- **产出物**：
  - 数据源清单（内网）：文档站链接、可用的 JS/JSON 入口、MD 文件来源、类型来源（`type.ts`/`.d.ts`）、token/规范来源、以及对应的“按版本访问方式”
  - （推荐）`doc/` 目录规范：随 MCP Server 包发布的机器友好文档与索引（可索引、可版本化）
  - 工具清单 v1（6 个最小工具）：`component_list`、`component_search`、`component_details`、`component_examples`、`theme_tokens`、`changelog_query`
  - 输出控量策略 v1（分页/隐藏/定点读取的规则）
- **关键实现点**：
  - 工具命名统一 snake_case，入参 schema 明确、稳定
  - 组件命名与分类标准（大小写/别名/弃用状态）
- **DoD**：
  - 任何一个组件都能被 `component_search` 找到，并能用 `component_details` 返回 API 约束（哪怕是占位/最小字段）

### 步骤 2：搭建 MCP Server 骨架（共享 server + stdio 入口）

- **目标**：像 `semi-mcp` 一样形成可扩展骨架：`createMCPServer()` + `stdio.ts`。
- **产出物**：
  - `src/server.ts`：注册 `ListTools`/`CallTool`/`ListResources`/`ReadResource`
  - `src/stdio.ts`：stdio transport CLI（本地调试用）
  - `src/http.ts`：Streamable HTTP 入口（内网服务化部署用，带 `/health`）
  - `package.json`：`bin`、build/start scripts、依赖（`@modelcontextprotocol/sdk`）
- **关键实现点**：
  - stdio 模式严禁 console 输出污染协议（必要日志只写到文件或受控开关）
  - 统一错误返回格式（`isError: true` + 可读错误信息）
- **DoD**：
  - 本地 stdio 能跑通工具调用；服务化 HTTP 能健康检查并正常处理一次 tool 调用

### 步骤 3：实现“数据访问层”（版本 + 缓存 + 索引）

- **目标**：解决企业组件库最常见的复杂度：版本、性能、稳定性、可追溯。
- **产出物**：
  - `utils/cache/*`：版本解析缓存 + 内容缓存
  - `utils/source/*`：文档读取、代码读取、组件 registry 读取
  - 基础索引：组件列表、别名映射、分类/状态信息
- **关键实现点**：
  - `latest` → 实际版本解析（内网制品库/包仓库）
  - 缓存 key 设计（避免版本更新后缓存污染）
  - 数据源容错与降级（主源失败自动 fallback）
- **DoD**：
  - 同一组件重复查询不会反复打源站；断网/源站失败时能给出清晰错误或降级结果

### 步骤 4：实现最小工具集（并把“控量”做进去）

- **目标**：把步骤 1 的 6 个工具做成可用版本，并确保“输出可控、可组合”。
- **产出物**：
  - `tools/component-*.ts`、`tools/theme-tokens.ts`、`tools/changelog-query.ts`
  - `resources`（可选但推荐）：`my-design://components`、`my-design://tokens`、`my-design://guidelines`
  - 控量能力：分页/隐藏代码块/大文件去函数体 + 定点读取工具
- **关键实现点**：
  - `component_details` 输出结构稳定（最少包含：必填/默认值/约束/示例引用）
  - `changelog_query` 支持分页或按版本区间过滤
  - `theme_tokens` 能把 token 与 CSS 变量/主题差异关联起来
- **DoD**：
  - 用 MCP 工具可以完成：选型 → 获取 API → 拿到最小示例 → 查 token → 查迁移提示 的闭环

### 步骤 5：落地 Skills（把“工具”变成“交付”）

- **目标**：把“规范绑定”这件事落到可执行工作流：让 AI 输出符合 `xxx 设计规范` 的页面代码与校验清单。
- **产出物**：
  - `skills/SKILL.md`：Skills 的定位、输入输出、约束
  - `skills/WORKFLOWS.md`：工作流（选型→实现→规范对齐→迁移/排查）
  - `skills/BEST_PRACTICES.md`：引入、主题定制、a11y、常见坑
- **关键实现点**：
  - Skills 文档中明确：哪些信息必须从 MCP tools/resources 获取（避免凭空编造）
  - 生成时的“规范校验清单”：布局/间距/字体/颜色/交互状态/禁用加载等
- **DoD**：
  - 给定一个页面需求，AI 能引用工具返回的事实数据生成代码，并输出“规范对齐 checklist”

---

## 4. 里程碑建议（可选：按两周一个迭代）

- **迭代 1**：步骤 1-2（能跑通、能调用、能列工具）
- **迭代 2**：步骤 3（版本/缓存/索引打底）
- **迭代 3**：步骤 4（最小工具闭环 + 基础 resources）
- **迭代 4**：步骤 5（Skills 工作流 + 规范驱动生成）

---

## 5. 与 semi-mcp 对照学习的“必看点”

- **共享 server + 多入口**：`src/server.ts` + `src/stdio.ts` + `src/http.ts`
- **控量策略**：大文档隐藏代码块、changelog 分页、大文件去函数体 + 函数精读
- **版本解析与缓存**：`latest` 解析、缓存目录、key 设计、fallback
