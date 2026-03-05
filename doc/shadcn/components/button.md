---
name: Button
import: "import { Button } from '@/components/ui/button';"
install: "npx shadcn@latest add button"
category: general
status: stable
since: 0.1.0
aliases: [Btn, 按钮]
keywords: [提交, 保存, 确认, 取消, 删除, primary, loading, icon, destructive, ghost]
dependencies: ["@base-ui/react", "class-variance-authority"]
tokens: [--primary, --destructive, --secondary, --accent, --radius]
source: "components/ui/button.tsx"
---

# Button

触发操作的基础交互组件，用于提交表单、确认操作、触发流程等场景。支持 6 种视觉变体和 8 种尺寸预设。

---

## 核心规则（AI 生成时必读）

- **variant 语义**：`default` 用于主操作，`secondary` 用于次操作，`destructive` 用于危险操作（删除/清空），`outline` 用于有底色背景上的按钮，`ghost` 用于最低优先级操作，`link` 用于导航跳转。
- **Primary 数量**：同一视图中**最多 1 个** `default`（主色）按钮。
- **危险操作**：删除/不可逆操作**必须**用 `variant="destructive"`，且**必须**配合 `AlertDialog` 做二次确认。
- **仅图标按钮**：使用 `size="icon"` 时**必须**提供 `aria-label`。
- **加载状态**：异步操作时在 Button 内部渲染 `<Spinner />` 并设置 `disabled`，防止重复提交。
- **链接场景**：页面跳转**禁止**用 `<Button>`，应使用 `buttonVariants()` + 原生 `<a>` 标签，避免 `role="button"` 覆盖链接语义。
- **图标间距**：Button 内的图标**必须**添加 `data-icon="inline-start"` 或 `data-icon="inline-end"` 属性以获得正确间距。
- **禁止硬编码**：颜色/间距/圆角**必须**使用 Tailwind class 或 CSS 变量，禁止写 `8px` / `#1890ff`。

---

## Props / Variants

### Variants

| Variant | 可选值 | Default | Description |
|---------|--------|---------|-------------|
| variant | `"default" \| "destructive" \| "outline" \| "secondary" \| "ghost" \| "link"` | `"default"` | 视觉样式变体 |
| size | `"default" \| "xs" \| "sm" \| "lg" \| "icon" \| "icon-xs" \| "icon-sm" \| "icon-lg"` | `"default"` | 按钮尺寸 |

### Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| variant | 见上方 | | `"default"` | 视觉变体 |
| size | 见上方 | | `"default"` | 尺寸 |
| disabled | `boolean` | | `false` | 禁用状态 |
| className | `string` | | | 自定义类名 |
| children | `ReactNode` | | | 按钮内容 |

### buttonVariants

`buttonVariants` 是导出的 CVA 辅助函数，用于将按钮样式应用到非 `<Button>` 元素上（如 `<a>` 标签）。

```tsx
import { buttonVariants } from "@/components/ui/button";

<a href="/login" className={buttonVariants({ variant: "secondary", size: "sm" })}>
  Login
</a>
```

---

## Examples

### 基础用法

主操作用 `default`，次操作用 `outline` 或 `secondary`。

```tsx
import { Button } from "@/components/ui/button";

const Demo = () => (
  <div className="flex gap-2">
    <Button>提交</Button>
    <Button variant="outline">取消</Button>
  </div>
);
```

### 所有变体

```tsx
import { Button } from "@/components/ui/button";

const Demo = () => (
  <div className="flex flex-wrap gap-2">
    <Button variant="default">Default</Button>
    <Button variant="secondary">Secondary</Button>
    <Button variant="destructive">Destructive</Button>
    <Button variant="outline">Outline</Button>
    <Button variant="ghost">Ghost</Button>
    <Button variant="link">Link</Button>
  </div>
);
```

### 加载状态

异步操作时显示 Spinner 并禁用按钮，防止重复提交。

```tsx
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

const Demo = () => (
  <Button disabled>
    <Spinner data-icon="inline-start" />
    提交中...
  </Button>
);
```

### 带图标

图标需添加 `data-icon` 属性以获得正确间距。

```tsx
import { Button } from "@/components/ui/button";
import { MailIcon, ArrowRightIcon } from "lucide-react";

const Demo = () => (
  <div className="flex gap-2">
    <Button variant="outline">
      <MailIcon data-icon="inline-start" />
      发送邮件
    </Button>
    <Button>
      下一步
      <ArrowRightIcon data-icon="inline-end" />
    </Button>
  </div>
);
```

### 仅图标按钮

必须提供 `aria-label` 保证可访问性。

```tsx
import { Button } from "@/components/ui/button";
import { SearchIcon, XIcon } from "lucide-react";

const Demo = () => (
  <div className="flex gap-2">
    <Button variant="outline" size="icon" aria-label="搜索">
      <SearchIcon />
    </Button>
    <Button variant="ghost" size="icon" aria-label="关闭">
      <XIcon />
    </Button>
  </div>
);
```

### 链接样式

页面跳转用 `buttonVariants` + `<a>` 而不是 `<Button>`。

```tsx
import { buttonVariants } from "@/components/ui/button";

const Demo = () => (
  <a href="/docs" className={buttonVariants({ variant: "link" })}>
    查看文档
  </a>
);
```

---

## Behavior

- **disabled**：视觉置灰，鼠标样式为 `default`（Tailwind v4），不响应点击事件。
- **focus**：支持 Tab 键聚焦，聚焦时显示 `focus-visible` 轮廓。
- **键盘**：聚焦状态下 Enter / Space 触发点击。
- **loading**：通过在子内容中渲染 `<Spinner />` + `disabled` 实现，Button 自身不内置 loading prop。
- **圆角**：可通过 `className="rounded-full"` 覆盖为全圆角。

---

## When to use

**适用**：

- 提交表单、保存数据。
- 对话框的"确认/取消"操作。
- 触发即时操作（刷新、复制、导出等）。

**不适用**：

- **页面跳转** → 用 `<a>` + `buttonVariants()`，或用 Next.js `<Link>`。
- **超过 3 个并列操作** → 用 `DropdownMenu` 收敛到"更多"。
- **切换状态（开/关）** → 用 `Toggle` 或 `Switch`。

---

## Accessibility

- **键盘**：支持 Tab 聚焦，Enter / Space 激活。
- **焦点**：`focus-visible` 样式清晰可见。
- **ARIA**：仅图标按钮必须有 `aria-label`；加载中建议配合 `aria-busy="true"`。

---

## Related

- `Dialog`：Button 常作为 Dialog 的触发器和底部操作按钮。
- `AlertDialog`：危险操作的 destructive 按钮需配合 AlertDialog 做二次确认。
- `DropdownMenu`：多个操作可收敛到 DropdownMenu 中，触发器用 Button。
- `Tooltip`：仅图标按钮建议配合 Tooltip 提供文字说明。
- `Spinner`：加载状态时在 Button 内渲染 Spinner。
