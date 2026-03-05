---
name: Card
import: "import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';"
install: "npx shadcn@latest add card"
category: layout
status: stable
since: 0.1.0
aliases: [卡片, 容器, Panel]
keywords: [卡片, 面板, 容器, 内容块, card, panel, container, section]
dependencies: []
tokens: [--card, --card-foreground, --border, --radius]
source: "components/ui/card.tsx"
---

# Card

卡片容器组件，用于将相关内容和操作组织在一个有边框的区域内。是 shadcn/ui 中最常用的布局容器之一。

---

## 核心规则（AI 生成时必读）

- **组合结构**：**必须**使用 `Card` → `CardHeader` / `CardContent` / `CardFooter` 的组合结构，**禁止**在 Card 内直接写裸内容。
- **标题必填**：`CardHeader` 内**必须**包含 `CardTitle`，`CardDescription` 建议填写以提供上下文。
- **语义分层**：头部信息放 `CardHeader`，主体内容放 `CardContent`，操作按钮放 `CardFooter`。不要把按钮放在 CardContent 底部。
- **宽度控制**：Card 默认占满父容器宽度，**必须**通过父容器或 `className` 控制宽度（如 `className="w-[350px]"` 或使用 grid 布局）。
- **禁止嵌套**：**禁止** Card 内再嵌套 Card，层级过多时请重新设计信息结构。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| Card | 根容器，提供边框和圆角 | ✅ |
| CardHeader | 头部区域，包含标题和描述 | ✅ |
| CardTitle | 标题 | ✅ |
| CardDescription | 描述/副标题 | 建议 |
| CardContent | 主体内容区域 | ✅ |
| CardFooter | 底部操作区域 | 可选 |

---

## Props

Card 及其子组件均为纯样式组件，接收标准 HTML `<div>` 属性：

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| className | `string` | | | 自定义类名 |
| children | `ReactNode` | | | 子内容 |

---

## Examples

### 基础用法

```tsx
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";

const Demo = () => (
  <Card className="w-[350px]">
    <CardHeader>
      <CardTitle>项目概览</CardTitle>
      <CardDescription>查看你的项目关键指标。</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-sm text-muted-foreground">
        当前有 12 个活跃项目，3 个待处理任务。
      </p>
    </CardContent>
  </Card>
);
```

### 带操作按钮

Footer 区域放置操作按钮。

```tsx
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";

const Demo = () => (
  <Card className="w-[350px]">
    <CardHeader>
      <CardTitle>订阅计划</CardTitle>
      <CardDescription>选择适合你的方案。</CardDescription>
    </CardHeader>
    <CardContent>
      <p className="text-2xl font-bold">¥99/月</p>
      <p className="text-sm text-muted-foreground">包含所有高级功能</p>
    </CardContent>
    <CardFooter className="flex justify-between">
      <Button variant="outline">了解更多</Button>
      <Button>立即订阅</Button>
    </CardFooter>
  </Card>
);
```

### 嵌入表单

Card 内放置表单控件。

```tsx
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription,
  CardFooter, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Demo = () => (
  <Card className="w-[350px]">
    <CardHeader>
      <CardTitle>创建项目</CardTitle>
      <CardDescription>填写信息创建一个新项目。</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="project-name">项目名称</Label>
        <Input id="project-name" placeholder="输入项目名称" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="project-desc">项目描述</Label>
        <Input id="project-desc" placeholder="简要描述你的项目" />
      </div>
    </CardContent>
    <CardFooter className="flex justify-end gap-2">
      <Button variant="outline">取消</Button>
      <Button>创建</Button>
    </CardFooter>
  </Card>
);
```

### 卡片列表（Grid 布局）

用 CSS Grid 排列多个卡片。

```tsx
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";

const items = [
  { title: "总用户数", value: "2,350", desc: "较上月 +12.5%" },
  { title: "活跃用户", value: "1,200", desc: "较上月 +8.2%" },
  { title: "收入", value: "¥45,231", desc: "较上月 +20.1%" },
];

const Demo = () => (
  <div className="grid gap-4 md:grid-cols-3">
    {items.map((item) => (
      <Card key={item.title}>
        <CardHeader>
          <CardDescription>{item.title}</CardDescription>
          <CardTitle className="text-2xl">{item.value}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">{item.desc}</p>
        </CardContent>
      </Card>
    ))}
  </div>
);
```

---

## Behavior

- **纯展示**：Card 是纯样式容器，没有交互状态和事件。
- **响应式**：宽度由父容器或 className 控制，默认 `w-full`。
- **暗色模式**：自动跟随主题切换背景色和边框色。

---

## When to use

**适用**：

- 将相关信息分组展示（Dashboard 数据卡、用户信息卡等）。
- 表单容器（登录、注册、创建资源）。
- 列表中的每个条目。

**不适用**：

- **全页面容器** → 直接用 `<div>` + `<section>`。
- **可展开收起的内容** → 用 `Accordion` 或 `Collapsible`。
- **内容间需要切换** → 用 `Tabs`。

---

## Accessibility

- **语义**：Card 渲染为 `<div>`，重要区域建议添加 `role="region"` + `aria-label`。
- **标题层级**：CardTitle 默认渲染为 `<h3>`（可通过 `asChild` 修改），注意与页面标题层级一致。

---

## Related

- `Tabs`：需要在同一区域切换不同内容时用 Tabs，每个 TabsContent 内可放 Card。
- `Dialog`：弹出展示详情时用 Dialog，Card 适合页面内嵌展示。
- `Table`：表格数据展示常放在 Card 内作为容器。
- `Button`：Card 底部操作区（CardFooter）常放 Button。
