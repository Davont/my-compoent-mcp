# doc/（MCP Docs）

这里存放 **随 MCP Server npm 包一起发布** 的“机器友好”文档与索引数据，用于支撑 MCP tools/resources 的稳定输出（避免运行时依赖源码仓库挂载或抓取 HTML）。

## 设计原则

- **可索引**：必须有 `index.json`，运行时不要遍历全量 Markdown 才能检索。
- **可版本化**：内容跟随 MCP Server 包版本发布；需要解耦时再拆分到独立数据包。
- **可控量**：文档内容要方便按需读取（分页/分文件/代码块拆分）。
- **可验证**：尽量提供结构化字段（frontmatter/JSON），避免纯叙述导致模型幻觉。

## 推荐结构

```text
doc/
├── index.json
├── components/
├── guidelines/
├── tokens/
└── changelog/
```

## 组件文档建议（`components/*.md`）

- 第一段使用 YAML frontmatter 描述可索引字段（示例见 `components/button.md`）
- 正文建议固定章节：`Overview / When to use / Props / Examples / Accessibility / Tokens`

## 索引建议（`index.json`）

最少包含：

- `name`、`aliases`、`category`、`status`、`keywords`
- `docPath`（例如 `components/button.md`）
- 可选：`figma`、`since`、`deprecated`、`tokens`

