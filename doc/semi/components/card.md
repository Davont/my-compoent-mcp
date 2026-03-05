---
name: Card
import: "import { Card } from '@douyinfe/semi-ui';"
category: show
status: stable
since: 1.21.0
aliases: [卡片, CardPanel]
keywords: [card, container, panel, content, 卡片, 容器, 面板]
tokens: [--semi-color-bg-0, --semi-shadow-elevated, --semi-border-radius-medium]
source: packages/semi-ui/card/index.tsx
---

# Card

承载单个主题内容的容器组件，支持标题、封面、结构化内容（Card.Meta）、操作按钮、骨架屏加载等能力，适用于信息展示、列表卡片、仪表盘面板等场景。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Card } from '@douyinfe/semi-ui'`，Card.Meta 和 CardGroup 同源导入，禁止从子路径导入。
- **标题使用**：卡片标题必须通过 `title` prop 传入，禁止在 children 中自行写 `<h3>` 等标签替代。
- **结构化内容**：头像 + 标题 + 描述的组合场景必须使用 `Card.Meta`，禁止自行拼装 DOM 结构。
- **操作按钮**：底部操作统一放入 `actions` 数组，禁止将按钮直接写在 children 内充当操作区。
- **加载状态**：数据未就绪时必须使用 `loading` prop，组件自动渲染骨架屏，禁止自行实现 Skeleton。
- **卡片分组**：多张卡片并列展示时使用 `CardGroup` 统一间距和布局，禁止手动设置 margin/gap。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| title | `ReactNode` | | | 卡片标题，显示在 header 区域 |
| headerLine | `boolean` | | `true` | 是否显示 header 与 body 之间的分割线 |
| shadows | `'hover' \| 'always'` | | | 阴影效果。`hover` 鼠标悬浮时显示，`always` 始终显示 |
| bordered | `boolean` | | `true` | 是否显示边框 |
| loading | `boolean` | | `false` | 加载状态，为 `true` 时自动显示骨架屏占位 |
| cover | `ReactNode` | | | 封面内容（通常为图片），展示在 header 上方 |
| actions | `ReactNode[]` | | | 底部操作区按钮数组 |
| headerExtraContent | `ReactNode` | | | header 右侧额外内容（如更多操作按钮） |
| headerStyle | `CSSProperties` | | | header 区域自定义样式 |
| bodyStyle | `CSSProperties` | | | body 区域自定义样式 |
| footerStyle | `CSSProperties` | | | footer 区域自定义样式 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

### Card.Meta

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| title | `ReactNode` | | | 结构化内容标题 |
| description | `ReactNode` | | | 结构化内容描述文字 |
| avatar | `ReactNode` | | | 头像或图标，通常传入 `<Avatar>` 组件 |

### CardGroup

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| spacing | `number` | | `16` | 卡片之间的间距（px） |
| type | `'grid'` | | | 布局类型，设为 `'grid'` 启用网格布局 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onHeaderClick | `(e: MouseEvent) => void` | 点击 header 区域时触发 |

---

## Examples

### 基础用法

使用 `title` 设置标题，children 放置正文内容。

```tsx
import { Card } from '@douyinfe/semi-ui';

const Demo = () => (
  <Card title="Semi Design" style={{ maxWidth: 360 }}>
    Semi Design 是由抖音前端团队和 UED 团队设计、开发并维护的设计系统。
  </Card>
);
```

### 带封面图片

通过 `cover` 放置封面图，配合 `headerExtraContent` 在标题右侧添加操作。

```tsx
import { Card, Button } from '@douyinfe/semi-ui';
import { IconMore } from '@douyinfe/semi-icons';

const Demo = () => (
  <Card
    style={{ maxWidth: 360 }}
    cover={
      <img
        alt="card cover"
        src="https://lf3-static.bytednsdoc.com/obj/eden-cn/ptlz_zlp/ljhwZthlaukjlkulzlp/root-web-sites/card-cover.png"
        style={{ width: '100%' }}
      />
    }
    title="Semi Design"
    headerExtraContent={<Button theme="borderless" icon={<IconMore />} aria-label="更多" />}
  >
    Semi Design 是由抖音前端团队和 UED 团队设计、开发并维护的设计系统。
  </Card>
);
```

### Card.Meta 结构化内容

头像 + 标题 + 描述的标准组合场景使用 Card.Meta。

```tsx
import { Card, Avatar } from '@douyinfe/semi-ui';

const { Meta } = Card;

const Demo = () => (
  <Card style={{ maxWidth: 360 }}>
    <Meta
      title="Semi Design"
      description="一套企业级设计系统"
      avatar={
        <Avatar size="default" style={{ backgroundColor: '#87d068' }}>
          SD
        </Avatar>
      }
    />
  </Card>
);
```

### 加载骨架屏

数据加载中时设置 `loading` 自动展示骨架屏占位。

```tsx
import { useState } from 'react';
import { Card, Switch } from '@douyinfe/semi-ui';

const Demo = () => {
  const [loading, setLoading] = useState(true);

  return (
    <div>
      <Switch checked={loading} onChange={setLoading} style={{ marginBottom: 16 }} />
      <Card title="Semi Design" loading={loading} style={{ maxWidth: 360 }}>
        Semi Design 是由抖音前端团队和 UED 团队设计、开发并维护的设计系统。
      </Card>
    </div>
  );
};
```

### CardGroup 卡片组

使用 CardGroup 将多张卡片编组，统一间距。设置 `type='grid'` 启用网格布局。

```tsx
import { Card, CardGroup } from '@douyinfe/semi-ui';

const Demo = () => (
  <CardGroup spacing={12} type="grid">
    {[1, 2, 3, 4, 5, 6].map((item) => (
      <Card
        key={item}
        shadows="hover"
        title={`卡片标题 ${item}`}
        headerLine={false}
        style={{ width: 260 }}
      >
        卡片内容 {item}
      </Card>
    ))}
  </CardGroup>
);
```

---

## Behavior

- **shadows**：
  - `shadows='hover'` 时默认无阴影，鼠标悬浮时显示 `--semi-shadow-elevated` 阴影，带过渡动画。
  - `shadows='always'` 时始终显示阴影。
  - 未设置时无阴影效果。
- **loading**：
  - 设置 `loading={true}` 时，body 区域替换为 Skeleton 骨架屏占位。
  - header 和 footer 正常显示，仅 body 区域被替换。
  - `loading` 变为 `false` 后立即切换为真实内容，无额外动画。
- **bordered**：
  - 默认 `bordered={true}` 显示 1px 边框。
  - 与 `shadows` 配合时，可设 `bordered={false}` 仅靠阴影区分层级。
- **headerLine**：
  - 默认 `true` 显示分割线。无 `title` 时 header 不渲染，分割线也不显示。
- **actions**：
  - 数组中每个元素等间距排列在 footer 区域。
  - footer 仅在 `actions` 非空时渲染。

---

## When to use

**适用**：

- 信息卡片展示，如产品列表、用户资料、数据概览。
- 仪表盘中的面板容器，承载图表或统计数据。
- 图文混排内容，带封面图片的文章/商品卡片。
- 需要结构化展示（头像 + 标题 + 描述）的场景。

**不适用**：

- **纯列表数据** → 用 `Table` 或 `List`。
- **弹出层容器** → 用 `Modal` 或 `SideSheet`。
- **可折叠面板** → 用 `Collapsible`。
- **仅需分割区域、无标题/操作** → 用 `div` 配合 CSS 即可，不必引入 Card。

---

## Accessibility

- **键盘**：Card 本身非交互元素，不在 Tab 序列中。内部交互元素（按钮、链接）正常参与 Tab 序列。
- **焦点**：`actions` 中的按钮支持键盘聚焦和 Enter/Space 激活。
- **ARIA**：
  - 如果整张卡片可点击，外层应添加 `role="button"` 和 `tabIndex={0}`。
  - 封面图片必须提供 `alt` 属性。
  - `headerExtraContent` 中的图标按钮需要 `aria-label`。

---

## Related

- `List`：当卡片内容为纯文本列表项时，优先使用 List。
- `Table`：结构化的多列数据展示使用 Table 而非多个 Card。
- `Collapse`：需要展开/折叠能力时使用 Collapse 替代 Card。
- `Avatar`：Card.Meta 中的头像通常搭配 Avatar 组件。
- `Skeleton`：Card 内置 loading 骨架屏基于 Skeleton 实现，无需单独引入。
- `Modal`：弹出式内容容器，与 Card 的内嵌式定位不同。
