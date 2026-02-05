# doc/ 编写指南（给组件开发同学）

本指南帮助你把现有资产（MD 说明 / 示例 / type.ts / 源码）转化为 `doc/components/*.md`。

---

## 1. 你需要准备什么（输入）

在开始写文档前，确认你手上有这些资料：

| 资料 | 来源 | 用途 |
|------|------|------|
| **type.ts / .d.ts** | 组件源码 | → Props 表（已有自动生成） |
| **现有 MD 说明** | 文档站 | → Overview、When to use |
| **示例代码** | Storybook / Demo | → Examples |
| **源码实现** | 组件源码 | → Behavior（确认 loading/disabled 行为） |
| **设计规范**（可选） | 设计文档 / Figma | → Usage guide |

---

## 2. 分层编写：先"最小可用"，再"逐步完善"

### 第一层：最小可用（开发独立完成，约 30 分钟）

| 章节 | 必填 | 说明 |
|------|:----:|------|
| **frontmatter** | ✅ | name / category / status / since |
| **Props** | ✅ | 从 type.ts 自动生成，贴进来 |
| **Examples** | ✅ | 挑 2-4 个现有示例，覆盖常见场景 |
| **Behavior** | ✅ | 从源码确认 loading / disabled / focus 行为 |

### 第二层：规范对齐（需要设计/产品配合，或 AI 辅助）

| 章节 | 必填 | 说明 |
|------|:----:|------|
| **核心规则** | ⚠️ | 3-7 条"AI 生成规则"（可先写 2-3 条显而易见的） |
| **Usage guide** | ⚠️ | variant / size / icon 的选型表格 |
| **When to use** | ⚠️ | 适用 / 不适用场景 |
| **Design spec** | ⚠️ | 文案规则、布局规则、token 用法 |
| **Accessibility** | ⚠️ | 键盘、focus、aria-label 要求 |

> ⚠️ = 建议有，但可以后续补齐。先保证"最小可用"能让 AI 用起来。

---

## 3. 各章节怎么写（输入 → 输出）

### 3.1 frontmatter（必填）

```yaml
---
name: Button           # 组件名（与 import 一致）
category: form         # 分类：form / data / feedback / layout / navigation / general
status: stable         # stable / beta / deprecated
since: 1.0.0           # 首次发布版本
aliases: [Btn]         # 别名（用于搜索）
keywords: [提交, 按钮]  # 关键词（用于搜索）
---
```

### 3.2 Props（必填，自动生成）

直接从文档站的 Props 表复制过来，格式如下：

```markdown
## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| variant | `'primary' \| 'secondary' \| 'danger'` | | `'secondary'` | 按钮层级 |
| loading | `boolean` | | `false` | 加载状态，加载中禁止点击 |
| disabled | `boolean` | | `false` | 禁用状态 |
| htmlType | `'button' \| 'submit' \| 'reset'` | | `'button'` | 原生 button type |
```

**注意**：如果 type.ts 里的注释不够清晰，请先补 JSDoc，再重新生成。

### 3.3 Examples（必填，从现有示例挑选）

挑选原则：

- ✅ 覆盖 80% 常见场景（基础用法、禁用、加载、危险操作）
- ✅ 能复制粘贴直接运行
- ❌ 不要贴太多（2-4 个即可，不是越多越好）

格式：

```markdown
## Examples

### 基础用法

主操作用 `primary`，次操作用 `secondary`。

\`\`\`tsx
<Button variant="primary">提交</Button>
<Button variant="secondary">取消</Button>
\`\`\`

### 加载状态

异步操作时显示 loading，防止重复提交。

\`\`\`tsx
<Button variant="primary" loading={submitting}>
  提交中...
</Button>
\`\`\`
```

### 3.4 Behavior（必填，从源码确认）

这部分需要你从源码/测试里确认实际行为，**不要靠猜**。

需要回答的问题：

| 问题 | 在源码里找什么 |
|------|----------------|
| loading 时能否点击？ | onClick handler 里是否有 loading 判断 |
| disabled 时能否聚焦？ | 是否用 `disabled` 属性还是 `aria-disabled` |
| 点击后有什么反馈？ | 是否有 ripple / 状态变化 |
| 支持哪些键盘操作？ | Enter / Space 是否触发 onClick |

格式：

```markdown
## Behavior

- **loading**：加载中禁止点击，保持按钮宽度稳定
- **disabled**：禁用时不可聚焦，视觉置灰
- **focus**：支持 Tab 聚焦，有 `:focus-visible` 样式
- **键盘**：Enter / Space 触发点击
```

### 3.5 核心规则（建议有，可后补）

这是 **AI 生成代码时最常读的部分**，写成"规则清单"：

```markdown
## 核心规则（AI 生成时必读）

- **Primary 数量**：同一视图最多 1 个 Primary 按钮
- **危险操作**：删除/不可逆操作必须用 `danger`，建议配二次确认
- **表单按钮**：非提交按钮必须 `htmlType="button"`
- **仅图标**：icon-only 按钮必须提供 `aria-label`
- **不硬编码**：颜色/间距用 token，不要写 `#fff` / `8px`
```

**怎么写**：

- 从设计规范里提炼
- 或者让 AI 根据现有 MD 说明生成初稿，你 review 修正

### 3.6 Usage guide（建议有，可后补）

用表格说明"怎么选"：

```markdown
## Usage guide

### Variant 选择

| Variant | 适用场景 | 示例 |
|---------|----------|------|
| primary | 主操作、推进流程 | 提交、保存、创建 |
| secondary | 次要操作 | 取消、返回 |
| danger | 删除、不可逆操作 | 删除、清空 |

### Size 选择

| Size | 适用场景 |
|------|----------|
| default | 大多数场景 |
| small | 表格行内、紧凑区域 |
| large | 强调主 CTA、移动端 |
```

### 3.7 When to use（建议有，可后补）

```markdown
## When to use

**适用**：
- 触发操作（保存、提交、删除）
- 表单提交
- 对话框操作区

**不适用**：
- 页面跳转 → 用 `Link`
- 多个并列操作 → 考虑 `Dropdown` 收敛
```

---

## 4. 完整流程 Checklist

```
□ 1. 复制模板 `_template.md` → `doc/components/<name>.md`
□ 2. 填 frontmatter（name/category/status/since）
□ 3. 贴 Props 表（从文档站复制）
□ 4. 挑 2-4 个 Examples
□ 5. 从源码确认 Behavior
□ 6. 更新 `doc/index.json`
------- 以上是"最小可用"，可以先提交 -------
□ 7. 补核心规则（3-7 条规则）
□ 8. 补 Usage guide（选型表格）
□ 9. 补 When to use
□ 10. 补 Accessibility
```

---

## 5. AI 辅助生成核心规则（可选）

如果你不确定怎么写核心规则，可以用这个 prompt 让 AI 帮你生成初稿：

```
我有一个 React 组件 [组件名]，请根据以下信息生成核心规则（3-7 条）：

## Props
[贴 Props 表]

## 现有说明
[贴现有 MD 说明的关键段落]

要求：
- 每条规则以"必须/建议/禁止"开头
- 关注：数量限制、危险操作、无障碍、表单语义、样式约束
- 输出格式：Markdown 列表
```

---

## 6. 常见问题

**Q: Props 表太长怎么办？**
A: 只保留常用 props（10-15 个），其余放"完整 API 见 xxx"链接。

**Q: 没有设计规范怎么写核心规则？**
A: 先写显而易见的（Primary 数量、danger 用法、aria-label），后续再补。

**Q: 示例应该多详细？**
A: 能复制粘贴运行即可，不需要完整页面上下文。
