---
name: Checkbox
import: "import { Checkbox } from '@/components/ui/checkbox';"
install: "npx shadcn@latest add checkbox"
category: form
status: stable
since: 0.1.0
aliases: [复选框, 勾选框, Check]
keywords: [勾选, 复选, 多选, 同意, 开关, check, toggle, agree, terms]
dependencies: ["radix-ui"]
tokens: [--primary, --border, --ring, --radius]
source: "components/ui/checkbox.tsx"
---

# Checkbox

复选框组件，用于在表单中进行单个布尔选择或多项勾选。基于 Radix UI Checkbox 封装。

---

## 核心规则（AI 生成时必读）

- **必须关联 Label**：每个 Checkbox **必须**配合 `<Label htmlFor>` 或 `<FieldLabel htmlFor>` 使用，**禁止**裸写无标签的 Checkbox。
- **配合 Field 布局**：**建议**使用 `<Field orientation="horizontal">` 包裹 Checkbox + Label，获得统一的水平对齐布局。
- **受控优先**：表单场景推荐受控模式（`checked` + `onCheckedChange`），非受控场景可用 `defaultChecked`。
- **id 和 name 必填**：**必须**同时设置 `id`（关联 Label）和 `name`（表单提交用）。
- **勾选组用 FieldGroup**：多个 Checkbox 组合时，**必须**用 `<FieldGroup>` 包裹，并用 `<FieldSet>` + `<FieldLegend>` 提供组标题。
- **禁用样式**：Checkbox `disabled` 时，**必须**在外层 `<Field>` 上设置 `data-disabled` 以同步标签的禁用样式。
- **错误样式**：校验失败时，Checkbox 设置 `aria-invalid`，`<Field>` 上设置 `data-invalid`。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| id | `string` | ✅ | | 元素 ID，用于关联 Label |
| name | `string` | ✅ | | 表单字段名 |
| checked | `boolean` | | | 受控勾选状态 |
| defaultChecked | `boolean` | | `false` | 非受控默认勾选状态 |
| onCheckedChange | `(checked: boolean) => void` | | | 勾选状态变化回调 |
| disabled | `boolean` | | `false` | 禁用状态 |
| aria-invalid | `boolean` | | | 标记校验失败状态 |
| className | `string` | | | 自定义类名 |

---

## Examples

### 基础用法

Checkbox 配合 Field + Label，水平对齐。

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";

const Demo = () => (
  <Field orientation="horizontal">
    <Checkbox id="terms" name="terms" />
    <FieldLabel htmlFor="terms">同意服务条款</FieldLabel>
  </Field>
);
```

### 带描述文字

用 FieldContent + FieldDescription 添加辅助说明。

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field, FieldContent, FieldDescription, FieldLabel,
} from "@/components/ui/field";

const Demo = () => (
  <Field orientation="horizontal">
    <Checkbox id="newsletter" name="newsletter" defaultChecked />
    <FieldContent>
      <FieldLabel htmlFor="newsletter">订阅周报</FieldLabel>
      <FieldDescription>每周一发送本周技术精选内容。</FieldDescription>
    </FieldContent>
  </Field>
);
```

### 受控模式

```tsx
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";

export function ControlledCheckbox() {
  const [checked, setChecked] = useState(false);

  return (
    <Field orientation="horizontal">
      <Checkbox
        id="agree"
        name="agree"
        checked={checked}
        onCheckedChange={setChecked}
      />
      <FieldLabel htmlFor="agree">
        我已阅读并同意{checked ? "✓" : ""}
      </FieldLabel>
    </Field>
  );
}
```

### 勾选组

多个 Checkbox 组合为一组，用 FieldSet 提供组标题。

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field, FieldDescription, FieldGroup,
  FieldLabel, FieldLegend, FieldSet,
} from "@/components/ui/field";

const Demo = () => (
  <FieldSet>
    <FieldLegend variant="label">通知偏好</FieldLegend>
    <FieldDescription>选择你希望接收通知的方式。</FieldDescription>
    <FieldGroup className="gap-3">
      <Field orientation="horizontal">
        <Checkbox id="notify-email" name="notify-email" defaultChecked />
        <FieldLabel htmlFor="notify-email" className="font-normal">邮件通知</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <Checkbox id="notify-sms" name="notify-sms" />
        <FieldLabel htmlFor="notify-sms" className="font-normal">短信通知</FieldLabel>
      </Field>
      <Field orientation="horizontal">
        <Checkbox id="notify-push" name="notify-push" defaultChecked />
        <FieldLabel htmlFor="notify-push" className="font-normal">推送通知</FieldLabel>
      </Field>
    </FieldGroup>
  </FieldSet>
);
```

### 禁用状态

Checkbox 设 `disabled`，Field 设 `data-disabled`。

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";

const Demo = () => (
  <Field orientation="horizontal" data-disabled>
    <Checkbox id="feature" name="feature" disabled />
    <FieldLabel htmlFor="feature">开启实验功能（暂不可用）</FieldLabel>
  </Field>
);
```

### 表格中的全选

```tsx
"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const users = [
  { id: "1", name: "张三", email: "zhang@example.com" },
  { id: "2", name: "李四", email: "li@example.com" },
  { id: "3", name: "王五", email: "wang@example.com" },
];

export function SelectableTable() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = selected.size === users.length;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8">
            <Checkbox
              id="select-all"
              name="select-all"
              checked={allSelected}
              onCheckedChange={(checked) =>
                setSelected(checked ? new Set(users.map((u) => u.id)) : new Set())
              }
            />
          </TableHead>
          <TableHead>姓名</TableHead>
          <TableHead>邮箱</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id} data-state={selected.has(user.id) ? "selected" : undefined}>
            <TableCell>
              <Checkbox
                id={`row-${user.id}`}
                name={`row-${user.id}`}
                checked={selected.has(user.id)}
                onCheckedChange={(checked) => {
                  const next = new Set(selected);
                  checked ? next.add(user.id) : next.delete(user.id);
                  setSelected(next);
                }}
              />
            </TableCell>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
```

---

## Behavior

- **点击切换**：点击 Checkbox 或其关联 Label 切换勾选状态。
- **focus**：Tab 聚焦后显示 focus ring。
- **disabled**：视觉置灰，不可点击，不可聚焦。
- **invalid**：`aria-invalid` 时显示红色边框。
- **键盘**：Space 切换勾选状态。

---

## When to use

**适用**：

- 多项独立的布尔选择（通知偏好、功能开关列表）。
- 同意条款/协议的勾选确认。
- 表格行的批量选择。

**不适用**：

- **互斥单选** → 用 `RadioGroup`。
- **即时生效的开关** → 用 `Switch`。
- **下拉多选** → 用 `Combobox`。

---

## Accessibility

- **键盘**：Tab 聚焦，Space 切换勾选。
- **ARIA**：`role="checkbox"`、`aria-checked`，校验失败时 `aria-invalid="true"`。
- **标签关联**：通过 `id` + `htmlFor` 关联 Label。

---

## Related

- `Switch`：即时生效的布尔开关用 Switch，需要明确提交的用 Checkbox。
- `RadioGroup`：互斥单选用 RadioGroup，多选用 Checkbox。
- `Field`：推荐用 Field 包裹 Checkbox + Label 获得统一布局。
- `Form`：表单场景配合 React Hook Form 使用。
- `Table`：表格行选择常用 Checkbox。
