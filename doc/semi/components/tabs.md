---
name: Tabs
import: "import { Tabs, TabPane } from '@douyinfe/semi-ui';"
category: navigation
status: stable
since: 0.1.0
aliases: [标签栏, TabPanel]
keywords: [tabs, tab, panel, switch, navigation, 标签, 标签栏, 切换]
tokens: [--semi-color-primary, --semi-color-text-2, --semi-color-border]
source: packages/semi-ui/tabs/index.tsx
---

# Tabs

选项卡切换组件，用于在同一区域内切换显示不同内容面板，支持 line / card / button 三种样式及水平/垂直两种方向。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Tabs, TabPane } from '@douyinfe/semi-ui'`，Tabs 和 TabPane 缺一不可。
- **itemKey 唯一**：每个 TabPane 必须设置唯一的 `itemKey`，作为标签的标识符。
- **受控模式**：需要程序控制激活标签时，使用 `activeKey` + `onChange` 组合，禁止同时设置 `defaultActiveKey`。
- **懒渲染优化**：标签面板内容较重时建议设置 `lazyRender={true}`，仅在首次激活时才渲染该面板，优化首屏性能。
- **垂直标签**：垂直方向标签栏使用 `tabPosition="left"`，此时标签栏在左侧纵向排列。
- **样式选择**：`type="line"` 适用于内容区域切换，`type="card"` 适用于容器式标签页，`type="button"` 适用于紧凑的按钮式切换。

---

## Props

### Tabs

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| type | `'line' \| 'card' \| 'button'` | | `'line'` | 标签栏样式类型 |
| size | `'small' \| 'medium' \| 'large'` | | `'medium'` | 标签栏尺寸 |
| activeKey | `string` | | | 受控模式下当前激活的标签 itemKey |
| defaultActiveKey | `string` | | 第一个 TabPane 的 itemKey | 非受控模式下默认激活的标签 |
| tabPosition | `'top' \| 'left'` | | `'top'` | 标签栏位置，`left` 为垂直标签 |
| tabBarExtraContent | `ReactNode` | | | 标签栏右侧额外内容 |
| lazyRender | `boolean` | | `false` | 是否懒渲染面板内容，为 true 时仅在首次激活时渲染 |
| keepDOM | `boolean` | | `true` | 面板切走后是否保留 DOM，为 false 时切走即卸载 |
| collapsible | `boolean` | | `false` | 标签栏溢出时是否支持折叠 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

### TabPane

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| tab | `ReactNode` | ✅ | | 标签页标题 |
| itemKey | `string` | ✅ | | 唯一标识符，对应 activeKey |
| disabled | `boolean` | | `false` | 是否禁用该标签 |
| icon | `ReactNode` | | | 标签页标题前的图标 |
| closable | `boolean` | | `false` | 标签页是否可关闭（配合 type="card" 使用） |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(activeKey: string) => void` | 切换标签时触发，参数为新激活标签的 itemKey |
| onTabClick | `(key: string, e: MouseEvent) => void` | 点击标签时触发（无论是否切换） |
| onTabClose | `(tabKey: string) => void` | 关闭标签时触发（需配合 closable 使用） |

---

## Examples

### 基础用法

最简单的标签切换，默认 `type="line"`。

```tsx
import { Tabs, TabPane } from '@douyinfe/semi-ui';

const Demo = () => (
  <Tabs>
    <TabPane tab="文档" itemKey="doc">
      <p>文档内容</p>
    </TabPane>
    <TabPane tab="快速起步" itemKey="quick-start">
      <p>快速起步内容</p>
    </TabPane>
    <TabPane tab="帮助" itemKey="help">
      <p>帮助内容</p>
    </TabPane>
  </Tabs>
);
```

### 卡片样式

`type="card"` 适用于容器式标签页，视觉上有卡片边框包裹。

```tsx
import { Tabs, TabPane } from '@douyinfe/semi-ui';

const Demo = () => (
  <Tabs type="card">
    <TabPane tab="Tab 1" itemKey="1">
      <p>卡片标签内容 1</p>
    </TabPane>
    <TabPane tab="Tab 2" itemKey="2">
      <p>卡片标签内容 2</p>
    </TabPane>
    <TabPane tab="Tab 3" itemKey="3" disabled>
      <p>卡片标签内容 3</p>
    </TabPane>
  </Tabs>
);
```

### 按钮样式

`type="button"` 适用于紧凑的按钮式切换场景。

```tsx
import { Tabs, TabPane } from '@douyinfe/semi-ui';

const Demo = () => (
  <Tabs type="button" size="small">
    <TabPane tab="全部" itemKey="all">
      <p>全部内容</p>
    </TabPane>
    <TabPane tab="未读" itemKey="unread">
      <p>未读内容</p>
    </TabPane>
    <TabPane tab="已读" itemKey="read">
      <p>已读内容</p>
    </TabPane>
  </Tabs>
);
```

### 垂直标签

`tabPosition="left"` 使标签栏纵向排列在左侧。

```tsx
import { Tabs, TabPane } from '@douyinfe/semi-ui';

const Demo = () => (
  <Tabs tabPosition="left" style={{ height: 300 }}>
    <TabPane tab="个人信息" itemKey="profile">
      <p>个人信息设置</p>
    </TabPane>
    <TabPane tab="安全设置" itemKey="security">
      <p>安全相关设置</p>
    </TabPane>
    <TabPane tab="通知偏好" itemKey="notification">
      <p>通知偏好设置</p>
    </TabPane>
  </Tabs>
);
```

### 额外内容与受控模式

通过 `tabBarExtraContent` 在标签栏尾部放置操作按钮，结合 `activeKey` + `onChange` 实现受控。

```tsx
import { useState } from 'react';
import { Tabs, TabPane, Button } from '@douyinfe/semi-ui';
import { IconPlus } from '@douyinfe/semi-icons';

const Demo = () => {
  const [activeKey, setActiveKey] = useState('output');

  return (
    <Tabs
      activeKey={activeKey}
      onChange={setActiveKey}
      tabBarExtraContent={<Button icon={<IconPlus />} theme="borderless" />}
    >
      <TabPane tab="输出" itemKey="output">
        <p>输出面板</p>
      </TabPane>
      <TabPane tab="终端" itemKey="terminal">
        <p>终端面板</p>
      </TabPane>
      <TabPane tab="调试" itemKey="debug">
        <p>调试面板</p>
      </TabPane>
    </Tabs>
  );
};
```

---

## Behavior

- **切换动画**：`type="line"` 切换时底部指示条有滑动过渡动画；`type="button"` 有背景色切换过渡。
- **keepDOM**：默认 `keepDOM={true}`，面板切走后 DOM 仍保留但 `display: none`，保持内部组件状态。设为 `false` 时切走即卸载。
- **lazyRender**：为 `true` 时面板仅在首次激活时渲染，之后行为由 `keepDOM` 决定。
- **disabled**：禁用的 TabPane 标签置灰且不可点击，键盘导航时会跳过。
- **溢出处理**：标签数量超出容器宽度时，`collapsible` 可使溢出标签折叠到下拉菜单。
- **键盘**：方向键在标签间导航，Enter/Space 激活当前聚焦的标签。

---

## When to use

**适用**：

- 同一区域内展示多组平级内容，用户按需切换。
- 设置页面中的多个配置分类（如"个人信息/安全/通知"）。
- 内容面板需要保持各自的状态不丢失（keepDOM）。

**不适用**：

- **页面级导航** → 用 `Navigation` 组件。
- **步骤流程** → 用 `Steps` 组件引导用户按序操作。
- **仅两项二选一切换** → 用 `Switch` 或 `Radio` 更合适。

---

## Accessibility

- **键盘**：Tab 聚焦标签栏后，左右方向键（水平）或上下方向键（垂直）在标签间导航，Enter/Space 激活标签。
- **焦点**：当前聚焦标签有明显的 focus ring，与激活状态视觉区分。
- **ARIA**：标签栏使用 `role="tablist"`，各标签 `role="tab"`，面板 `role="tabpanel"`，`aria-selected` 标记当前激活标签。

---

## Related

- `Navigation`：页面级侧边或顶部导航，Tabs 仅用于内容区域内的面板切换。
- `Steps`：引导用户按步骤完成流程，Tabs 无步骤先后关系。
- `Collapse`：垂直方向的折叠面板，一次可展开多个；Tabs 同时只显示一个面板。
- `RadioGroup`：少量选项的切换，Tabs 更适合有独立内容面板的切换场景。
