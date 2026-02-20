# TODO

## 待讨论

### 1. SECTION_MAP 扩展：Usage guide 章节
- **现状**：`_template.md` 有 `## Usage guide`，但 `component_details` 的 SECTION_MAP 没注册，工具读不到
- **选项**：
  - A）注册到 SECTION_MAP → AI 可按需获取使用指南
  - B）合并到 `When to use` → 减少章节数
  - C）保持现状 → 只作为人类参考
- **影响**：`src/tools/component-details.ts`

### 2. SECTION_MAP 扩展：Related 章节
- **现状**：`_template.md` 有 `## Related`，SECTION_MAP 没注册
- **选项**：
  - A）注册到 SECTION_MAP → AI 做组件选型时能看到关联组件
  - B）放到 brief 模式输出 → 轻量级关联信息
  - C）保持现状
- **影响**：`src/tools/component-details.ts`

### 3. 设计规范（Guidelines）工具
- **现状**：`doc/guidelines/` 目录存在，`doc-reader.ts` 有 `readGuidelineDoc` 函数，但没有对应的 MCP tool
- **问题**：是否需要一个 `get_guideline` 工具？设计规范是否需要和组件文档关联？
- **影响**：新增 `src/tools/get-guideline.ts`，注册到 index

### 4. Props 表格解析：连字符属性名
- **现状**：`extractPropNames` 用 `\w+` 匹配属性名，`aria-label` 等带连字符的 prop 会被漏掉
- **影响**：`src/utils/doc-reader.ts` 的 `filterProps` 和 `extractPropNames`
- **紧急度**：低（当前 button.md 没有连字符 prop 在表格里）

### 5. source 字段与源码工具的关联
- **现状**：frontmatter 的 `source` 写的是 `src/components/Button/index.tsx`，源码工具期望 `@my-design/react/Button/index.tsx`
- **问题**：是否需要自动映射，让 AI 从文档直接跳转到源码？
- **影响**：`src/tools/component-details.ts` 或新增桥接逻辑
