---
name: Tooltip
import: "import { Tooltip } from '@my-design/react';"
category: display
status: beta
since: 1.3.0
aliases: [提示, 气泡提示, 文字提示]
keywords: [提示, hover, 悬浮, 气泡, tip, popover, 说明]
figma: "figma://file/xxx/tooltip"
tokens: [--md-color-tooltip-bg, --md-color-tooltip-text, --md-radius-sm, --md-shadow-sm]
source: "src/components/Tooltip/index.tsx"
---

# Tooltip

文字提示气泡，鼠标悬浮或聚焦时显示简短的说明文字。

---

## 核心规则（AI 生成时必读）

- **内容简短**：Tooltip 内容不超过两行文字，长内容请用 `Popover`。
- **不放交互元素**：Tooltip 内禁止放按钮、链接等可交互元素，需要交互用 `Popover` 或 `Popconfirm`。
- **children 必须可聚焦**：包裹的子元素必须能接收鼠标/焦点事件（原生元素或 forwardRef 组件）。
- **disabled 元素**：disabled 的按钮无法触发 hover，需在外层包一个 `<span>` 再套 Tooltip。
- **触发方式一致**：同一页面内 Tooltip 的触发方式应保持一致（统一 hover 或统一 click）。
- **placement 就近原则**：默认 `top`，靠近边缘时选择不会被截断的方向。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| content | `ReactNode` | ✅ | | 提示内容 |
| placement | `'top' \| 'bottom' \| 'left' \| 'right' \| 'topLeft' \| 'topRight' \| 'bottomLeft' \| 'bottomRight'` | | `'top'` | 弹出位置 |
| trigger | `'hover' \| 'click' \| 'focus'` | | `'hover'` | 触发方式 |
| visible | `boolean` | | | 受控显示状态 |
| defaultVisible | `boolean` | | `false` | 默认显示状态 |
| disabled | `boolean` | | `false` | 是否禁用 |
| mouseEnterDelay | `number` | | `100` | 鼠标移入后延迟显示（ms） |
| mouseLeaveDelay | `number` | | `100` | 鼠标移出后延迟隐藏（ms） |
| color | `string` | | | 自定义背景色 |
| overlayClassName | `string` | | | 浮层自定义类名 |
| overlayStyle | `CSSProperties` | | | 浮层自定义样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onVisibleChange | `(visible: boolean) => void` | 显示/隐藏状态变化时触发 |

---

## Examples

### 基础用法

鼠标悬浮显示提示。

```tsx
import { Tooltip, Button } from '@my-design/react';

const Demo = () => (
  <Tooltip content="这是提示文字">
    <Button>悬浮查看</Button>
  </Tooltip>
);
```

### 不同方向

通过 `placement` 控制弹出方向。

```tsx
import { Tooltip, Button } from '@my-design/react';

const Demo = () => (
  <div style={{ display: 'flex', gap: 'var(--md-spacing-sm)' }}>
    <Tooltip content="上方提示" placement="top">
      <Button>上</Button>
    </Tooltip>
    <Tooltip content="下方提示" placement="bottom">
      <Button>下</Button>
    </Tooltip>
    <Tooltip content="左侧提示" placement="left">
      <Button>左</Button>
    </Tooltip>
    <Tooltip content="右侧提示" placement="right">
      <Button>右</Button>
    </Tooltip>
  </div>
);
```

### 点击触发

适用于移动端或需要手动控制的场景。

```tsx
import { Tooltip, Button } from '@my-design/react';

const Demo = () => (
  <Tooltip content="点击显示的提示" trigger="click">
    <Button>点击查看</Button>
  </Tooltip>
);
```

### 为 disabled 元素添加提示

disabled 元素无法触发 hover，需包裹 `<span>`。

```tsx
import { Tooltip, Button } from '@my-design/react';

const Demo = () => (
  <Tooltip content="按钮已禁用，权限不足">
    <span style={{ display: 'inline-block' }}>
      <Button disabled>无权限</Button>
    </span>
  </Tooltip>
);
```

---

## Behavior

- **hover 触发**：鼠标移入后延迟 `mouseEnterDelay` 毫秒显示，移出后延迟 `mouseLeaveDelay` 毫秒隐藏。
- **click 触发**：点击切换显示/隐藏，点击外部不自动关闭（需手动控制或再次点击）。
- **focus 触发**：聚焦显示，失焦隐藏，适用于表单输入提示。
- **disabled**：`disabled={true}` 时不响应任何触发事件。
- **延迟**：延迟机制防止鼠标快速划过时频繁闪烁。

---

## When to use

**适用**：

- 图标按钮的操作说明（如搜索、关闭、设置图标）。
- 表格列标题的补充解释。
- 被截断文本的完整内容展示。

**不适用**：

- **需要交互的内容** → 用 `Popover`（可放按钮、链接）。
- **操作确认** → 用 `Popconfirm`。
- **大段说明文字** → 用 `Popover` 或页面内嵌说明。

---

## Accessibility

- **键盘**：Tab 聚焦触发元素时显示 Tooltip（`trigger="focus"` 或 hover 模式下也响应 focus）。
- **焦点**：Tooltip 不抢夺焦点，焦点始终在触发元素上。
- **ARIA**：浮层设置 `role="tooltip"`，触发元素通过 `aria-describedby` 关联。
