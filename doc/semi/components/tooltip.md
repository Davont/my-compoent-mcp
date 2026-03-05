---
name: Tooltip
import: "import { Tooltip } from '@douyinfe/semi-ui';"
category: show
status: stable
since: 0.1.0
aliases: [工具提示, Tip]
keywords: [tooltip, tip, hover, popup, 提示, 悬浮提示, 文字提示]
tokens: [--semi-color-bg-4, --semi-color-text-0, --semi-border-radius-small]
source: packages/semi-ui/tooltip/index.tsx
---

# Tooltip

鼠标悬停时显示的轻量文字提示气泡，用于解释按钮用途、展示完整文本、补充说明等场景，支持 12 个方位和多种触发方式。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Tooltip } from '@douyinfe/semi-ui'`，禁止从子路径导入。
- **单子元素**：children 必须是单个可接受 ref 的 React 元素，不能是纯文本或 Fragment。如需包裹多个元素，外层加一个 `<span>`。
- **内容区分**：纯文字提示用 Tooltip，带链接/按钮/富文本的交互内容用 `Popover`。
- **默认定位**：position 默认 `'top'`，组件会自动检测边界并翻转位置避免溢出，一般无需手动指定。
- **禁用元素**：disabled 的元素（如 `<Button disabled />`）无法触发 Tooltip，必须在外层包一个 `<span>` 作为触发器。
- **受控模式**：需要手动控制显隐时使用 `visible` + `trigger="custom"` + `onVisibleChange` 组合。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| content | `ReactNode` | ✅ | | 气泡内展示的内容 |
| position | `'top' \| 'topLeft' \| 'topRight' \| 'left' \| 'leftTop' \| 'leftBottom' \| 'right' \| 'rightTop' \| 'rightBottom' \| 'bottom' \| 'bottomLeft' \| 'bottomRight'` | | `'top'` | 气泡弹出的方位 |
| trigger | `'hover' \| 'focus' \| 'click' \| 'custom'` | | `'hover'` | 触发方式，`custom` 时完全由 `visible` 控制 |
| visible | `boolean` | | | 受控模式下的显隐状态，配合 `trigger="custom"` 使用 |
| showArrow | `boolean` | | `true` | 是否显示指向触发元素的箭头 |
| arrowPointAtCenter | `boolean` | | `false` | 箭头是否指向触发元素中心 |
| spacing | `number` | | `4` | 气泡与触发元素之间的间距（px） |
| mouseEnterDelay | `number` | | `50` | 鼠标移入后延迟显示的时间（ms） |
| mouseLeaveDelay | `number` | | `50` | 鼠标移出后延迟隐藏的时间（ms） |
| getPopupContainer | `() => HTMLElement` | | `() => document.body` | 指定气泡挂载的 DOM 节点 |
| wrapperClassName | `string` | | | 包裹触发元素的 span 的类名 |
| zIndex | `number` | | `1060` | 气泡层级 |
| className | `string` | | | 气泡容器的自定义类名 |
| style | `CSSProperties` | | | 气泡容器的自定义内联样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onVisibleChange | `(visible: boolean) => void` | 气泡显隐状态变化时触发 |
| onClickOutSide | `(e: MouseEvent) => void` | 点击气泡外部区域时触发 |

---

## Examples

### 基础用法

鼠标悬停在按钮上时显示文字提示。

```tsx
import { Tooltip, Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <Tooltip content="保存当前编辑内容">
    <Button>保存</Button>
  </Tooltip>
);
```

### 12 个方位

通过 `position` 控制气泡弹出方向。

```tsx
import { Tooltip, Tag } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 60 }}>
    <Tooltip content="top" position="top"><Tag>top</Tag></Tooltip>
    <Tooltip content="topLeft" position="topLeft"><Tag>topLeft</Tag></Tooltip>
    <Tooltip content="topRight" position="topRight"><Tag>topRight</Tag></Tooltip>
    <Tooltip content="left" position="left"><Tag>left</Tag></Tooltip>
    <Tooltip content="leftTop" position="leftTop"><Tag>leftTop</Tag></Tooltip>
    <Tooltip content="leftBottom" position="leftBottom"><Tag>leftBottom</Tag></Tooltip>
    <Tooltip content="right" position="right"><Tag>right</Tag></Tooltip>
    <Tooltip content="rightTop" position="rightTop"><Tag>rightTop</Tag></Tooltip>
    <Tooltip content="rightBottom" position="rightBottom"><Tag>rightBottom</Tag></Tooltip>
    <Tooltip content="bottom" position="bottom"><Tag>bottom</Tag></Tooltip>
    <Tooltip content="bottomLeft" position="bottomLeft"><Tag>bottomLeft</Tag></Tooltip>
    <Tooltip content="bottomRight" position="bottomRight"><Tag>bottomRight</Tag></Tooltip>
  </div>
);
```

### 触发方式

支持 hover、click、focus 三种内置触发方式。

```tsx
import { Tooltip, Button, Input } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <Tooltip content="悬停触发" trigger="hover">
      <Button>Hover</Button>
    </Tooltip>
    <Tooltip content="点击触发" trigger="click">
      <Button>Click</Button>
    </Tooltip>
    <Tooltip content="聚焦触发" trigger="focus">
      <Input placeholder="Focus 触发" style={{ width: 160 }} />
    </Tooltip>
  </div>
);
```

### 受控模式

使用 `visible` + `trigger="custom"` 完全控制显隐，适用于需要根据业务逻辑控制提示的场景。

```tsx
import { useState } from 'react';
import { Tooltip, Button } from '@douyinfe/semi-ui';

const Demo = () => {
  const [visible, setVisible] = useState(false);

  return (
    <Tooltip
      content="手动控制的提示"
      trigger="custom"
      visible={visible}
      onClickOutSide={() => setVisible(false)}
    >
      <Button onClick={() => setVisible(!visible)}>
        {visible ? '隐藏' : '显示'}提示
      </Button>
    </Tooltip>
  );
};
```

---

## Behavior

- **自动翻转**：当气泡在指定 position 方向空间不足时，自动翻转到对侧显示。
- **延迟显隐**：hover 触发时默认 50ms 显示/隐藏延迟，避免鼠标快速划过时频繁闪烁。
- **挂载位置**：默认挂载到 `document.body`，避免被父级 `overflow: hidden` 截断。可通过 `getPopupContainer` 自定义。
- **动画**：弹出/收起带有 fade + scale 过渡动画。
- **层级**：默认 `z-index: 1060`，高于一般浮层，可通过 `zIndex` 自定义。
- **键盘**：`trigger="focus"` 时 Tab 聚焦到触发元素即显示，失去焦点即隐藏。

---

## When to use

**适用**：

- 图标按钮或截断文本需要补充说明。
- 表单字段旁的帮助提示。
- 表格单元格内容过长，悬停显示完整文本。

**不适用**：

- **包含交互内容**（链接/按钮） → 用 `Popover`。
- **需要用户确认** → 用 `Popconfirm`。
- **全局消息通知** → 用 `Toast` 或 `Notification`。
- **大段富文本说明** → 用 `Popover` 或独立的说明面板。

---

## Accessibility

- **键盘**：`trigger="focus"` 时支持 Tab 聚焦显示，Esc 关闭。
- **焦点**：气泡内容不可聚焦（纯文字提示），触发元素保持原有焦点行为。
- **ARIA**：触发元素自动添加 `aria-describedby` 指向气泡内容，屏幕阅读器可读取提示文本。

---

## Related

- `Popover`：内容更丰富的弹出卡片，支持标题和交互元素，Tooltip 仅适用于纯文字提示。
- `Popconfirm`：操作确认气泡，Tooltip 不应承载确认逻辑。
- `Toast`：全局即时反馈消息，与 Tooltip 的定点提示场景不同。
- `Typography`：文本截断 + Tooltip 自动提示完整内容的组合用法，Semi 的 Typography 内置了该能力。
