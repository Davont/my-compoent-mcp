---
# ===== 必填 =====
name: ComponentName        # 组件名（与 import 一致）
import: "import { ComponentName } from '@/components/ui/component-name';"
install: "npx shadcn@latest add component-name"
category: form             # form / data / feedback / layout / navigation / general
status: stable             # stable / beta / deprecated
since: 0.1.0               # 首次发布版本

# ===== 可选（建议填） =====
aliases: []                # 别名，用于搜索
keywords: []               # 关键词，用于搜索
dependencies: []           # 底层依赖，如 [@base-ui/react, class-variance-authority]
tokens: []                 # 相关 CSS 变量，如 [--primary, --radius]
source: ""                 # 源码路径，如 components/ui/button.tsx
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

---

## 子组件结构

<!--
⚠️ shadcn/ui 大多数组件由多个子组件组合而成
列出组合结构和嵌套关系
-->

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| Component | 根容器 | ✅ |

---

## Props / Variants

<!--
✅ 必填
如果组件使用 cva，列出 variants
-->

### Variants

| Variant | 可选值 | Default | Description |
|---------|--------|---------|-------------|

### Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|

---

## Events

| Event | Type | Description |
|-------|------|-------------|

---

## Examples

### 基础用法

```tsx
```

---

## Behavior

- **[状态/交互]**：[具体行为]

---

## When to use

**适用**：
- 场景 1

**不适用**：
- 场景 → 用 `替代组件`

---

## Accessibility

- **键盘**：[Tab / Enter / Space / Esc 等]
- **ARIA**：[需要的 aria-* 属性]

---

## Related

- `RelatedComponent`：[关联说明]
