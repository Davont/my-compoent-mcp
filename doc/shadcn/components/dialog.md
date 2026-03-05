---
name: Dialog
import: "import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from '@/components/ui/dialog';"
install: "npx shadcn@latest add dialog"
category: feedback
status: stable
since: 0.1.0
aliases: [Modal, 弹窗, 对话框]
keywords: [弹窗, 模态, 确认, 弹出, 遮罩, modal, popup, overlay]
dependencies: ["@base-ui/react"]
tokens: [--background, --border, --radius, --ring]
source: "components/ui/dialog.tsx"
---

# Dialog

模态对话框，在不离开当前页面的情况下弹出浮层承载操作或信息。基于 Base UI Dialog 封装。

---

## 核心规则（AI 生成时必读）

- **组合结构**：**必须**使用 `Dialog` → `DialogTrigger` + `DialogContent` 的组合结构，DialogContent 内**建议**包含 `DialogHeader`（含 `DialogTitle` + `DialogDescription`）。
- **标题必填**：**必须**提供 `DialogTitle`，用于无障碍标识。如果设计上不需要可见标题，用 `className="sr-only"` 隐藏但保留。
- **描述建议填**：**建议**提供 `DialogDescription`，为屏幕阅读器用户提供上下文。
- **禁止嵌套**：**禁止** Dialog 内再打开 Dialog，多步操作请用步骤条或拆分流程。
- **关闭方式**：默认支持点击遮罩、ESC、右上角关闭按钮关闭。可通过 `showCloseButton={false}` 隐藏关闭按钮，但此时**必须**提供其他关闭方式（如 `DialogClose` 按钮）。
- **危险操作**：删除等不可逆操作**应使用** `AlertDialog` 而非普通 Dialog，AlertDialog 不支持点击遮罩关闭，更安全。
- **DialogTrigger 用法**：通过 `render` prop 指定触发元素，如 `<DialogTrigger render={<Button variant="outline" />}>Open</DialogTrigger>`。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| Dialog | 根容器，管理开关状态 | ✅ |
| DialogTrigger | 触发按钮 | ✅ |
| DialogContent | 弹窗内容容器 | ✅ |
| DialogHeader | 头部容器（包裹 Title + Description） | 建议 |
| DialogTitle | 标题 | ✅ |
| DialogDescription | 描述文字 | 建议 |
| DialogFooter | 底部操作区 | 可选 |
| DialogClose | 关闭按钮（可放在 Footer 中） | 可选 |

---

## Props

### DialogContent

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| showCloseButton | `boolean` | | `true` | 是否显示右上角关闭按钮 |
| className | `string` | | | 自定义类名（常用于控制宽度如 `sm:max-w-sm`） |

### DialogTrigger

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| render | `ReactElement` | | | 指定渲染的触发元素 |
| children | `ReactNode` | | | 触发元素内容 |

### DialogClose

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| render | `ReactElement` | | | 指定渲染的关闭元素 |
| children | `ReactNode` | | | 关闭按钮内容 |

---

## Examples

### 基础用法

```tsx
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const Demo = () => (
  <Dialog>
    <DialogTrigger render={<Button variant="outline" />}>
      打开弹窗
    </DialogTrigger>
    <DialogContent className="sm:max-w-sm">
      <DialogHeader>
        <DialogTitle>提示</DialogTitle>
        <DialogDescription>
          这是一个基础的对话框示例。
        </DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
);
```

### 带表单的 Dialog

Dialog 内嵌表单，Footer 放确认和取消按钮。

```tsx
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Demo = () => (
  <Dialog>
    <form>
      <DialogTrigger render={<Button variant="outline" />}>
        编辑资料
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>编辑个人资料</DialogTitle>
          <DialogDescription>修改后点击保存。</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="name">姓名</Label>
            <Input id="name" name="name" defaultValue="张三" />
          </Field>
          <Field>
            <Label htmlFor="email">邮箱</Label>
            <Input id="email" name="email" defaultValue="zhangsan@example.com" />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>取消</DialogClose>
          <Button type="submit">保存</Button>
        </DialogFooter>
      </DialogContent>
    </form>
  </Dialog>
);
```

### 隐藏关闭按钮

使用 `showCloseButton={false}` 隐藏右上角关闭，用 Footer 中的按钮代替。

```tsx
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const Demo = () => (
  <Dialog>
    <DialogTrigger render={<Button variant="outline" />}>打开</DialogTrigger>
    <DialogContent showCloseButton={false}>
      <DialogHeader>
        <DialogTitle>确认操作</DialogTitle>
        <DialogDescription>请确认你的操作。</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <DialogClose render={<Button variant="outline" />}>关闭</DialogClose>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
```

---

## Behavior

- **打开**：点击 DialogTrigger 打开弹窗，自动聚焦到 DialogContent 内第一个可聚焦元素。
- **关闭**：点击遮罩、按 ESC、点击关闭按钮（或 DialogClose）均可关闭。
- **焦点陷阱**：Tab 循环限制在 Dialog 内部，不会跳到背后的页面元素。
- **body 锁定**：打开时禁止背景页面滚动。
- **关闭后**：焦点自动返回到 DialogTrigger 元素。
- **动画**：内置进入/退出过渡动画。

---

## When to use

**适用**：

- 需要用户确认或填写信息的操作。
- 在当前页面上下文中展示少量内容或简单表单。
- 需要阻断用户操作流的重要提示。

**不适用**：

- **大量内容/复杂表单** → 用 `Sheet`（抽屉）。
- **危险操作确认** → 用 `AlertDialog`（不可点击遮罩关闭，更安全）。
- **轻量提示** → 用 `Tooltip` 或 `Popover`。
- **全局通知** → 用 `Toast`（Sonner）。

---

## Accessibility

- **键盘**：ESC 关闭，Tab 在 Dialog 内循环聚焦。
- **焦点**：打开时自动聚焦首个可聚焦元素，关闭后焦点返回触发元素。
- **ARIA**：`role="dialog"`、`aria-modal="true"`、`aria-labelledby` 指向 DialogTitle、`aria-describedby` 指向 DialogDescription。

---

## Related

- `AlertDialog`：危险操作确认用 AlertDialog，不支持点击遮罩关闭，更安全。
- `Sheet`：侧边抽屉，适合大量内容或复杂表单。
- `Button`：DialogTrigger 和 DialogFooter 中常用 Button。
- `Popover`：轻量级弹出层，不阻断页面操作流。
