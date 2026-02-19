# MCP Server 返回内容过多导致体验差的问题

## 背景

我正在开发一个 **MCP (Model Context Protocol) Server**，用于为 AI 助手（如 Cursor、Claude Desktop）提供组件库文档查询能力。

### 当前架构

```
用户提问 → AI 调用 MCP Tool → MCP 返回文档内容 → AI 处理并回复用户
```

### 现有工具

| 工具名 | 功能 | 返回内容 |
|--------|------|----------|
| `component_list` | 获取组件列表 | 组件名称、分类、状态 |
| `component_search` | 搜索组件 | 匹配的组件列表 |
| `component_details` | 获取组件详情 | Props、Events、规则、行为等 |
| `component_examples` | 获取代码示例 | 所有示例代码 |
| `theme_tokens` | 获取设计令牌 | 颜色、间距、字体等 |
| `changelog_query` | 查询更新日志 | 版本变更记录 |

### 当前参数设计（以 component_details 为例）

```typescript
{
  componentName: string,       // 必填，组件名称
  sections?: string[]          // 可选，要获取的章节
  // 可选值：props、events、rules、behavior、when-to-use、accessibility、all
  // 默认返回：props + rules
}
```

---

## 问题描述

### 核心问题

**MCP 返回的内容太多，导致 AI 处理慢，用户体验差。**

### 具体场景

1. **用户问简单问题，却返回大量内容**
   - 用户："Button 的基本写法是什么？"
   - 期望：返回 1-2 行代码示例
   - 实际：返回完整的 Props 表格 + 所有示例代码（2000+ 字符）

2. **无法精确控制返回粒度**
   - 用户："Button 的 onClick 怎么用？"
   - 期望：只返回 onClick 这一个属性的说明
   - 实际：返回整个 Props 章节（可能有 50 个属性）

3. **任何问题都可能触发大量返回**
   - 不管用户问 A、B、C 什么问题
   - 只要涉及的文档内容多，返回就会很长
   - 不是某个特定场景的问题，是普遍问题

### 影响

- 响应时间长（AI 需要处理大量 token）
- Token 消耗高
- 用户等待时间长
- 体验差

---

## 已考虑的方案

### 方案 1：新增轻量级工具（如 component_quickstart）

**思路**：新增一个只返回基础用法的工具。

**问题**：治标不治本。用户不一定问 quickstart，可能问任何问题。

### 方案 2：统一 depth 参数

**思路**：所有工具支持 `depth: 'brief' | 'normal' | 'full'`

```typescript
depth: 'brief'   // 返回 ~200 字符摘要
depth: 'normal'  // 返回常规内容
depth: 'full'    // 返回完整文档
```

**问题**：AI 如何判断用户需要哪个深度？

### 方案 3：渐进式获取

**思路**：第一次只返回摘要 + 可用章节列表，AI 再决定是否深入。

```
第一次返回：
Button - 用于触发操作的按钮
可用章节：[props, events, examples, accessibility]

AI 根据用户问题决定是否继续获取具体章节
```

**问题**：需要多次调用，增加延迟。

### 方案 4：更细粒度的参数控制

**思路**：让 AI 能精确请求到具体字段。

```typescript
{
  componentName: 'Button',
  sections: ['props'],
  filter: {
    props: ['type', 'onClick']  // 只要这 2 个属性
  }
}
```

**问题**：参数设计复杂，AI 能否正确使用？

### 方案 5：返回结构化数据而非 Markdown

**思路**：返回 JSON 而非大段文本，让 AI 按需提取。

```json
{
  "props": {
    "type": { "type": "string", "default": "default", "desc": "按钮类型" },
    "onClick": { "type": "function", "desc": "点击回调" }
  }
}
```

**问题**：AI 还是需要处理整个 JSON？

---

## 期望得到的建议

1. **MCP 内容返回量大导致体验差，有什么最佳实践？**

2. **如何设计工具参数，让 AI 能够精确请求需要的内容？**

3. **是否有更好的架构设计，平衡信息完整性和响应速度？**

4. **其他 MCP Server（如 Semi Design MCP）是如何解决这个问题的？**

5. **有没有案例或参考项目？**

---

## 补充信息

- 技术栈：TypeScript + @modelcontextprotocol/sdk
- 构建工具：rslib
- 使用场景：Cursor IDE、Claude Desktop
- 文档格式：Markdown 文件，包含 frontmatter 和多个章节

---

## 相关代码

### component_details 工具定义

```typescript
export const componentDetailsTool: Tool = {
  name: 'component_details',
  description: '获取组件详细文档，包括 Props、Events、核心规则等。生成代码前必须调用。',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Input。',
      },
      sections: {
        type: 'array',
        items: { type: 'string' },
        description: '要获取的章节。可选：props、events、rules、behavior、when-to-use、accessibility、all。默认 props + rules。',
      },
    },
    required: ['componentName'],
  },
};
```

### component_examples 工具定义

```typescript
export const componentExamplesTool: Tool = {
  name: 'component_examples',
  description: '获取组件代码示例。返回可直接复制使用的示例代码。',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Input。',
      },
    },
    required: ['componentName'],
  },
};
```
