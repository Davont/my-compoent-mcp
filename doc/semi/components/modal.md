---
name: Modal
import: "import { Modal } from '@douyinfe/semi-ui';"
category: show
status: stable
since: 0.1.0
aliases: [对话框, Dialog, 弹窗]
keywords: [modal, dialog, popup, overlay, confirm, alert, 模态, 对话框, 弹窗]
tokens: [--semi-color-bg-0, --semi-shadow-elevated, --semi-border-radius-medium]
source: packages/semi-ui/modal/index.tsx
---

# Modal

模态对话框，在不离开当前页面的情况下向用户展示信息、收集输入或请求确认。

---

## 核心规则（AI 生成时必读）

- **统一导入**：必须 `import { Modal } from '@douyinfe/semi-ui'`
- **受控模式**：必须使用 `visible` + `onCancel` 受控模式，禁止非受控用法
- **隐藏 footer 的正确方式**：不需要底部按钮时设置 `footer={null}`，禁止用 CSS 隐藏
- **确认操作用静态方法**：简单确认场景使用 `Modal.confirm()`，无需自行维护 visible 状态
- **异步提交**：异步操作用 `confirmLoading` 控制确认按钮的加载状态，避免用户重复点击
- **弹窗内表单重置**：弹窗内包含表单时，需在 `afterClose` 回调中重置表单状态，避免再次打开时残留上次数据

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| visible | `boolean` | ✅ | `false` | 是否显示对话框 |
| title | `ReactNode` | | | 标题 |
| footer | `ReactNode \| null` | | 默认确认+取消按钮 | 底部内容，传 null 隐藏 |
| mask | `boolean` | | `true` | 是否显示遮罩层 |
| maskClosable | `boolean` | | `true` | 点击遮罩层是否关闭 |
| closable | `boolean` | | `true` | 是否显示右上角关闭按钮 |
| centered | `boolean` | | `false` | 是否垂直居中 |
| width | `number \| string` | | `520` | 对话框宽度 |
| size | `'small' \| 'medium' \| 'large' \| 'full-width'` | | `'small'` | 预设尺寸 |
| okText | `string` | | `'确定'` | 确认按钮文字 |
| cancelText | `string` | | `'取消'` | 取消按钮文字 |
| okType | `'primary' \| 'secondary' \| 'tertiary' \| 'warning' \| 'danger'` | | `'primary'` | 确认按钮类型 |
| confirmLoading | `boolean` | | `false` | 确认按钮是否显示加载状态 |
| keepDOM | `boolean` | | `false` | 隐藏时是否保留 DOM |
| lazyRender | `boolean` | | `true` | 是否首次 visible 时才渲染内容 |
| getPopupContainer | `() => HTMLElement` | | `() => document.body` | 指定挂载节点 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 对话框最外层样式 |
| bodyStyle | `CSSProperties` | | | 对话框内容区样式 |
| maskStyle | `CSSProperties` | | | 遮罩层样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onOk | `(e: MouseEvent) => void \| Promise` | 点击确认按钮时触发 |
| onCancel | `(e: MouseEvent) => void` | 点击取消按钮、关闭图标或遮罩层时触发 |
| afterClose | `() => void` | 关闭动画结束后触发，适合重置内部状态 |

---

## Examples

### 基础用法

最简模态框，通过 `visible` 和 `onCancel` 控制显隐。

```tsx
import { useState } from 'react';
import { Modal, Button } from '@douyinfe/semi-ui';

const App = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button onClick={() => setVisible(true)}>打开弹窗</Button>
      <Modal
        title="基础弹窗"
        visible={visible}
        onOk={() => setVisible(false)}
        onCancel={() => setVisible(false)}
      >
        <p>这是弹窗内容。</p>
      </Modal>
    </>
  );
};
```

### 确认对话框 — 静态方法

使用 `Modal.confirm()` 快速创建确认对话框，无需管理状态。

```tsx
import { Modal, Button } from '@douyinfe/semi-ui';

const App = () => {
  const handleDelete = () => {
    Modal.confirm({
      title: '确认删除',
      content: '删除后不可恢复，确定要继续吗？',
      okType: 'danger',
      onOk: () => {
        console.log('已删除');
      },
    });
  };

  return <Button type="danger" onClick={handleDelete}>删除</Button>;
};
```

### 自定义 footer

通过 `footer` 自定义底部按钮，或传 `null` 完全隐藏。

```tsx
import { useState } from 'react';
import { Modal, Button } from '@douyinfe/semi-ui';

const App = () => {
  const [visible, setVisible] = useState(false);

  return (
    <>
      <Button onClick={() => setVisible(true)}>自定义底部</Button>
      <Modal
        title="自定义 Footer"
        visible={visible}
        onCancel={() => setVisible(false)}
        footer={
          <div style={{ textAlign: 'right' }}>
            <Button style={{ marginRight: 8 }} onClick={() => setVisible(false)}>
              稍后再说
            </Button>
            <Button theme="solid" type="primary" onClick={() => setVisible(false)}>
              我知道了
            </Button>
          </div>
        }
      >
        <p>自定义底部按钮布局。</p>
      </Modal>
    </>
  );
};
```

### 异步提交

使用 `confirmLoading` 在异步操作期间显示加载状态，防止重复提交。

```tsx
import { useState } from 'react';
import { Modal, Button } from '@douyinfe/semi-ui';

const App = () => {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleOk = async () => {
    setLoading(true);
    try {
      await submitData();
      setVisible(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setVisible(true)}>提交表单</Button>
      <Modal
        title="提交确认"
        visible={visible}
        confirmLoading={loading}
        onOk={handleOk}
        onCancel={() => setVisible(false)}
      >
        <p>确认提交当前数据？</p>
      </Modal>
    </>
  );
};
```

---

## Behavior

- **打开/关闭**：由 `visible` 受控，打开时渲染遮罩层 + 对话框，关闭时执行退出动画后触发 `afterClose`
- **遮罩关闭**：`maskClosable` 为 true 时，点击遮罩层触发 `onCancel`
- **关闭按钮**：`closable` 为 true 时右上角显示关闭图标，点击触发 `onCancel`
- **懒渲染**：`lazyRender` 为 true 时，首次 `visible=true` 之前不渲染 DOM
- **保留 DOM**：`keepDOM` 为 true 时关闭后不销毁内部 DOM，保留组件状态
- **静态方法**：`Modal.info()` / `Modal.success()` / `Modal.error()` / `Modal.warning()` / `Modal.confirm()` 以命令式调用，返回 `{ destroy }` 对象
- **键盘**：Esc 键触发 `onCancel` 关闭对话框

---

## When to use

**适用**：

- 需要用户确认后才能继续的操作（删除、提交等）
- 不离开当前页面的轻量表单填写
- 展示详细信息或操作结果的反馈

**不适用**：

- 简单的操作结果通知 → 用 `Toast` 或 `Notification`
- 非阻断式信息提示 → 用 `Banner`
- 仅需简单二次确认 → 用 `Popconfirm`（气泡确认框，不遮挡页面）
- 复杂的多步骤流程 → 用独立页面或 `SideSheet`

---

## Accessibility

- **键盘**：Esc 关闭弹窗，Tab 在弹窗内循环切换焦点（焦点陷阱）
- **焦点**：弹窗打开时焦点自动移入弹窗内第一个可聚焦元素，关闭后焦点回到触发元素
- **ARIA**：对话框容器具有 `role="dialog"`、`aria-modal="true"`、`aria-labelledby` 关联标题

---

## Related

- `Popconfirm`：轻量气泡确认框，不需要遮罩层的简单确认场景
- `SideSheet`：侧边抽屉，适合承载更多内容或多步操作
- `Toast`：轻量操作反馈，无需用户确认
- `Notification`：系统通知消息，非模态
