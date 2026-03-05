---
name: Button
import: "import { Button } from '@douyinfe/semi-ui';"
category: basic
status: stable
since: 0.1.0
aliases: [Btn, 按钮]
keywords: [button, submit, action, click, loading, 按钮, 提交]
tokens: [--semi-color-primary, --semi-color-danger, --semi-border-radius-small]
source: packages/semi-ui/button/index.tsx
---

# Button

触发操作的基础交互组件，支持 type × theme 正交组合共 20 种样式变体，用于提交表单、确认操作、触发流程等场景。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Button } from '@douyinfe/semi-ui'`，禁止从子路径（如 `@douyinfe/semi-ui/lib/es/button`）导入。
- **正交组合**：`type` 和 `theme` 是正交的两个维度，默认 `type='primary'` `theme='light'`。二者组合共 20 种样式，按需选择。
- **主操作按钮**：页面主操作必须用 `type='primary' theme='solid'`，同一视图最多 1 个。
- **危险操作**：删除/清空/不可逆操作必须用 `type='danger'`，建议配合二次确认（Modal/Popconfirm）。
- **加载状态**：异步操作必须用 `loading` 状态防止重复提交，loading 期间自动禁止点击。
- **仅图标按钮**：无文字的 `icon` 按钮建议提供 `aria-label`，保证可访问性。
- **表单按钮**：表单内非提交按钮建议设置 `htmlType='button'`，避免误触发 submit。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| type | `'primary' \| 'secondary' \| 'tertiary' \| 'warning' \| 'danger'` | | `'primary'` | 按钮类型，决定语义和颜色 |
| theme | `'light' \| 'solid' \| 'borderless' \| 'outline'` | | `'light'` | 按钮主题，决定填充样式。`outline` 需 >=1.5.0 |
| size | `'large' \| 'default' \| 'small'` | | `'default'` | 按钮尺寸 |
| block | `boolean` | | `false` | 是否撑满父容器宽度 |
| disabled | `boolean` | | `false` | 禁用状态 |
| loading | `boolean` | | `false` | 加载状态，加载中禁止点击 |
| icon | `ReactNode` | | | 图标元素，可配合文字或单独使用 |
| iconPosition | `'left' \| 'right'` | | `'left'` | 图标相对于文字的位置 |
| htmlType | `'button' \| 'reset' \| 'submit'` | | `'button'` | 原生 button 的 type 属性 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onClick | `(e: MouseEvent) => void` | 点击按钮时触发。loading 或 disabled 状态下不会触发。 |

---

## Examples

### 基础用法

主操作用 `type='primary' theme='solid'`，次操作用默认样式。

```tsx
import { Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <Button type="primary" theme="solid">主操作</Button>
    <Button type="primary">次操作</Button>
    <Button type="tertiary">文字按钮</Button>
  </div>
);
```

### type × theme 组合

type 和 theme 正交组合，按场景选择。

```tsx
import { Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ display: 'flex', gap: 8 }}>
      <Button type="primary" theme="solid">Primary Solid</Button>
      <Button type="primary" theme="light">Primary Light</Button>
      <Button type="primary" theme="borderless">Primary Borderless</Button>
      <Button type="primary" theme="outline">Primary Outline</Button>
    </div>
    <div style={{ display: 'flex', gap: 8 }}>
      <Button type="warning" theme="solid">Warning Solid</Button>
      <Button type="danger" theme="solid">Danger Solid</Button>
      <Button type="danger" theme="light">Danger Light</Button>
    </div>
  </div>
);
```

### 加载状态

异步操作时显示 loading，防止重复提交。

```tsx
import { useState } from 'react';
import { Button } from '@douyinfe/semi-ui';

const Demo = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Button type="primary" theme="solid" loading={loading} onClick={handleClick}>
      {loading ? '提交中...' : '提交'}
    </Button>
  );
};
```

### 图标按钮

含图标的按钮。仅图标按钮必须提供 `aria-label`。

```tsx
import { Button } from '@douyinfe/semi-ui';
import { IconSearch, IconDelete } from '@douyinfe/semi-icons';

const Demo = () => (
  <div style={{ display: 'flex', gap: 8 }}>
    <Button icon={<IconSearch />} type="primary" theme="solid">搜索</Button>
    <Button icon={<IconSearch />} type="primary" theme="light" aria-label="搜索" />
    <Button icon={<IconDelete />} type="danger" theme="borderless" aria-label="删除" />
  </div>
);
```

### ButtonGroup 按钮组

使用 `ButtonGroup` 将多个按钮编组，可统一控制 `size` 和 `disabled`。

```tsx
import { Button, ButtonGroup } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <ButtonGroup>
      <Button>复制</Button>
      <Button>粘贴</Button>
      <Button>剪切</Button>
    </ButtonGroup>
    <ButtonGroup size="small" disabled>
      <Button>选项 A</Button>
      <Button>选项 B</Button>
      <Button>选项 C</Button>
    </ButtonGroup>
  </div>
);
```

---

## Behavior

- **loading**：
  - 设置 `loading={true}` 时，按钮内显示旋转 spinner。
  - 自动进入不可点击状态，`onClick` 不会触发。
  - 按钮宽度保持不变，避免布局抖动。
- **disabled**：
  - 视觉置灰，鼠标样式为 `not-allowed`。
  - 不触发 `onClick`。
  - 不可通过键盘聚焦。
- **focus**：
  - 支持 Tab 键聚焦。
  - 聚焦时显示 `:focus-visible` 外轮廓，与 hover 状态区分。
- **键盘**：
  - 聚焦状态下按 `Enter` 或 `Space` 触发 `onClick`。

---

## When to use

**适用**：

- 提交表单、保存数据。
- 对话框的"确认/取消"操作。
- 触发即时操作（如刷新、复制、下载）。
- 工具栏按钮组（配合 ButtonGroup）。

**不适用**：

- **页面跳转** → 用 `<a>` 标签或路由 Link。
- **多个并列操作超过 3 个** → 用 `Dropdown` 收敛到"更多"菜单。
- **纯文字链接样式** → 用 `Typography.Text` 的 `link` 属性。

---

## Usage guide

### type 选择

| 选项 | 适用场景 | 示例 |
|------|----------|------|
| primary | 页面主操作、高优先级 | 提交、保存、确认 |
| secondary | 一般操作、次级按钮 | 取消、编辑 |
| tertiary | 低优先级操作、辅助功能 | 筛选、更多 |
| warning | 需要警告的操作 | 离开未保存的页面 |
| danger | 不可逆/破坏性操作 | 删除、清空 |

### theme 选择

| 选项 | 适用场景 | 示例 |
|------|----------|------|
| solid | 最强视觉权重，主操作 | 主按钮填充色 |
| light | 默认，柔和背景色 | 次级按钮 |
| borderless | 无边框无背景，最弱权重 | 工具栏图标按钮 |
| outline | 线框样式（>=1.5.0） | 带边框的辅助按钮 |

---

## Accessibility

- **键盘**：支持 Tab 序列聚焦，Enter/Space 激活。
- **焦点**：Focus Ring 清晰可见，不被 `overflow: hidden` 截断。
- **ARIA**：
  - 仅图标按钮必须有 `aria-label`。
  - 加载中建议配合 `aria-busy="true"`。
  - 禁用按钮可通过 `aria-disabled` 保持在 Tab 序列中并用 Tooltip 提示原因。

---

## Related

- `ButtonGroup`：将多个 Button 编组，统一控制尺寸和禁用状态。
- `Dropdown`：当操作项较多时，用 Dropdown + Button 收敛操作。
- `Popconfirm`：危险操作按钮配合 Popconfirm 实现二次确认。
- `Modal`：Button 常作为 Modal 底部操作按钮，主操作用 `type='primary' theme='solid'`。
- `Input`：表单场景中 Button 与 Input 搭配使用，注意 `htmlType` 设置。
