---
name: Select
import: "import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';"
install: "npx shadcn@latest add select"
category: form
status: stable
since: 0.1.0
aliases: [下拉选择, 选择器, Dropdown]
keywords: [选择, 下拉, 选项, option, 枚举, 筛选]
dependencies: ["@radix-ui/react-select"]
tokens: [--popover, --border, --accent, --radius]
source: "components/ui/select.tsx"
---

# Select

下拉选择器，从预定义的选项列表中选择一个值。基于 Radix UI Select 封装，支持分组、占位符和受控/非受控模式。

---

## 核心规则（AI 生成时必读）

- **组合结构**：**必须**使用 `Select` → `SelectTrigger`（含 `SelectValue`）+ `SelectContent`（含 `SelectItem`）的组合结构。
- **SelectValue 占位**：`SelectTrigger` 内**必须**包含 `<SelectValue placeholder="请选择" />`。
- **受控优先**：表单场景**必须**使用受控模式（`value` + `onValueChange`）。
- **关联 Label**：**必须**配合 `<Label>` 使用，或提供 `aria-label`。
- **仅单选**：shadcn/ui Select **不支持多选**，多选场景请用 `Combobox` 或自定义方案。
- **分组**：选项较多时**建议**用 `SelectGroup` + `SelectLabel` 分组，提高可读性。
- **禁用项**：禁用选项通过 `<SelectItem disabled>` 设置。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| Select | 根容器，管理选中状态 | ✅ |
| SelectTrigger | 触发器，显示当前选中值 | ✅ |
| SelectValue | 显示选中值或占位符 | ✅ |
| SelectContent | 下拉内容容器 | ✅ |
| SelectItem | 选项 | ✅ |
| SelectGroup | 选项分组容器 | 可选 |
| SelectLabel | 分组标签 | 可选 |
| SelectSeparator | 分隔线 | 可选 |

---

## Props

### Select

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string` | | | 受控选中值 |
| defaultValue | `string` | | | 默认选中值 |
| onValueChange | `(value: string) => void` | | | 选中值变化回调 |
| disabled | `boolean` | | `false` | 禁用整个选择器 |
| name | `string` | | | 表单字段名（用于表单提交） |

### SelectTrigger

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| className | `string` | | | 自定义类名（常用于控制宽度如 `w-[200px]`） |

### SelectItem

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string` | ✅ | | 选项值 |
| disabled | `boolean` | | `false` | 禁用该选项 |
| children | `ReactNode` | | | 选项显示内容 |

---

## Examples

### 基础用法

```tsx
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const Demo = () => (
  <div className="grid gap-1.5">
    <Label htmlFor="fruit">水果</Label>
    <Select>
      <SelectTrigger className="w-[200px]" id="fruit">
        <SelectValue placeholder="请选择水果" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="apple">苹果</SelectItem>
        <SelectItem value="banana">香蕉</SelectItem>
        <SelectItem value="orange">橙子</SelectItem>
      </SelectContent>
    </Select>
  </div>
);
```

### 受控模式

```tsx
import { useState } from "react";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

const Demo = () => {
  const [value, setValue] = useState("");

  return (
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="请选择角色" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="admin">管理员</SelectItem>
        <SelectItem value="editor">编辑</SelectItem>
        <SelectItem value="viewer">查看者</SelectItem>
      </SelectContent>
    </Select>
  );
};
```

### 分组选项

选项较多时分组展示，提高可读性。

```tsx
import {
  Select, SelectContent, SelectGroup, SelectItem,
  SelectLabel, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const Demo = () => (
  <Select>
    <SelectTrigger className="w-[250px]">
      <SelectValue placeholder="选择城市" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>华北</SelectLabel>
        <SelectItem value="beijing">北京</SelectItem>
        <SelectItem value="tianjin">天津</SelectItem>
      </SelectGroup>
      <SelectGroup>
        <SelectLabel>华东</SelectLabel>
        <SelectItem value="shanghai">上海</SelectItem>
        <SelectItem value="hangzhou">杭州</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
);
```

### 禁用选项

```tsx
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";

const Demo = () => (
  <Select>
    <SelectTrigger className="w-[200px]">
      <SelectValue placeholder="请选择" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="free">免费版</SelectItem>
      <SelectItem value="pro">专业版</SelectItem>
      <SelectItem value="enterprise" disabled>企业版（即将推出）</SelectItem>
    </SelectContent>
  </Select>
);
```

---

## Behavior

- **展开/收起**：点击 SelectTrigger 展开下拉，选中后自动收起。
- **键盘导航**：展开后用上下箭头导航选项，Enter 选中，ESC 收起。
- **类型搜索**：展开后直接输入字母可快速定位到匹配选项。
- **禁用**：整体 `disabled` 后不可展开；单个 SelectItem `disabled` 后不可选中但仍可见。
- **位置**：下拉浮层自动根据可用空间决定向上或向下展开。

---

## When to use

**适用**：

- 从 5 个以上预定义选项中选择一个值。
- 表单中的枚举字段（角色、状态、地区等）。

**不适用**：

- **2-4 个选项** → 用 `RadioGroup`，更直观。
- **多选** → 用 `Combobox`（shadcn Select 仅支持单选）。
- **可搜索 + 创建** → 用 `Combobox`。
- **层级选择** → 自定义级联选择。

---

## Accessibility

- **键盘**：Tab 聚焦 Trigger，Enter/Space 展开，上下箭头导航，Enter 选中，ESC 收起。
- **ARIA**：`role="combobox"`、`aria-expanded`、`aria-haspopup="listbox"`，选项 `role="option"`。
- **类型搜索**：键入字符自动聚焦匹配项。

---

## Related

- `Input`：自由文本输入用 Input，固定选项用 Select。
- `RadioGroup`：选项少（2-4 个）时用 RadioGroup 更直观。
- `Combobox`：需要搜索过滤或多选时用 Combobox。
- `Label`：Select 必须配合 Label 使用。
- `Form`：配合 React Hook Form + Form 组件实现表单校验。
