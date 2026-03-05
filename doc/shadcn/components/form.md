---
name: Form
import: "import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';"
install: "npx shadcn@latest add form"
category: form
status: stable
since: 0.1.0
aliases: [表单]
keywords: [表单, 提交, 校验, 验证, form, validate, submit, react-hook-form, zod]
dependencies: ["react-hook-form", "@hookform/resolvers", "zod"]
tokens: [--destructive, --muted-foreground, --ring]
source: "components/ui/form.tsx"
---

# Form

表单组件，基于 React Hook Form 封装，配合 Zod schema 做类型安全的表单校验。提供 `FormField` → `FormItem` → `FormLabel` / `FormControl` / `FormMessage` 的标准结构。

---

## 核心规则（AI 生成时必读）

- **必须使用 React Hook Form**：Form 组件**必须**配合 `useForm()` 使用，**禁止**自行管理表单状态。
- **必须使用 Zod schema**：校验规则**必须**通过 Zod schema 定义 + `zodResolver` 注入，**禁止**手写校验逻辑。
- **组合结构**：**必须**使用 `FormField` → `FormItem` → `FormLabel` + `FormControl` + `FormMessage` 的嵌套结构。**禁止**跳层或用 div 替代。
- **FormControl 包裹**：表单控件（Input/Select 等）**必须**放在 `<FormControl>` 内，这负责自动关联 `aria-*` 属性。
- **FormMessage 必放**：每个 FormItem **必须**包含 `<FormMessage />`，无错误时不渲染，有错误时自动显示校验提示。
- **render 函数**：`FormField` 的 `render` prop 接收 `({ field }) => JSX`，表单控件通过 `{...field}` 绑定。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| Form | 根容器，接收 useForm 返回值 | ✅ |
| FormField | 字段容器，连接 useForm 的 control | ✅ |
| FormItem | 字段布局容器（Label + Control + Message） | ✅ |
| FormLabel | 字段标签 | ✅ |
| FormControl | 控件容器，自动注入 aria 属性 | ✅ |
| FormDescription | 字段描述/帮助文字 | 可选 |
| FormMessage | 校验错误信息 | ✅ |

---

## Props

### Form

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| ...form | `UseFormReturn` | ✅ | | useForm() 的返回值，通过展开传入 |

### FormField

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| control | `Control` | ✅ | | useForm 返回的 control |
| name | `string` | ✅ | | 字段名，对应 schema 中的 key |
| render | `({ field }) => ReactNode` | ✅ | | 渲染函数，field 包含 value/onChange/onBlur 等 |

---

## Examples

### 基础用法

登录表单：用户名 + 密码 + Zod 校验。

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormField,
  FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const formSchema = z.object({
  username: z.string().min(2, "用户名至少 2 个字符"),
  password: z.string().min(6, "密码至少 6 个字符"),
});

type FormValues = z.infer<typeof formSchema>;

export function LoginForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { username: "", password: "" },
  });

  function onSubmit(values: FormValues) {
    console.log(values);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder="请输入用户名" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <Input type="password" placeholder="请输入密码" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full">登录</Button>
      </form>
    </Form>
  );
}
```

### 带描述和 Select

```tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form, FormControl, FormDescription, FormField,
  FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
  role: z.string({ required_error: "请选择角色" }),
});

type FormValues = z.infer<typeof formSchema>;

export function SettingsForm() {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(console.log)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input placeholder="you@example.com" {...field} />
              </FormControl>
              <FormDescription>用于接收通知和找回密码。</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>角色</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="请选择角色" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="admin">管理员</SelectItem>
                  <SelectItem value="editor">编辑</SelectItem>
                  <SelectItem value="viewer">查看者</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">保存</Button>
      </form>
    </Form>
  );
}
```

---

## Behavior

- **校验时机**：默认在提交时校验所有字段，可通过 `mode: "onBlur"` 或 `mode: "onChange"` 改为即时校验。
- **错误显示**：校验失败时 FormMessage 自动显示对应字段的错误信息，同时 FormLabel 变为红色。
- **无障碍关联**：FormControl 自动为内部控件注入 `aria-describedby`（关联 FormDescription 和 FormMessage）和 `aria-invalid`。
- **重置**：调用 `form.reset()` 可重置所有字段到 defaultValues。

---

## When to use

**适用**：

- 需要校验的表单场景（登录、注册、设置、数据录入）。
- 多字段 + 复杂校验逻辑的表单。

**不适用**：

- **单个搜索框** → 直接用 Input，无需 Form 包裹。
- **纯展示数据** → 不需要表单。

---

## Accessibility

- **标签关联**：FormControl 自动通过 `id` 关联 FormLabel 的 `htmlFor`。
- **错误关联**：`aria-describedby` 自动关联 FormMessage 和 FormDescription。
- **错误状态**：`aria-invalid="true"` 自动在校验失败时设置。
- **键盘**：Tab 在字段间跳转，Enter 提交表单。

---

## Related

- `Input`：最常用的表单控件，放在 FormControl 内。
- `Select`：下拉选择控件，注意 `onValueChange` 对接 `field.onChange`。
- `Button`：表单提交按钮，必须设置 `type="submit"`。
- `Card`：表单常放在 Card 内作为容器。
- `Dialog`：Dialog 内嵌表单时，提交和关闭逻辑需协调处理。
