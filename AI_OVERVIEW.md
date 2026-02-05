# my-design MCP & Skills 项目总览（给 AI / 新同学）

本文用于让 AI（或新加入的同学）**快速理解这个仓库在做什么、有哪些资料、应该按什么优先级取信息**，以及推荐的工作方式（含可复制 Prompt）。

---

## 1. 这个项目在解决什么问题？

我们有一个内网 React 组件库（my-design），外部大模型未训练过其 API/规范/示例，因此需要：

- **MCP（工具与资源层）**：把组件库知识变成“可调用工具/可读取资源”，让 AI 能查到真实信息（props、示例、token、变更等）。
- **Skills（工作流与交付层）**：把 MCP 工具串成“可落地工作流”，让 AI 能生成**符合 `xxx 设计规范`**的页面/方案/迁移建议。

> 运行形态以**内网服务化**为主：你交付一个 npm 包给平台部门，平台以 Streamable HTTP 方式部署。

---

## 2. 核心概念（别混淆职责）

- **MCP Client/Host（Cursor/Claude 等内置，你无需实现）**
  - 负责对话与工具编排，启动/管理 MCP Server，并通过 MCP 协议发请求收结果。
- **MCP Server（你实现，最终发布成 npm 包）**
  - 暴露 tools/resources，实现查询/解析/控量/缓存等，返回结构化结果。
- **Tools**
  - 可调用函数接口（例如 `component_search`、`component_details`、`theme_tokens`…）。
- **Resources**
  - 稳定的只读资源（组件索引、token 词典、规范目录、Figma 索引等）。
- **Skills**
  - 面向“交付”的流程化指引：选型→实现→规范对齐→迁移/排查。

---

## 3. 仓库地图（你应该先看哪里）

### 3.1 顶层文档（读完就能懂脉络）

- `README.md`
  - 功能与分层：MCP 要做什么、Skills 要做什么（目标/工具清单/价值）。
- `ROADMAP.md`
  - 路线图 + 架构 + 目录排版 + 数据源策略（参考 semi-mcp）。
  - 明确：生产以 HTTP 服务化为主，`doc/` 随 server 包发布。
- `开发流程指导-for-ai.md`
  - 参考实现对比：`magic-mcp` vs `semi-mcp`，以及对 my-design 的落地建议。
- `AI_OVERVIEW.md`（本文）
  - 面向 AI 的“读一篇就能干活”的总概览与 Prompt。

### 3.2 机器友好数据（后续会随 MCP Server 一起发布）

- `doc/`
  - **专门给 AI/MCP 消费**的数据源（机器友好、可索引、可控量、可版本化）。
  - `doc/index.json`：检索/列举用的主索引（避免运行时遍历全量 Markdown）。
  - `doc/components/*.md`：单组件规则库（TL;DR/选型/行为/A11y/示例等）。
  - `doc/tokens/*.json`：token、CSS 变量映射、主题差异。
  - `doc/guidelines/*.md`：`xxx 设计规范`（布局/排版/状态/a11y…）。
  - `doc/CONTRIBUTING.md`：如何从现有资产（MD/示例/type.ts/源码）转化为 `doc/components/*.md`。
  - `doc/components/_template.md`：组件文档模板。

### 3.3 参考实现（学习用，不是最终产物）

- `reference/mcp/semi-mcp/`
  - 推荐对照复刻的工程模式：共享 server + stdio/http 双入口 + 控量 + 缓存 + 版本解析。
- `reference/mcp/magic-mcp/`
  - 参考“工具分组”应对 tool 数量限制的策略。
- `reference/skills/semi-ui-skills/`
  - 参考 Skills 写法：最佳实践、工作流编排。

---

## 4. 信息来源优先级（避免幻觉）

当你需要回答/生成代码时，按以下优先级取信息：

1. **`doc/`（本仓库随 server 发布的机器友好数据）**：最稳定、最可控、最适合 AI。
2. **npm 制品中的类型/构建产物**（`type.ts`/`.d.ts`/示例产物等）：真实 API 的事实来源。
3. **文档站 / JS 链接 / 原始 MD**：作为补充与兜底（优先消费原始数据，不抓 HTML）。
4. **推断/经验**：只能作为最后手段；必须标注不确定，并给出验证路径（建议调用 MCP 工具或补 `doc/`）。

---

## 5. 推荐的“AI 工作方式”（面向落地交付）

### 5.1 生成页面的默认流程（概念版）

1. **理解需求**：页面目标、用户、关键流程、需要哪些动作（CTA）。
2. **选型**：用 `component_search` 找候选组件，按约束选定。
3. **查事实**：用 `component_details` 确认 props/约束；用 `component_examples` 找最小示例。
4. **对齐规范**：用 `theme_tokens` / `doc/guidelines/*` 约束间距/排版/状态/a11y。
5. **输出交付**：产出代码 + “规范对齐 checklist” + 关键取舍说明。

### 5.2 约束（默认遵守）

- **不硬编码样式**：颜色/间距/圆角/字号优先用 token（CSS 变量）。
- **语义正确**：跳转用 link 语义、表单按钮避免误 submit、危险操作用 danger 并建议二次确认。
- **控量**：输出代码片段要可复制；长内容拆块/分页/分文件。

---

## 6. 可复制 Prompt（给外部模型/通用助手使用）

把下面这段作为“上下文/系统提示/项目提示词”粘贴给 AI（按需改动占位符）：

```text
你是 my-design 组件库的前端助手（面向企业内网）。你的目标是：基于 my-design + `xxx 设计规范` + token，生成可落地、可维护、可访问的页面/组件代码，并输出必要的规范校验清单。

信息优先级：
1) 以本仓库 doc/ 下的机器友好文档与索引为准（doc/index.json、doc/components/*.md、doc/guidelines/*.md、doc/tokens/*.json）。
2) 其次参考 npm 包的类型定义（type.ts/.d.ts）与示例代码。
3) 再其次参考文档站/原始 MD/JS 资源（优先原始数据，避免抓 HTML）。
4) 不要凭空编造未知 props/行为；不确定就明确说明，并提出需要补充 doc/ 或调用 MCP 工具验证。

生成约束：
- 不要硬编码颜色/间距/圆角/字号，优先使用 token（CSS 变量）或规范推荐值。
- 组件选型遵循“Primary ≤ 1”“危险操作用 danger 并建议二次确认”“icon-only 必须 aria-label”“表单非提交按钮 type=button”等规则（以 doc/components/*.md 为准）。
- 输出必须包含：代码 + 关键取舍说明 + 规范对齐 checklist（布局/排版/颜色/状态/a11y）。
```
