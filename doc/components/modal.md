---
name: Modal
import: "import { Modal } from '@my-design/react';"
category: feedback
status: stable
since: 1.2.0
aliases: [Dialog, 弹窗, 对话框]
keywords: [确认, 弹出, 遮罩, 模态, confirm, dialog, popup]
figma: "figma://file/xxx/modal"
tokens: [--md-color-mask, --md-radius-md, --md-spacing-lg, --md-shadow-lg]
source: "src/components/Modal/index.tsx"
---

# Modal

模态对话框，在不离开当前页面的情况下，弹出浮层承载操作或信息确认。

---

## 核心规则（AI 生成时必读）

- **必须有明确出口**：每个 Modal 必须至少有一种关闭方式（关闭按钮/取消按钮/ESC）。
- **标题必填**：Modal 必须提供 `title`，用于无障碍标识（`aria-labelledby`）。
- **禁止嵌套**：禁止 Modal 内再打开 Modal，如需多步操作请用步骤条或抽屉。
- **异步确认**：确认按钮触发异步操作时，必须使用 `confirmLoading` 防止重复提交。
- **慎用 destroyOnClose**：仅在表单重置等场景使用，频繁开关的 Modal 不要销毁以避免性能损耗。
- **footer=null**：自定义底部内容时设置 `footer={null}`，不要用空字符串。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| visible | `boolean` | ✅ | `false` | 是否显示 Modal |
| title | `ReactNode` | ✅ | | 标题，用于 aria-labelledby |
| width | `number \| string` | | `520` | 宽度 |
| centered | `boolean` | | `false` | 是否垂直居中 |
| closable | `boolean` | | `true` | 是否显示右上角关闭按钮 |
| maskClosable | `boolean` | | `true` | 点击遮罩是否可关闭 |
| keyboard | `boolean` | | `true` | 是否支持 ESC 关闭 |
| confirmLoading | `boolean` | | `false` | 确认按钮加载状态 |
| okText | `string` | | `'确定'` | 确认按钮文字 |
| cancelText | `string` | | `'取消'` | 取消按钮文字 |
| okType | `'primary' \| 'secondary' \| 'danger'` | | `'primary'` | 确认按钮类型 |
| footer | `ReactNode \| null` | | 默认按钮组 | 底部内容，null 隐藏 |
| destroyOnClose | `boolean` | | `false` | 关闭时是否销毁子组件 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onOk | `(e: MouseEvent) => void` | 点击确认按钮时触发 |
| onCancel | `(e: MouseEvent \| KeyboardEvent) => void` | 点击取消/关闭/遮罩/ESC 时触发 |
| afterClose | `() => void` | Modal 完全关闭后的回调 |

---

## Examples

### 基础用法

最简单的 Modal，点击按钮弹出。

```tsx
import { useState } from 'react';
import { Modal, Button } from '@my-design/react';

const Demo = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button variant="primary" onClick={() => setVisible(true)}>
        打开弹窗
      </Button>
      <Modal
        visible={visible}
        title="基础弹窗"
        onOk={() => setVisible(false)}
        onCancel={() => setVisible(false)}
      >
        <p>这是一段内容。</p>
      </Modal>
    </>
  );
};
```

### 异步确认

确认按钮触发异步操作，用 `confirmLoading` 防止重复提交。

```tsx
import { useState } from 'react';
import { Modal, Button } from '@my-design/react';

const Demo = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    setLoading(true);
    await saveData();
    setLoading(false);
    setVisible(false);
  };

  return (
    <Modal
      visible={visible}
      title="提交确认"
      confirmLoading={loading}
      onOk={handleOk}
      onCancel={() => setVisible(false)}
    >
      <p>确定要提交吗？</p>
    </Modal>
  );
};
```

### 危险操作确认

删除等不可逆操作，用 `okType="danger"` 突出警示。

```tsx
import { Modal } from '@my-design/react';

const Demo = ({ visible, onClose, onDelete }) => (
  <Modal
    visible={visible}
    title="删除确认"
    okText="删除"
    okType="danger"
    onOk={onDelete}
    onCancel={onClose}
  >
    <p>此操作不可恢复，确定要删除吗？</p>
  </Modal>
);
```

### 自定义底部

`footer={null}` 隐藏默认按钮，自行渲染底部。

```tsx
import { Modal, Button } from '@my-design/react';

const Demo = ({ visible, onClose }) => (
  <Modal visible={visible} title="自定义底部" footer={null} onCancel={onClose}>
    <p>自定义内容区域</p>
    <div style={{ textAlign: 'right', marginTop: 'var(--md-spacing-lg)' }}>
      <Button variant="primary" onClick={onClose}>我知道了</Button>
    </div>
  </Modal>
);
```

---

## Behavior

- **打开**：自动聚焦到 Modal 内第一个可聚焦元素，body 禁止滚动。
- **关闭**：点击遮罩（`maskClosable`）、按 ESC（`keyboard`）、点击关闭按钮均可关闭。
- **焦点陷阱**：Tab 循环限制在 Modal 内部，不会跳到背后的页面元素。
- **confirmLoading**：确认按钮显示加载态，禁止点击，防止重复提交。
- **destroyOnClose**：关闭时销毁子组件 DOM，再次打开重新渲染。
- **键盘**：ESC 关闭（可通过 `keyboard={false}` 禁用），Tab 在 Modal 内循环。

---

## When to use

**适用**：

- 需要用户确认的操作（删除、提交、退出编辑）。
- 在当前页面上下文中展示少量信息或表单。
- 需要阻断用户操作流的重要提示。

**不适用**：

- **大量内容/复杂表单** → 用 `Drawer` 抽屉组件。
- **轻量提示** → 用 `Tooltip` 或 `Popconfirm`。
- **全局通知** → 用 `Message` 或 `Notification`。

---

## Accessibility

- **键盘**：ESC 关闭，Tab 在 Modal 内循环聚焦。
- **焦点**：打开时自动聚焦首个可聚焦元素，关闭后焦点返回触发元素。
- **ARIA**：`role="dialog"`、`aria-modal="true"`、`aria-labelledby` 指向标题。
