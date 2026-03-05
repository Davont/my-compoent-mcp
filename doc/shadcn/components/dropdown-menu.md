---
name: DropdownMenu
import: "import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuShortcut, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuRadioGroup, DropdownMenuRadioItem } from '@/components/ui/dropdown-menu';"
install: "npx shadcn@latest add dropdown-menu"
category: navigation
status: stable
since: 0.1.0
aliases: [下拉菜单, 右键菜单, Menu]
keywords: [菜单, 下拉, 操作, 更多, menu, dropdown, actions, context]
dependencies: ["@radix-ui/react-dropdown-menu"]
tokens: [--popover, --accent, --destructive, --border, --radius]
source: "components/ui/dropdown-menu.tsx"
---

# DropdownMenu

下拉菜单组件，用于收敛多个操作到一个触发按钮中。基于 Radix UI DropdownMenu 封装，支持分组、子菜单、勾选项、快捷键提示等。

---

## 核心规则（AI 生成时必读）

- **组合结构**：**必须**使用 `DropdownMenu` → `DropdownMenuTrigger` + `DropdownMenuContent`（含 `DropdownMenuItem`）的组合结构。
- **Trigger 用 Button**：`DropdownMenuTrigger` 的 `render` prop **必须**渲染为 Button，通常是 `<Button variant="outline" size="icon">`。
- **分组**：相关操作**建议**用 `DropdownMenuGroup` 分组，组间用 `DropdownMenuSeparator` 分隔。
- **危险操作**：删除等危险操作**必须**使用 `<DropdownMenuItem variant="destructive">`，且放在菜单最后并与其他项用 Separator 隔开。
- **快捷键**：有键盘快捷键的操作**建议**用 `<DropdownMenuShortcut>` 展示（仅视觉提示，快捷键逻辑需业务层实现）。
- **子菜单**：嵌套不超过 2 层，过深时请重新设计信息架构。
- **禁用项**：禁用的菜单项通过 `disabled` 属性设置，**建议**配合视觉说明为什么禁用。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| DropdownMenu | 根容器 | ✅ |
| DropdownMenuTrigger | 触发按钮 | ✅ |
| DropdownMenuContent | 菜单内容容器 | ✅ |
| DropdownMenuItem | 菜单项 | ✅ |
| DropdownMenuGroup | 分组容器 | 建议 |
| DropdownMenuLabel | 分组标签 | 可选 |
| DropdownMenuSeparator | 分隔线 | 建议 |
| DropdownMenuShortcut | 快捷键提示 | 可选 |
| DropdownMenuSub | 子菜单容器 | 可选 |
| DropdownMenuSubTrigger | 子菜单触发项 | 可选 |
| DropdownMenuSubContent | 子菜单内容 | 可选 |
| DropdownMenuCheckboxItem | 可勾选菜单项 | 可选 |
| DropdownMenuRadioGroup | 单选组 | 可选 |
| DropdownMenuRadioItem | 单选菜单项 | 可选 |

---

## Props

### DropdownMenuTrigger

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| render | `ReactElement` | | | 指定渲染的触发元素 |
| asChild | `boolean` | | `false` | 将行为传递给子元素 |

### DropdownMenuContent

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| align | `"start" \| "center" \| "end"` | | `"center"` | 对齐方式 |
| sideOffset | `number` | | `4` | 与触发元素的距离 |
| className | `string` | | | 自定义类名（常用于控制宽度如 `w-56`） |

### DropdownMenuItem

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| variant | `"default" \| "destructive"` | | `"default"` | 样式变体，destructive 用于危险操作 |
| disabled | `boolean` | | `false` | 禁用该项 |
| onSelect | `(e: Event) => void` | | | 选中回调 |
| children | `ReactNode` | | | 菜单项内容（支持图标 + 文字） |

### DropdownMenuCheckboxItem

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| checked | `boolean` | | | 勾选状态 |
| onCheckedChange | `(checked: boolean) => void` | | | 状态变化回调 |

### DropdownMenuRadioItem

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string` | ✅ | | 单选值 |

---

## Examples

### 基础用法

```tsx
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";

const Demo = () => (
  <DropdownMenu>
    <DropdownMenuTrigger render={
      <Button variant="outline" size="icon" aria-label="更多操作" />
    }>
      <MoreHorizontalIcon />
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-48">
      <DropdownMenuLabel>操作</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>编辑</DropdownMenuItem>
        <DropdownMenuItem>复制</DropdownMenuItem>
        <DropdownMenuItem>分享</DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem variant="destructive">删除</DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
```

### 带图标和快捷键

```tsx
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuShortcut, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CopyIcon, PencilIcon, MoreVerticalIcon, Trash2Icon,
} from "lucide-react";

const Demo = () => (
  <DropdownMenu>
    <DropdownMenuTrigger render={
      <Button variant="ghost" size="icon" aria-label="操作菜单" />
    }>
      <MoreVerticalIcon />
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-48">
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <PencilIcon />
          编辑
          <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <CopyIcon />
          复制
          <DropdownMenuShortcut>⌘C</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem variant="destructive">
          <Trash2Icon />
          删除
          <DropdownMenuShortcut>⌘⌫</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuGroup>
    </DropdownMenuContent>
  </DropdownMenu>
);
```

### 子菜单

```tsx
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuGroup,
  DropdownMenuItem, DropdownMenuSeparator,
  DropdownMenuSub, DropdownMenuSubContent,
  DropdownMenuSubTrigger, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TagIcon } from "lucide-react";

const Demo = () => (
  <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="outline" />}>
      操作
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-48">
      <DropdownMenuGroup>
        <DropdownMenuItem>编辑</DropdownMenuItem>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <TagIcon />
            标记为...
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuItem>重要</DropdownMenuItem>
            <DropdownMenuItem>待办</DropdownMenuItem>
            <DropdownMenuItem>已完成</DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem>归档</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
```

### 勾选菜单项

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuCheckboxItem,
  DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SlidersHorizontalIcon } from "lucide-react";

export function ColumnFilter() {
  const [showName, setShowName] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showRole, setShowRole] = useState(false);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
        <SlidersHorizontalIcon data-icon="inline-start" />
        显示列
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuLabel>切换列显示</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked={showName} onCheckedChange={setShowName}>
          姓名
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={showEmail} onCheckedChange={setShowEmail}>
          邮箱
        </DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked={showRole} onCheckedChange={setShowRole}>
          角色
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## Behavior

- **展开/收起**：点击 Trigger 展开，再次点击或点击外部收起。
- **键盘导航**：上下箭头在菜单项间导航，Enter/Space 选中，ESC 收起，右箭头进入子菜单，左箭头返回上级。
- **hover 高亮**：鼠标移动时自动高亮当前项。
- **禁用项**：disabled 的项不可选中但仍可见，键盘导航会跳过。
- **位置自适应**：根据可用空间自动调整弹出方向和对齐。

---

## When to use

**适用**：

- 多个操作需要收敛到一个按钮中（"更多操作"场景）。
- 表格行操作菜单。
- 工具栏中次要操作的收纳。

**不适用**：

- **表单选择** → 用 `Select`。
- **导航菜单** → 用 `NavigationMenu`。
- **右键菜单** → 用 `ContextMenu`。

---

## Accessibility

- **键盘**：Enter/Space 展开，箭头导航，Enter 选中，ESC 收起。
- **ARIA**：`role="menu"`，菜单项 `role="menuitem"`，勾选项 `role="menuitemcheckbox"`，单选项 `role="menuitemradio"`。
- **焦点**：展开时焦点移入菜单，收起后焦点返回 Trigger。

---

## Related

- `Button`：Trigger 通常渲染为 Button。
- `ContextMenu`：右键触发的菜单用 ContextMenu。
- `Select`：表单选择用 Select 而非 DropdownMenu。
- `Table`：表格行操作列常用 DropdownMenu。
