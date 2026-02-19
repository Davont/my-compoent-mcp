# Semi MCP 上下文控量策略详解

> 本文总结 `semi-mcp` 在 MCP Server 中控制输出量（避免上下文爆炸）的核心策略与实现细节，供 my-design MCP 开发时参考。

---

## 核心思路

**默认返回精简内容，按需获取完整内容。**

Semi MCP 不是简单地"先返回摘要再深入"，而是**在原始内容上做减法**——隐藏代码块、去函数体、强制分页——保留文档的整体结构和上下文，同时大幅减少 token 消耗。

---

## 策略一：大文档 — 代码块隐藏 + 定点读取

### 问题

组件文档（尤其是 Table、Form 等复杂组件）通常包含大量代码示例，一个文档可能有 20+ 个代码块，每个 20-50 行，导致文档轻松超过 2000 行。

### 方案

当文档超过阈值时，将所有 markdown 代码块替换为编号占位符，另提供专门工具按编号读取。

### 实现

**阈值**：`LARGE_DOCUMENT_THRESHOLD = 888`（行）

**替换逻辑**（`get-semi-document.ts`）：

```typescript
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

function replaceCodeBlocksWithPlaceholders(content: string, componentName: string): string {
    let index = 0;
    return content.replace(CODE_BLOCK_REGEX, () => {
        index++;
        return `\`\`\`text
[代码块 #${index} 已隐藏]
要查看此代码，请使用 get_semi_code_block 工具，传入参数:
- componentName: "${componentName}"
- codeBlockIndex: ${index}
\`\`\``;
    });
}
```

**定点读取工具**：`get_semi_code_block`

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `componentName` | string | 是 | 组件名称 |
| `codeBlockIndex` | number | 是 | 代码块编号（1-based） |
| `version` | string | 否 | 版本，默认 latest |

**返回示例**：

```text
组件 Table 代码块 #3 (来自 index.md):

​```jsx
import { Table } from '@douyinfe/semi-ui';

export default () => {
    const columns = [...];
    const data = [...];
    return <Table columns={columns} dataSource={data} />;
};
​```
```

### 效果

| 场景 | 隐藏前 | 隐藏后 |
|------|--------|--------|
| Table 文档（20 个代码块） | ~2000 行 | ~500 行 |
| AI 只需要 1 个示例 | 消耗 2000 行上下文 | 消耗 500 + 30 ≈ 530 行 |

---

## 策略二：Changelog — 强制分页

### 问题

Changelog 是整个组件库最长的文档，通常有几千行，且 AI 大多只需要查最近几个版本的变更。

### 方案

按固定行数分页，通过 `componentName` 参数约定页码。

### 实现

**页大小**：`CHANGELOG_PAGE_SIZE = 300`（行）

**分页约定**：

```text
changelog      → 返回使用说明（告诉 AI 用 changelog-1, changelog-2...）
changelog-1    → 第 1 页（最新的 300 行）
changelog-2    → 第 2 页
...
```

**解析逻辑**（`get-semi-document.ts`）：

```typescript
function parseChangelogPage(componentName: string): {
    isChangelog: boolean;
    page?: number;
    baseName?: string;
} {
    const changelogMatch = componentName.match(/^(changelog)(?:-(\d+))?$/);
    if (changelogMatch) {
        const baseName = changelogMatch[1];
        const pageStr = changelogMatch[2];
        if (pageStr) {
            return { isChangelog: true, page: parseInt(pageStr, 10), baseName };
        }
        return { isChangelog: true, baseName };
    }
    return { isChangelog: false };
}
```

**分页逻辑**：

```typescript
function paginateChangelog(
    content: string,
    page: number
): { content: string; totalPages: number; currentPage: number } {
    const lines = content.split('\n');
    const totalPages = Math.ceil(lines.length / CHANGELOG_PAGE_SIZE);
    const startIndex = (page - 1) * CHANGELOG_PAGE_SIZE;
    const endIndex = Math.min(startIndex + CHANGELOG_PAGE_SIZE, lines.length);
    return {
        content: lines.slice(startIndex, endIndex).join('\n'),
        totalPages,
        currentPage: page,
    };
}
```

**返回格式**：

```text
===== index.md (第 1/5 页) =====
[提示: 使用 changelog-2 获取下一页]

... 300 行 changelog 内容 ...

[当前页: 1/5 | 总行数: 1500 | 每页: 300 行]

文档链接: https://semi.design/zh-CN/ecosystem/changelog
```

### 效果

| 场景 | 分页前 | 分页后 |
|------|--------|--------|
| 完整 Changelog | ~1500 行 | 300 行/页 |
| AI 查"最近的 breaking changes" | 消耗 1500 行 | 只消耗 300 行（第 1 页） |

---

## 策略三：大源码文件 — 去函数体 + 函数精读

### 问题

组件源码文件（如 `Table.tsx`）动辄上千行，AI 需要理解文件结构但不需要读完每个函数的实现。

### 方案

分两步走：先返回"骨架"（函数体替换为 `{ ... }`），再按需精读某个具体函数。

### 第一步：`get_file_code` — 返回骨架

**阈值**：`LINE_THRESHOLD = 500`（行）

**触发条件**：`.ts` / `.tsx` 文件且行数 ≥ 500

**实现**（`utils/remove-function-body.ts`）：

使用 `oxc-parser` 解析 TypeScript AST，遍历找到所有函数声明/表达式/箭头函数/类方法/getter/setter，将函数体替换为 `{ ... }`。

```typescript
function removeFunctionBodies(code: string, filename: string = 'code.tsx'): string {
    const functions = findAllFunctions(code, filename);
    if (functions.length === 0) return code;

    // 从最深层开始替换，避免嵌套函数的偏移问题
    const sortedByBodyStart = [...functions].sort((a, b) => b.bodyStart - a.bodyStart);

    let result = code;
    const replacedRanges: Array<{ start: number; end: number }> = [];

    for (const func of sortedByBodyStart) {
        const isNested = replacedRanges.some(
            range => func.bodyStart >= range.start && func.bodyEnd <= range.end
        );
        if (isNested) continue;

        const before = result.slice(0, func.bodyStart);
        const after = result.slice(func.bodyEnd);
        result = before + '{ ... }' + after;

        replacedRanges.push({ start: func.bodyStart, end: func.bodyEnd });
    }

    return result;
}
```

**支持的函数类型**：

- 函数声明：`function foo() {}`
- 函数表达式：`const foo = function() {}`
- 箭头函数：`const foo = () => {}`
- 类方法：`class Foo { bar() {} }`
- 属性定义：`class Foo { method = () => {} }`
- 对象方法：`{ method() {} }`
- Getter/Setter：`get foo() {}` / `set foo() {}`

**返回示例**：

```text
文件: @douyinfe/semi-ui/table/Table.tsx
版本: 2.89.2
行数: 1200 | 大小: 45000 字符
处理: （代码较长，函数体已替换为 "{ ... }"，推荐使用 get_function_code 工具读取具体函数实现）

============================================================

import React from 'react';
import { TableProps } from './interface';

export default class Table extends React.Component<TableProps> {
    constructor(props: TableProps) { ... }

    handleRowClick(record: any, index: number) { ... }

    handleSort(column: ColumnProps) { ... }

    renderHeader() { ... }

    renderBody() { ... }

    renderPagination() { ... }

    render() { ... }
}
```

### 第二步：`get_function_code` — 精读目标函数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `filePath` | string | 是 | 文件完整路径 |
| `functionName` | string | 是 | 函数名称 |
| `version` | string | 否 | 版本 |

使用 `extractFunction()` 从文件中找到并返回指定函数的完整实现。

### 效果

| 场景 | 无控量 | 有控量 |
|------|--------|--------|
| 1200 行的 Table.tsx | 1200 行全返回 | 骨架 ~100 行 |
| AI 只需 renderHeader 实现 | 消耗 1200 行 | 100 + 40 ≈ 140 行 |
| Token 节省 | — | **约 88%** |

---

## 辅助手段

### 文件列表过滤

`get_component_file_list` 工具排除无关目录，避免返回构建产物和测试文件：

```typescript
const EXCLUDE_DIRS = [
    '/lib/',
    '/es/',
    '/dist/',
    '/cjs/',
    '/__test__/',
    '/__tests__/',
    '/_story/',
    '/_stories/',
    '/node_modules/',
];
```

### 目录递归深度限制

最大递归 **10 层**，防止目录无限展开。

### 文件类型区分处理

- `.ts` / `.tsx`：走函数体剥离逻辑（超过 500 行时）
- `.scss` 等其他文件：直接返回全文（通常不会太长）

---

## Semi MCP 没有做的事

值得注意的是，Semi MCP **没有实现** 以下控量手段：

- **Document section 过滤**：不支持"只返回 Props 章节"，`get_semi_document` 返回整个文档（只对超长文档做代码块隐藏）
- **depth 参数**：没有 `brief` / `normal` / `full` 之类的深度控制
- **结构化 JSON 返回**：文档内容以 Markdown 原文返回，不做 JSON 结构化

---

## 阈值汇总

| 控量机制 | 阈值 | 来源文件 |
|----------|------|----------|
| 代码块隐藏 | 文档 > **888 行** | `get-semi-document.ts` |
| Changelog 分页 | 每页 **300 行** | `get-semi-document.ts` |
| 函数体剥离 | 文件 > **500 行** | `get-file-code.ts` |
| 目录递归深度 | 最大 **10 层** | `fetch-directory-list.ts` |

---

## 工具链总览

```text
┌──────────────────────────────────────────────────────────┐
│                    Semi MCP 工具链                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  get_semi_document(componentName, version)                │
│      │                                                   │
│      ├─ 文档 ≤ 888 行 → 直接返回全文                       │
│      │                                                   │
│      ├─ 文档 > 888 行 → 代码块替换为占位符                  │
│      │      └─→ get_semi_code_block(name, index)         │
│      │              → 返回指定代码块                        │
│      │                                                   │
│      └─ changelog → 强制分页 300 行/页                     │
│             └─→ changelog-1, changelog-2, ...             │
│                                                          │
│  get_file_code(filePath, version, fullCode?)              │
│      │                                                   │
│      ├─ 文件 < 500 行 → 直接返回全文                       │
│      │                                                   │
│      └─ 文件 ≥ 500 行 → 函数体替换为 { ... }               │
│             └─→ get_function_code(filePath, functionName) │
│                     → 返回指定函数完整实现                   │
│                                                          │
│  get_component_file_list(componentName, version)          │
│      └─ 排除 lib/dist/test/story 等无关目录                │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 对 my-design MCP 的启示

1. **代码块隐藏可以直接复用**：我们的组件文档也包含大量示例代码，这个策略投入产出比最高。
2. **函数体剥离适用于源码阅读场景**：如果后续要做"源码与函数读取"增强工具，这是必备能力。
3. **Changelog 分页是必须的**：随着版本迭代，Changelog 只会越来越长。
4. **Section 过滤是 Semi 没做但我们可以做的**：我们的 `component_details` 已经支持 `sections` 参数，这是比 Semi 更细粒度的控制，应该继续保留并优化。
5. **阈值需要根据实际文档长度调优**：888 / 300 / 500 这些数字不是银弹，需要根据 my-design 的实际文档规模来调整。
