---
# ===== 必填 =====
name: ComponentName        # 组件名（与 import 一致）
category: form             # form / data / feedback / layout / navigation / general
status: stable             # stable / beta / deprecated
since: 1.0.0               # 首次发布版本

# ===== 可选（建议填） =====
aliases: []                # 别名，用于搜索，如 [Btn, 按钮]
keywords: []               # 关键词，用于搜索
figma: ""                  # Figma 链接（如有）
tokens: []                 # 相关 token，如 [--md-color-primary, --md-radius-sm]
---

# ComponentName

<!-- 一句话说明这个组件是什么、做什么 -->

---

## 核心规则（AI 生成时必读）

<!-- 
⚠️ 建议有，可后补
3-7 条规则，AI 生成代码时会优先读这里
格式：以"必须/建议/禁止/默认"开头
-->

- **[规则名]**：[具体规则]
- **[规则名]**：[具体规则]
- **[规则名]**：[具体规则]

---

## Props

<!-- 
✅ 必填
从文档站的 Props 表复制，或从 type.ts 自动生成
-->

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| prop1 | `string` | ✅ | | 说明 |
| prop2 | `boolean` | | `false` | 说明 |

---

## Examples

<!-- 
✅ 必填
挑 2-4 个覆盖常见场景的示例
每个示例：标题 + 一句话说明 + 代码
-->

### 基础用法

<!-- 最简单的使用方式 -->

```tsx
<ComponentName>内容</ComponentName>
```

### 常见场景 1

<!-- 说明这个场景 -->

```tsx
<ComponentName prop1="value">内容</ComponentName>
```

### 常见场景 2

<!-- 说明这个场景 -->

```tsx
<ComponentName prop2>内容</ComponentName>
```

---

## Behavior

<!-- 
✅ 必填
从源码确认实际行为，不要靠猜

示例（Button）：
- **loading**：加载中禁止点击，按钮宽度保持稳定不抖动
- **disabled**：禁用时不可聚焦，视觉置灰，cursor 显示 not-allowed
- **focus**：支持 Tab 聚焦，有 `:focus-visible` 样式（与 hover 区分）
- **键盘**：Enter / Space 触发点击

示例（Modal）：
- **打开**：自动聚焦到第一个可聚焦元素，body 禁止滚动
- **关闭**：点击遮罩/按 Esc/点击关闭按钮均可关闭
- **焦点陷阱**：Tab 循环限制在 Modal 内部
- **关闭后**：焦点返回触发元素
-->

- **[状态/交互]**：[具体行为]
- **[状态/交互]**：[具体行为]
- **键盘**：[支持的键盘操作]

---

## When to use

<!-- 
⚠️ 建议有，可后补
-->

**适用**：

- 场景 1
- 场景 2

**不适用**：

- 场景 → 用 `替代组件`

---

## Usage guide

<!-- 
⚠️ 建议有，可后补
用表格说明"怎么选"
-->

### [维度] 选择

| 选项 | 适用场景 | 示例 |
|------|----------|------|
| option1 | 场景说明 | 具体例子 |
| option2 | 场景说明 | 具体例子 |

---

## Accessibility

<!-- 
⚠️ 建议有，可后补
-->

- **键盘**：[Tab / Enter / Space / Esc 等]
- **焦点**：[focus 样式要求]
- **ARIA**：[需要的 aria-* 属性]

---

## Related

<!-- 相关组件，帮助 AI 做选型 -->

- `RelatedComponent1`：[什么时候用它而不是当前组件]
- `RelatedComponent2`：[关联说明]
