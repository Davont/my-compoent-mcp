---
name: Input
import: "import { Input } from '@/components/ui/input';"
install: "npx shadcn@latest add input"
category: form
status: stable
since: 0.1.0
aliases: [输入框, TextInput, 文本输入]
keywords: [输入, 文本, 表单, 搜索, 密码, text, search, email, password]
dependencies: []
tokens: [--input, --border, --ring, --radius]
source: "components/ui/input.tsx"
---

# Input

基础文本输入组件，基于原生 `<input>` 元素封装样式。用于表单填写、搜索、文本编辑等场景。

---

## 核心规则（AI 生成时必读）

- **必须关联 Label**：每个 Input **必须**配合 `<Label htmlFor="id">` 使用，或提供 `aria-label`，**禁止**用 placeholder 替代标签。
- **受控优先**：表单场景推荐受控模式（`value` + `onChange`），与 React Hook Form 等表单库集成时使用 `{...field}` 展开。
- **type 语义**：密码用 `type="password"`，邮箱用 `type="email"`，数字用 `type="number"`，**禁止**一律用 `type="text"`。
- **配合 Field 使用**：表单场景**建议**用 `<Field>` + `<Label>` + `<Input>` 的组合结构，获得统一的间距和标签对齐。
- **禁止硬编码**：颜色/间距/圆角**必须**使用 Tailwind class 或 CSS 变量，禁止写具体数值。
- **文件上传**：`type="file"` 时 Input 已内置文件选择样式，无需额外处理。

---

## Props

Input 直接继承 `React.InputHTMLAttributes<HTMLInputElement>` 的全部属性，以下为常用的：

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| type | `string` | | `"text"` | 输入类型（text/password/email/number/file 等） |
| placeholder | `string` | | | 占位提示文本 |
| disabled | `boolean` | | `false` | 禁用状态 |
| readOnly | `boolean` | | `false` | 只读状态 |
| id | `string` | | | 元素 ID，用于关联 Label |
| name | `string` | | | 表单字段名 |
| value | `string` | | | 受控值 |
| defaultValue | `string` | | | 非受控默认值 |
| className | `string` | | | 自定义类名 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(e: ChangeEvent<HTMLInputElement>) => void` | 输入内容变化时触发 |
| onFocus | `(e: FocusEvent<HTMLInputElement>) => void` | 获得焦点时触发 |
| onBlur | `(e: FocusEvent<HTMLInputElement>) => void` | 失去焦点时触发 |
| onKeyDown | `(e: KeyboardEvent<HTMLInputElement>) => void` | 按键时触发 |

---

## Examples

### 基础用法

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Demo = () => (
  <div className="grid w-full max-w-sm gap-1.5">
    <Label htmlFor="email">邮箱</Label>
    <Input type="email" id="email" placeholder="请输入邮箱" />
  </div>
);
```

### 配合 Field 使用

Field 组件提供统一的表单字段布局。

```tsx
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Demo = () => (
  <Field>
    <Label htmlFor="username">用户名</Label>
    <Input id="username" placeholder="请输入用户名" />
  </Field>
);
```

### 禁用和只读

```tsx
import { Input } from "@/components/ui/input";

const Demo = () => (
  <div className="flex flex-col gap-2">
    <Input disabled placeholder="禁用状态" />
    <Input readOnly defaultValue="只读内容，可选中复制" />
  </div>
);
```

### 文件上传

```tsx
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Demo = () => (
  <div className="grid w-full max-w-sm gap-1.5">
    <Label htmlFor="picture">上传图片</Label>
    <Input id="picture" type="file" />
  </div>
);
```

### 与 React Hook Form 集成

```tsx
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const Demo = () => {
  const { register, handleSubmit } = useForm();

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))} className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="name">姓名</Label>
        <Input id="name" {...register("name", { required: true })} />
      </div>
      <Button type="submit">提交</Button>
    </form>
  );
};
```

---

## Behavior

- **focus**：点击或 Tab 聚焦时显示 `ring` 高亮边框。
- **disabled**：视觉置灰（`opacity-50`），不可聚焦，不可编辑。
- **readOnly**：可聚焦，可选中复制文本，但不可编辑。
- **file**：`type="file"` 时有专门的文件选择按钮样式。
- **placeholder**：失焦且无值时显示占位文字，聚焦后保留直到有输入。

---

## When to use

**适用**：

- 表单中的文本输入（用户名、邮箱、密码等）。
- 搜索框。
- 简短的单行文本编辑。

**不适用**：

- **多行文本** → 用 `Textarea`。
- **下拉选择** → 用 `Select` 或 `Combobox`。
- **带前后缀/清除按钮** → 用 `Input Group`。

---

## Accessibility

- **键盘**：支持 Tab 聚焦，原生键盘交互。
- **ARIA**：必须配合 `<Label htmlFor>` 或 `aria-label` 关联标签。
- **焦点**：Focus Ring 清晰可见。

---

## Related

- `Label`：Input 必须配合 Label 使用，通过 `htmlFor` 关联。
- `Field`：推荐使用 Field 包裹 Label + Input，获得统一的表单字段布局。
- `Textarea`：多行文本输入场景用 Textarea 替代 Input。
- `Select`：固定选项用 Select，自由输入用 Input。
- `Form`：配合 React Hook Form + Form 组件实现完整的表单校验。
