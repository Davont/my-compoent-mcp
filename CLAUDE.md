# @my-design/mcp

MCP Server for my-design 组件库，最终目标是支撑「设计稿 DSL → 高质量页面代码」的 AI 生成链路。当前阶段提供组件文档、Props、示例、源码、Design Tokens 的查询能力，让 AI 充分理解组件后生成符合规范的代码。

## 项目背景与下一步计划

- 本项目为 AI 设计稿转代码服务：输入 DSL（Figma 元数据清理后 + 布局信息），AI 生成使用 my-design/react 的页面代码
- 生产环境模型是 **GLM4.5**（能力弱于 Claude），因此 MCP 工具要尽量替 AI 做决策，减少 AI 需要"思考"的部分
- 当前 11 个工具已覆盖组件查询能力，下一步需要新增：
  1. `resolve_dsl_to_components` — DSL 节点 → 推荐组件 + Props 映射
  2. `get_token_mapping` — 设计值 → my-design token 映射
  3. `validate_generated_code` — 基于组件核心规则做合规校验
- 用户需要提供：一段真实 DSL JSON + 同页面的算法生成 HTML，用于对比确定最终方案（走 DSL / HTML / 混合）
- 组件文档（当前 5 个）和 token（当前 2 个）后续会安排人补充，工具架构不需要改

## 技术栈

- TypeScript + ESM
- MCP SDK (`@modelcontextprotocol/sdk`)
- rslib 打包，rstest 测试
- oxc-parser 做源码 AST 解析

## 项目结构

```
src/
  tools/          # MCP 工具（每个文件导出 tool 定义 + handler）
  utils/          # 工具函数（doc-reader, source-code-reader）
  server.ts       # MCP Server 创建和配置
  stdio.ts        # stdio 传输入口
  http.ts         # HTTP 传输入口
doc/
  components/     # 组件文档（Markdown，含 frontmatter）
  tokens/         # Design Tokens（JSON）
  guidelines/     # 设计规范
  changelog/      # 变更日志
  index.json      # 组件索引（名称、别名、分类、关键词）
tests/
  tools/          # 工具测试
  utils/          # 工具函数测试
```

## 开发命令

```bash
npm run build     # rslib build
npx rstest run    # 运行测试（91 个用例）
```

## 新增工具的步骤

1. 在 `src/tools/` 创建文件，导出 `xxxTool`（Tool 定义）和 `handleXxx`（handler）
2. 在 `src/tools/index.ts` 中导入并注册到 `tools[]` 和 `toolHandlers`
3. 在 `tests/tools/` 创建对应测试

## 组件文档格式

所有组件文档遵循 `doc/components/_template.md` 的结构：

```
---
frontmatter（name, import, category, status, aliases, keywords, tokens, source）
---
# 组件名
## 核心规则（AI 生成时必读）
## Props
## Events
## Examples
## Behavior
## When to use
## Accessibility
## Related
```

## 控量策略

工具设计遵循渐进式获取，减少 token 消耗：
- `component_details` brief 模式只返回概述 + Props 名称列表
- sections 参数按需获取指定章节
- propFilter 只返回指定属性
- 大文档（>500行）自动隐藏代码块，配合 `get_code_block` 按需获取
