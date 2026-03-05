---
name: Tabs
import: "import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';"
install: "npx shadcn@latest add tabs"
category: navigation
status: stable
since: 0.1.0
aliases: [标签页, 选项卡, TabBar]
keywords: [标签, 切换, 导航, tab, switch, panel, 选项卡]
dependencies: ["@base-ui/react"]
tokens: [--muted, --background, --border, --ring]
source: "components/ui/tabs.tsx"
---

# Tabs

标签页组件，在同一区域内切换展示不同的内容面板。基于 Base UI Tabs 封装，支持默认和线条两种样式变体。

---

## 核心规则（AI 生成时必读）

- **value 必须匹配**：每个 `TabsTrigger` 的 `value` **必须**与对应 `TabsContent` 的 `value` 完全一致。
- **defaultValue 必填**：**必须**设置 `defaultValue` 指定默认激活的标签页，避免初始无内容展示。
- **数量控制**：标签页**建议**控制在 2-7 个，超过 5 个时建议考虑其他导航方式（如侧边栏、下拉选择）。
- **内容独立**：每个 `TabsContent` 的内容应相对独立，**禁止**跨 Tab 共享表单状态（切换时非活跃 Tab 会卸载）。
- **line 变体**：页面级导航**建议**使用 `variant="line"` 样式，卡片内切换使用默认样式。
- **受控模式**：需要程序化切换时使用 `value` + `onValueChange` 受控模式。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| Tabs | 根容器 | ✅ |
| TabsList | 标签按钮列表容器 | ✅ |
| TabsTrigger | 单个标签按钮 | ✅ |
| TabsContent | 标签对应的内容面板 | ✅ |

---

## Props

### Tabs

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| defaultValue | `string` | ✅ | | 默认激活的标签页 value |
| value | `string` | | | 受控模式下的激活值 |
| onValueChange | `(value: string) => void` | | | 标签切换回调 |
| orientation | `"horizontal" \| "vertical"` | | `"horizontal"` | 排列方向 |
| className | `string` | | | 自定义类名 |

### TabsList

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| variant | `"default" \| "line"` | | `"default"` | 样式变体 |
| className | `string` | | | 自定义类名 |

### TabsTrigger

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string` | ✅ | | 标签标识，与 TabsContent 的 value 匹配 |
| disabled | `boolean` | | `false` | 禁用该标签 |
| children | `ReactNode` | | | 标签内容（文字或图标+文字） |

### TabsContent

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string` | ✅ | | 内容面板标识，与 TabsTrigger 的 value 匹配 |
| className | `string` | | | 自定义类名 |

---

## Examples

### 基础用法

```tsx
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const Demo = () => (
  <Tabs defaultValue="overview" className="w-[400px]">
    <TabsList>
      <TabsTrigger value="overview">概览</TabsTrigger>
      <TabsTrigger value="analytics">分析</TabsTrigger>
      <TabsTrigger value="settings">设置</TabsTrigger>
    </TabsList>
    <TabsContent value="overview">
      <p className="text-sm text-muted-foreground p-4">这是概览内容。</p>
    </TabsContent>
    <TabsContent value="analytics">
      <p className="text-sm text-muted-foreground p-4">这是分析内容。</p>
    </TabsContent>
    <TabsContent value="settings">
      <p className="text-sm text-muted-foreground p-4">这是设置内容。</p>
    </TabsContent>
  </Tabs>
);
```

### 线条样式

页面级导航推荐使用线条变体。

```tsx
import {
  Tabs, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const Demo = () => (
  <Tabs defaultValue="overview">
    <TabsList variant="line">
      <TabsTrigger value="overview">概览</TabsTrigger>
      <TabsTrigger value="analytics">分析</TabsTrigger>
      <TabsTrigger value="reports">报表</TabsTrigger>
    </TabsList>
  </Tabs>
);
```

### 配合 Card 使用

每个 Tab 内容放在 Card 中。

```tsx
import {
  Card, CardContent, CardDescription,
  CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const Demo = () => (
  <Tabs defaultValue="account" className="w-[400px]">
    <TabsList>
      <TabsTrigger value="account">账户</TabsTrigger>
      <TabsTrigger value="security">安全</TabsTrigger>
    </TabsList>
    <TabsContent value="account">
      <Card>
        <CardHeader>
          <CardTitle>账户设置</CardTitle>
          <CardDescription>管理你的账户信息。</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          在这里修改你的用户名和头像。
        </CardContent>
      </Card>
    </TabsContent>
    <TabsContent value="security">
      <Card>
        <CardHeader>
          <CardTitle>安全设置</CardTitle>
          <CardDescription>管理你的密码和两步验证。</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          定期更换密码以保障账户安全。
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
);
```

### 垂直布局

```tsx
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";

const Demo = () => (
  <Tabs defaultValue="account" orientation="vertical" className="flex gap-4">
    <TabsList>
      <TabsTrigger value="account">账户</TabsTrigger>
      <TabsTrigger value="password">密码</TabsTrigger>
      <TabsTrigger value="notifications">通知</TabsTrigger>
    </TabsList>
    <div className="flex-1">
      <TabsContent value="account">账户设置内容</TabsContent>
      <TabsContent value="password">密码设置内容</TabsContent>
      <TabsContent value="notifications">通知设置内容</TabsContent>
    </div>
  </Tabs>
);
```

### 带图标

```tsx
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppWindowIcon, CodeIcon } from "lucide-react";

const Demo = () => (
  <Tabs defaultValue="preview">
    <TabsList>
      <TabsTrigger value="preview">
        <AppWindowIcon />
        预览
      </TabsTrigger>
      <TabsTrigger value="code">
        <CodeIcon />
        代码
      </TabsTrigger>
    </TabsList>
  </Tabs>
);
```

---

## Behavior

- **切换**：点击 TabsTrigger 切换对应 TabsContent，非活跃面板不渲染。
- **键盘**：左右箭头（水平模式）或上下箭头（垂直模式）在 Tab 间导航，Enter/Space 激活。
- **disabled**：禁用的 Tab 不可点击、不可通过键盘聚焦。
- **默认激活**：`defaultValue` 指定初始激活的 Tab，无该值时无面板展示。

---

## When to use

**适用**：

- 同一区域内切换展示不同分类的内容（设置页、详情页）。
- Dashboard 中不同维度的数据展示。
- 代码/预览切换。

**不适用**：

- **步骤流程** → 用 `Stepper`（步骤条）。
- **全局导航** → 用 `NavigationMenu` 或侧边栏。
- **折叠展开** → 用 `Accordion`。

---

## Accessibility

- **键盘**：Tab 聚焦到 TabsList，箭头键在 Tab 间导航，Enter/Space 激活。
- **ARIA**：TabsList `role="tablist"`，TabsTrigger `role="tab"` + `aria-selected`，TabsContent `role="tabpanel"` + `aria-labelledby`。

---

## Related

- `Card`：Tabs 内容常放在 Card 中展示。
- `Accordion`：需要同时展示多个区域时用 Accordion，互斥展示用 Tabs。
- `NavigationMenu`：全局导航用 NavigationMenu，区域内切换用 Tabs。
