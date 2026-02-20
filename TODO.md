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

---

## 待验证 & 待规划

### 6. 碎片化 MD 输出是否影响 AI 跨组件联想能力
- **问题**：每次 MCP 返回的是单个组件的一小块 MD 文档，AI 能否做到跨组件关联推理？
- **场景举例**：
  - 用户提到 Button，AI 能否联想到 Radio/Checkbox 等同类表单组件？
  - 用户定位 Select 的 bug，AI 能否推断 Pagination 等组件也有同类问题？
- **验证方式**：设计测试用例，对比"只给单组件片段"和"给多组件上下文"时 AI 的回答质量
- **优先级**：高
- 
- 
- 
- # TODO#6 分析：碎片化 MD 输出是否影响 AI 跨组件联想能力
## 结论：担心是对的，但原因不是"碎片太小"，而是碎片之间没有连接线。
## 现状分析
- 用户问 Button → AI 调 `component_details("Button")` → 只拿到 Button 一个组件的 MD
- 这份 MD 里**没有任何"相关组件"信息**（`button.md` 没有 `## Related` 章节）
- AI 只能靠自己的通用知识去联想 Radio/Checkbox，而不是靠组件库数据驱动
- 模板 `_template.md:168` 已设计了 `## Related` 章节，但：
  - `SECTION_MAP`（`component-details.ts:59`）没注册，AI 读不到
  - 现有 5 个组件文档（button/select/modal/input/tooltip）都没填 Related 内容
## 两类场景的区别
| 场景 | 例子 | 需要的能力 | 解决层 |
|------|------|-----------|--------|
| 同类组件联想 | Button → Radio/Checkbox | 组件间关联关系 | 文档层（Related 章节） |
| 同类 bug 推断 | Select bug → Pagination 同类问题 | 共享实现模式的知识 | 源码层（如搜"所有用了 useDropdown hook 的组件"） |
## 解决方案（三个层次）
| 层次 | 做法 | 效果 | 工作量 |
|------|------|------|--------|
| 最小改动 | `SECTION_MAP` 注册 `related`，给每个组件 MD 补 `## Related` | AI 看到 Button 时知道还有 Radio/Checkbox | 小（和 TODO#2 合并） |
| 中等改动 | `brief` 模式输出自动附带 Related 信息 | AI 第一次调用就能看到关联组件，不需额外请求 | 中 |
| 更彻底 | 新增 `get_related_components` tool，或 `component_search` 加"同类组件"能力 | AI 能主动查"跟 Select 有类似下拉行为的组件" | 大 |
## 待决策
- 先推进哪个层次？
- Select bug → Pagination 这类"共享实现"场景是否需要现在解决？

### 7. AI 调用 MCP 的完整链路梳理
- **问题**：需要搞清楚 AI 从用户问题到 MCP 调用的完整思路
- **待梳理内容**：
  - brief / detail / code 三种模式的触发逻辑是什么？
  - 用户问"我需要一个弹窗组件，用哪个？"时，AI 如何联想到具体组件名？
  - AI 如何决定调用哪个 MCP tool？
  - MCP 内部如何精准定位到目标组件？
- **产出**：完整调用链路图
- **优先级**：高

### 8. 多组件库扩展方案
- **问题**：当前只支持 `@my-design/react`，后期如何支持其他组件库？
- **待解决**：
  - 其他组件库可能不在 `components/` 目录下，目录结构各异
  - resolver 和 file listing 需要适配不同的包结构
  - 需要设计可插拔的包发现机制（配置化 or 约定化）
- **优先级**：中

### 9. 量化指标体系
- **问题**：目前缺乏数据支撑来评估 MCP 效果
- **需要的指标**：
  - Token 消耗统计（每次 MCP 调用的输入/输出 token 数）
  - 响应时间测评（从调用到返回的耗时）
  - 命中率（AI 是否调用了正确的 tool、返回了相关的内容）
  - 其他量化数据
- **实现方式**：加 instrumentation 或外部测试框架
- **优先级**：中

### 10. 设计稿转代码与 MCP 的关联
- **问题**：后期想做设计稿转代码，当前 MCP 能提供什么支撑？
- **可复用点**：
  - 组件识别：MCP 已有组件列表和 API 查询能力
  - 属性映射：MCP 已有 Props 文档解析
  - 代码生成：MCP 已有源码读取能力
- **需要补充的能力**：待分析
- **优先级**：低
