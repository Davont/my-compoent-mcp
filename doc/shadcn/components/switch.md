---
name: Switch
import: "import { Switch } from '@/components/ui/switch';"
install: "npx shadcn@latest add switch"
category: form
status: stable
since: 0.1.0
aliases: [开关, Toggle, 切换]
keywords: [开关, 切换, 启用, 禁用, toggle, on, off, 布尔]
dependencies: ["@radix-ui/react-switch"]
tokens: [--primary, --input, --ring]
source: "components/ui/switch.tsx"
---

# Switch

开关组件，用于在两种状态之间即时切换。基于 Radix UI Switch 封装，外观为滑动开关。

---

## 核心规则（AI 生成时必读）

- **必须关联 Label**：每个 Switch **必须**配合 `<Label htmlFor>` 使用，**禁止**裸写无标签的 Switch。
- **即时生效场景**：Switch 用于**即时生效**的设置（如开启/关闭通知），切换后立即执行操作，不需要额外"保存"按钮。
- **需要提交的场景用 Checkbox**：如果值变更需要表单提交后才生效，**应使用 Checkbox** 而非 Switch。
- **配合 Field 布局**：**建议**使用 `<Field orientation="horizontal">` 包裹 Switch + Label，获得统一的水平对齐。
- **禁用样式**：Switch `disabled` 时，**必须**在外层 `<Field>` 上设置 `data-disabled` 同步标签的禁用样式。
- **id 必填**：**必须**设置 `id` 用于关联 Label 的 `htmlFor`。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| id | `string` | ✅ | | 元素 ID，用于关联 Label |
| checked | `boolean` | | | 受控开关状态 |
| defaultChecked | `boolean` | | `false` | 非受控默认状态 |
| onCheckedChange | `(checked: boolean) => void` | | | 状态变化回调 |
| disabled | `boolean` | | `false` | 禁用状态 |
| name | `string` | | | 表单字段名 |
| aria-invalid | `boolean` | | | 标记校验失败状态 |
| className | `string` | | | 自定义类名 |

---

## Examples

### 基础用法

Switch 配合 Label 使用。

```tsx
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const Demo = () => (
  <div className="flex items-center gap-2">
    <Switch id="airplane-mode" />
    <Label htmlFor="airplane-mode">飞行模式</Label>
  </div>
);
```

### 配合 Field 布局

推荐使用 Field 获得统一的表单字段布局。

```tsx
import { Switch } from "@/components/ui/switch";
import {
  Field, FieldContent, FieldDescription, FieldLabel,
} from "@/components/ui/field";

const Demo = () => (
  <Field orientation="horizontal" className="flex justify-between">
    <FieldContent>
      <FieldLabel htmlFor="dark-mode">深色模式</FieldLabel>
      <FieldDescription>切换界面为深色主题。</FieldDescription>
    </FieldContent>
    <Switch id="dark-mode" />
  </Field>
);
```

### 受控模式

```tsx
"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function ControlledSwitch() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="flex items-center gap-2">
      <Switch
        id="notifications"
        checked={enabled}
        onCheckedChange={setEnabled}
      />
      <Label htmlFor="notifications">
        推送通知 {enabled ? "已开启" : "已关闭"}
      </Label>
    </div>
  );
}
```

### 设置列表

常见的设置页面样式：左侧标签+描述，右侧 Switch。

```tsx
import { Switch } from "@/components/ui/switch";
import {
  Field, FieldContent, FieldDescription, FieldGroup, FieldLabel,
} from "@/components/ui/field";

const settings = [
  { id: "email-notify", label: "邮件通知", desc: "接收重要更新的邮件通知。", defaultChecked: true },
  { id: "marketing", label: "营销邮件", desc: "接收产品推荐和优惠信息。", defaultChecked: false },
  { id: "security", label: "安全提醒", desc: "登录异常时发送通知。", defaultChecked: true },
];

const Demo = () => (
  <FieldGroup className="max-w-md space-y-4">
    {settings.map((s) => (
      <Field key={s.id} orientation="horizontal" className="flex items-center justify-between rounded-lg border p-4">
        <FieldContent>
          <FieldLabel htmlFor={s.id} className="text-base">{s.label}</FieldLabel>
          <FieldDescription>{s.desc}</FieldDescription>
        </FieldContent>
        <Switch id={s.id} defaultChecked={s.defaultChecked} />
      </Field>
    ))}
  </FieldGroup>
);
```

### 禁用状态

```tsx
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui/field";

const Demo = () => (
  <Field orientation="horizontal" data-disabled>
    <Switch id="disabled-switch" disabled />
    <Label htmlFor="disabled-switch">不可用的功能</Label>
  </Field>
);
```

---

## Behavior

- **点击切换**：点击 Switch 或其关联 Label 切换状态。
- **滑动动画**：切换时有平滑的滑动过渡动画。
- **focus**：Tab 聚焦后显示 focus ring。
- **disabled**：视觉置灰，滑块不可移动。
- **键盘**：Space 切换状态。

---

## When to use

**适用**：

- 即时生效的布尔设置（通知开关、深色模式、功能启停）。
- 设置页面中的开/关切换。

**不适用**：

- **需要表单提交** → 用 `Checkbox`（Switch 暗示即时生效）。
- **多选列表** → 用多个 `Checkbox`。
- **互斥选择** → 用 `RadioGroup`。

---

## Accessibility

- **键盘**：Tab 聚焦，Space 切换状态。
- **ARIA**：`role="switch"`、`aria-checked`。
- **标签关联**：通过 `id` + `htmlFor` 关联 Label。

---

## Related

- `Checkbox`：需要表单提交后才生效的勾选用 Checkbox，即时生效用 Switch。
- `RadioGroup`：互斥选择用 RadioGroup，布尔开关用 Switch。
- `Field`：推荐用 Field 包裹 Switch + Label 获得统一布局。
- `Label`：Switch 必须配合 Label 使用。
