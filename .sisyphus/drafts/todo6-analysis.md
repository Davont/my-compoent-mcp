# TODO#6 分析：碎片化 MD 输出是否影响 AI 跨组件联想能力

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
