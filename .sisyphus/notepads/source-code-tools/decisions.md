# Decisions — source-code-tools

## 待讨论：文档章节扩展

### 背景
当前 `SECTION_MAP` 只注册了 6 个章节（props, events, rules, behavior, when-to-use, accessibility）。
`_template.md` 中还有 `Usage guide` 和 `Related` 两个章节，以及未来可能的设计规范章节，目前工具读不到。

### 待决策项

1. **Usage guide 章节**
   - 现状：模板有，SECTION_MAP 没注册，`component_details` 读不到
   - 选项 A：注册到 SECTION_MAP → 工具能读到，AI 可按需获取
   - 选项 B：合并到 When to use → 减少章节数，简化结构
   - 选项 C：保持现状 → 只作为人类参考，AI 不需要

2. **Related 章节**
   - 现状：模板有，SECTION_MAP 没注册
   - 选项 A：注册到 SECTION_MAP → AI 做组件选型时能看到关联组件
   - 选项 B：放到 brief 模式输出 → 轻量级关联信息
   - 选项 C：保持现状

3. **设计规范（Guidelines）章节支持**
   - 现状：`doc/guidelines/` 目录存在，有 overview.md，但工具侧只有 `readGuidelineDoc` 函数，没有对应的 MCP tool
   - 是否需要一个 `get_guideline` 工具？
   - 设计规范内容是否需要和组件文档关联？

### 影响范围
- `src/tools/component-details.ts` — SECTION_MAP 扩展
- `src/utils/doc-reader.ts` — 可能需要新的解析函数
- `doc/components/_template.md` — 章节结构调整
