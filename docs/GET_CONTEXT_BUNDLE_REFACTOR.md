# get_context_bundle 重构方案（v3）

> v2 → v3 变更：补充 Codex 第二轮评审要求的 .d.ts 解析边界、失败场景返回规范、测试矩阵，修复代码块格式。

## 背景

当前 `get_context_bundle` 采用 Profile 驱动模式：`uiType`（form/table/modal）→ 加载对应 JSON → 返回固定组件列表 + 手写 checklist。

### 要解决的问题

1. **Profile 不具有普遍性**：真实场景的组件组合千变万化，写死的 Profile 覆盖不了
2. **维护成本高**：每新增场景要手写 JSON（components、checklist、hint）
3. **uiType 使用量低**：删除不会影响现有用户

## 重构方案

### 参数设计

```typescript
get_context_bundle({
  // 方式一：直接传组件名列表（精准）
  components?: string[],    // ["Button", "Input", "Select"]
  
  // 方式二：关键词搜索（模糊）
  query?: string,           // "表单"
  
  // 输出详细程度（保持不变）
  depth?: "summary" | "full"
})
```

- `components` 和 `query` 至少传一个
- `components` 优先级高于 `query`（都传时用 `components`）
- 删除 `goal`、`uiType` 参数

### 执行逻辑

#### 路径 A：`components` 直传

```
components: ["Button", "Input", "Select"]
  → 按名称读取每个组件的 .d.ts（Props）+ .md（核心规则）
  → 聚合返回
```

#### 路径 B：`query` 搜索

```
query: "表单"
  → 第 1 步：在 index.json 中搜索（name/aliases/keywords/category）
  → 第 2 步：按 category 扩展同类组件
  → 第 3 步：排序 + 截断（上限 5 个组件）
  → 第 4 步：同路径 A 聚合返回
```

**排序优先级**（解决 Codex 提出的「category 扩展失控」风险）：
1. name/alias 精确匹配（最高）
2. keyword 命中
3. category 扩展补充（最低）

**硬性上限**：最多返回 5 个组件，超出截断并提示"使用 components 参数精确指定"。

### 数据源策略

`.d.ts` 和 `.md` **各司其职，不是二选一**。

| 数据 | 来源 | 说明 |
|------|------|------|
| Props 接口 | `.d.ts` 类型文件 | 主数据源，零维护 |
| 核心规则 | `doc/components/*.md`「核心规则」章节 | 业务规则，需人工编写 |
| import 语句 | `.md` frontmatter 或包结构推导 | |
| 搜索索引 | `doc/index.json`（keywords, category） | 支撑 query 搜索 |

### .d.ts 解析边界定义

**提取规则：**
- 只提取 `export interface XxxProps { ... }` 形式的顶层接口
- 如果接口有 `extends`（如 `ButtonProps extends HTMLAttributes<HTMLButtonElement>`），只展示自身定义的属性，不展开父接口，末尾注释 `// extends HTMLAttributes<HTMLButtonElement>`
- 联合类型（`'primary' | 'secondary'`）、基础泛型（`React.ReactNode`、`React.CSSProperties`）原样保留
- 复杂泛型（如 `Pick<T, K>`、`Omit<T, K>`、自定义泛型）原样保留，不尝试展开
- 接口超过 30 个属性时，截取前 20 个 + 注释 `// ... 还有 N 个属性，使用 component_details 查看完整列表`
- 解析失败（语法错误、文件不存在）时降级到 `.md` 提取

**不处理的情况：**
- `type XxxProps = ...`（type alias）— 暂不支持，后续按需扩展
- re-export（`export { ButtonProps } from './types'`）— 只读直接定义

### 失败场景返回规范

所有失败场景统一返回格式，`isError: true` + 结构化提示：

| 场景 | 返回内容 | isError |
|------|---------|---------|
| `components` 和 `query` 都没传 | `请提供 components（组件名列表）或 query（搜索关键词）参数` | true |
| `components` 中某个组件名不存在 | 跳过该组件，在结果末尾注明：`未找到组件: Xxx。可用组件: Button, Input, ...` | false |
| `components` 全部不存在 | `未找到任何指定组件。可用组件: Button, Input, Select, Modal, Tooltip` | true |
| `query` 搜索 0 命中 | `未找到与 "xxx" 相关的组件。可用组件: Button, Input, ...。建议使用 components 参数直接指定` | true |
| `.d.ts` 解析失败 | 降级读 `.md` Props 表格，结果中不报错（对调用方透明） |  false |
| `.d.ts` 和 `.md` 都不存在 | 该组件显示 `文档暂未收录`，不影响其他组件返回 | false |

### 降级策略

按组件级别独立降级，不影响其他组件的返回：

```
有 .d.ts + 有 .md  →  Props 来自 .d.ts，核心规则来自 .md（最优）
有 .d.ts + 无 .md  →  Props 来自 .d.ts，无核心规则（能用）
无 .d.ts + 有 .md  →  Props 从 .md 表格提取，核心规则来自 .md（兼容旧逻辑）
无 .d.ts + 无 .md  →  显示"文档暂未收录"
```

### checklist 自动生成

从各组件「核心规则」章节提取规则条目（以 `-` 开头的行），每个组件最多取 3 条，汇总为 checklist。

已知限制：跨组件规则的去重和冲突处理暂不做，先上线观察实际效果。

### 缓存 key 改造

当前：`uiType|depth`
改为：`hash(sortedComponents.join(','))|depth` 或 `hash(query)|depth`

### 输出格式

````markdown
# 组件上下文（共 3 个组件）

## Button
`import { Button } from '@my-design/react'`

### Props
```typescript
interface ButtonProps {
    type?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link';
    size?: 'small' | 'medium' | 'large';
    disabled?: boolean;
    loading?: boolean;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}
```

### 核心规则
- 页面上 Primary 按钮最多 1 个
- 危险操作使用 variant="danger" 并搭配二次确认
- 加载状态使用 loading prop，禁止重复提交

## Input
...

## Select
...

## Checklist（自动生成）
- [ ] 页面上 Primary 按钮最多 1 个
- [ ] Input 必须绑定 value + onChange
- [ ] Select options 通过 prop 传入，不硬编码
...
````

## 删除清单

| 删除项 | 文件 |
|--------|------|
| `doc/profiles/form.json` | 删除 |
| `doc/profiles/table.json` | 删除 |
| `doc/profiles/modal.json` | 删除 |
| `doc/profiles/README.md` | 删除 |
| Profile 加载逻辑 | `src/tools/get-context-bundle.ts` 中 loadProfile、getProfilesDir 等 |
| `uiType` 参数及相关分支 | `src/tools/get-context-bundle.ts` |
| `goal` 参数 | 被 `query` 取代 |

## 新增清单

| 新增项 | 文件 |
|--------|------|
| `components` / `query` 参数处理 | `src/tools/get-context-bundle.ts` |
| `.d.ts` 读取 + Props 接口提取 | `src/utils/source-code-reader.ts` 或新文件 |
| `searchComponentsWithCategoryExpansion()` | `src/utils/doc-reader.ts` |
| query 排序 + maxComponents 截断 | `src/tools/get-context-bundle.ts` |
| 缓存 key 改造 | `src/tools/get-context-bundle.ts` |
| 测试用例重写 | `tests/tools/get-context-bundle.test.ts` |

## 每个组件的维护成本

| 内容 | 必须？ | 工作量 |
|------|--------|--------|
| `.d.ts` 类型文件 | 是 | 零（构建自动产出） |
| `index.json` 条目 | 是 | 小（name + category + 3-5 个 keywords） |
| `.md` 核心规则 | 推荐 | 小（3-5 条规则） |
| `.md` 完整文档 | 可选 | 中 |
| Profile JSON | **不需要** | 零 |

## 测试矩阵

最少覆盖以下 case：

### 参数处理（4 条）

| # | 场景 | 输入 | 期望 |
|---|------|------|------|
| 1 | components 和 query 都没传 | `{}` | isError: true，提示提供参数 |
| 2 | components 优先于 query | `{ components: ["Button"], query: "表单" }` | 只返回 Button，不走搜索 |
| 3 | components 含不存在的组件名 | `{ components: ["Button", "Foo"] }` | 返回 Button，末尾注明 Foo 未找到 |
| 4 | components 全部不存在 | `{ components: ["Foo", "Bar"] }` | isError: true，提示可用组件 |

### query 搜索（3 条）

| # | 场景 | 输入 | 期望 |
|---|------|------|------|
| 5 | keyword 命中 + category 扩展 | `{ query: "表单" }` | 返回 Input（keyword 命中）+ Button、Select（form category 扩展） |
| 6 | name/alias 精确匹配排在前面 | `{ query: "按钮" }` | Button 排第一（alias 精确匹配），其余 form 组件在后 |
| 7 | 0 命中 | `{ query: "图表" }` | isError: true，提示无结果 + 可用组件列表 |

### 控量（1 条）

| # | 场景 | 输入 | 期望 |
|---|------|------|------|
| 8 | 超过 maxComponents 截断 | `{ query: "..." }` 命中 >5 个组件 | 只返回前 5 个，末尾提示截断 |

### 数据源降级（3 条）

| # | 场景 | 条件 | 期望 |
|---|------|------|------|
| 9 | .d.ts + .md 都有 | Button 正常 | Props 来自 .d.ts，核心规则来自 .md |
| 10 | 只有 .d.ts 无 .md | 模拟无 md | Props 正常返回，无核心规则段落 |
| 11 | 只有 .md 无 .d.ts | 模拟无 d.ts | Props 从 .md 表格提取（兼容旧逻辑） |

### 缓存（2 条）

| # | 场景 | 期望 |
|---|------|------|
| 12 | 相同 components + depth 二次调用 | 第二次命中缓存 |
| 13 | 不同 components 同 depth | 不命中缓存 |
