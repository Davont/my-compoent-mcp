---
name: Tooltip
import: "import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';"
install: "npx shadcn@latest add tooltip"
category: feedback
status: stable
since: 0.1.0
aliases: [提示, 气泡提示, 文字提示]
keywords: [提示, hover, 悬浮, 气泡, tip, 说明, 辅助文字]
dependencies: ["@radix-ui/react-tooltip"]
tokens: [--popover, --popover-foreground, --radius]
source: "components/ui/tooltip.tsx"
---

# Tooltip

文字提示气泡，鼠标悬浮或聚焦时显示简短的说明文字。基于 Radix UI Tooltip 封装。

---

## 核心规则（AI 生成时必读）

- **TooltipProvider 必须存在**：**必须**确保组件树上层有 `<TooltipProvider>`。通常在应用根组件（如 `layout.tsx`）中全局包裹一次即可，无需每个 Tooltip 单独包裹。
- **内容简短**：Tooltip 内容**不超过两行文字**，长内容请用 `Popover`。
- **禁止交互元素**：Tooltip 内**禁止**放按钮、链接等可交互元素，需要交互用 `Popover`。
- **Trigger 可聚焦**：包裹的子元素**必须**能接收鼠标/焦点事件。`disabled` 的按钮无法触发 hover，需在外层包一个 `<span tabIndex={0}>` 再套 Tooltip。
- **图标按钮必配**：仅图标按钮**必须**配合 Tooltip 提供文字说明（除非已有 `aria-label`）。
- **side 就近原则**：默认 `side="top"`，靠近边缘时选择不会被截断的方向。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| TooltipProvider | 全局 Provider，管理延迟和行为 | ✅（通常全局一次） |
| Tooltip | 单个 Tooltip 实例 | ✅ |
| TooltipTrigger | 触发元素 | ✅ |
| TooltipContent | 提示内容 | ✅ |

---

## Props

### TooltipProvider

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| delayDuration | `number` | | `200` | 鼠标移入后延迟显示（ms） |
| skipDelayDuration | `number` | | `300` | 快速移动时跳过延迟的时间窗口 |

### Tooltip

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| open | `boolean` | | | 受控显示状态 |
| defaultOpen | `boolean` | | `false` | 默认显示状态 |
| onOpenChange | `(open: boolean) => void` | | | 状态变化回调 |

### TooltipTrigger

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| asChild | `boolean` | | `false` | 是否将样式/行为传递给子元素 |

### TooltipContent

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| side | `"top" \| "right" \| "bottom" \| "left"` | | `"top"` | 弹出方向 |
| sideOffset | `number` | | `4` | 与触发元素的距离（px） |
| align | `"start" \| "center" \| "end"` | | `"center"` | 对齐方式 |
| className | `string` | | | 自定义类名 |

---

## Examples

### 基础用法

```tsx
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Demo = () => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button variant="outline">悬浮查看</Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>这是提示文字</p>
    </TooltipContent>
  </Tooltip>
);
```

### 不同方向

```tsx
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Demo = () => (
  <div className="flex gap-4">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">上</Button>
      </TooltipTrigger>
      <TooltipContent side="top">上方提示</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">下</Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">下方提示</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">左</Button>
      </TooltipTrigger>
      <TooltipContent side="left">左侧提示</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">右</Button>
      </TooltipTrigger>
      <TooltipContent side="right">右侧提示</TooltipContent>
    </Tooltip>
  </div>
);
```

### 为图标按钮添加提示

```tsx
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SearchIcon, SettingsIcon } from "lucide-react";

const Demo = () => (
  <div className="flex gap-2">
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" aria-label="搜索">
          <SearchIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>搜索</TooltipContent>
    </Tooltip>
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" aria-label="设置">
          <SettingsIcon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>设置</TooltipContent>
    </Tooltip>
  </div>
);
```

### 为 disabled 元素添加提示

disabled 元素无法触发 hover，需包裹 `<span>`。

```tsx
import { Button } from "@/components/ui/button";
import {
  Tooltip, TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const Demo = () => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span tabIndex={0} className="inline-block">
        <Button disabled>无权限</Button>
      </span>
    </TooltipTrigger>
    <TooltipContent>你没有执行此操作的权限</TooltipContent>
  </Tooltip>
);
```

---

## Behavior

- **hover 触发**：鼠标移入后延迟 `delayDuration` 毫秒显示，移出后立即隐藏。
- **focus 触发**：Tab 聚焦到 Trigger 时也会显示 Tooltip。
- **快速移动**：在 `skipDelayDuration` 时间窗口内，从一个 Tooltip 移到另一个时跳过延迟。
- **位置自适应**：当指定 `side` 方向空间不足时，自动翻转到对面方向。
- **不抢焦点**：Tooltip 不抢夺焦点，焦点始终在触发元素上。

---

## When to use

**适用**：

- 图标按钮的操作说明。
- 被截断文本的完整内容展示。
- 表格列标题的补充解释。
- disabled 元素的禁用原因说明。

**不适用**：

- **需要交互的内容** → 用 `Popover`。
- **操作确认** → 用 `AlertDialog`。
- **大段说明文字** → 用 `Popover`。

---

## Accessibility

- **键盘**：Tab 聚焦触发元素时显示 Tooltip，ESC 可关闭。
- **焦点**：Tooltip 不抢夺焦点。
- **ARIA**：浮层 `role="tooltip"`，触发元素通过 `aria-describedby` 关联。

---

## Related

- `Button`：仅图标按钮必须配合 Tooltip 提供说明。
- `Popover`：需要交互内容的弹出层用 Popover。
- `Dialog`：需要用户确认操作时用 Dialog 而非 Tooltip。
