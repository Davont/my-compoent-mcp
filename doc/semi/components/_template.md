---
# ===== 必填 =====
name: ComponentName        # 组件名（与 import 一致）
import: "import { ComponentName } from '@douyinfe/semi-ui';"
category: input            # basic / input / navigation / show / feedback
status: stable             # stable / beta / deprecated
since: 2.0.0               # 首次发布版本

# ===== 可选（建议填） =====
aliases: []                # 别名，用于搜索，如 [Btn, 按钮]
keywords: []               # 关键词，用于搜索
figma: ""                  # Figma 链接（如有）
tokens: []                 # 相关 CSS Variables，如 [--semi-color-primary, --semi-border-radius-small]
source: ""                 # 源码路径，如 packages/semi-ui/button/index.tsx
---

# ComponentName

<!-- 一句话说明这个组件是什么、做什么 -->

---

## 核心规则（AI 生成时必读）

<!--
⚠️ 建议有，可后补
3-7 条规则，AI 生成代码时会优先读这里
格式：以"必须/建议/禁止/默认"开头
Semi 特有：type/theme 正交、统一 import 路径、CSS Variables 定制
-->

- **[规则名]**：[具体规则]
- **[规则名]**：[具体规则]
- **[规则名]**：[具体规则]

---

## Props

<!--
✅ 必填
从 semi.design 文档站的 API 表复制
-->

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| prop1 | `string` | ✅ | | 说明 |
| prop2 | `boolean` | | `false` | 说明 |

---

## Events

<!--
⚠️ 建议有，可后补
组件对外暴露的回调事件
-->

| Event | Type | Description |
|-------|------|-------------|
| onClick | `(e: MouseEvent) => void` | 说明 |

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
import { ComponentName } from '@douyinfe/semi-ui';

<ComponentName>内容</ComponentName>
```

### 常见场景 1

<!-- 说明这个场景 -->

```tsx
<ComponentName prop1="value">内容</ComponentName>
```

---

## Behavior

<!--
✅ 必填
从源码确认实际行为，不要靠猜
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
