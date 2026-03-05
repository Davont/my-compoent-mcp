---
name: Switch
import: "import { Switch } from '@douyinfe/semi-ui';"
category: input
status: stable
since: 0.1.0
aliases: [开关, Toggle]
keywords: [switch, toggle, on, off, 开关, 切换]
tokens: [--semi-color-primary, --semi-color-bg-2]
source: packages/semi-ui/switch/index.tsx
---

# Switch

开关控件，用于在"开"和"关"两种状态之间切换，表示功能的启用或禁用。视觉上即时反馈当前状态。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Switch } from '@douyinfe/semi-ui'`，禁止从子路径导入。
- **受控配对**：受控模式下 `checked` + `onChange` 必须配对使用，单独传 `checked` 不传 `onChange` 会导致开关无法切换。
- **加载状态**：异步操作使用 `loading` 属性表示等待，禁止用 `disabled` 模拟加载态（语义不同）。
- **内嵌文字**：开关内显示文字必须用 `checkedText` / `uncheckedText`，禁止用 `children` 传入。
- **语义选择**：Switch 用于"开/关"二态场景（如启用通知），"是否同意"类场景用 `Checkbox`。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| checked | `boolean` | | | 受控：开关是否开启 |
| defaultChecked | `boolean` | | `false` | 非受控：初始是否开启 |
| disabled | `boolean` | | `false` | 禁用状态 |
| loading | `boolean` | | `false` | 加载状态，显示 spinner 且禁止操作 |
| size | `'default' \| 'small' \| 'large'` | | `'default'` | 开关尺寸 |
| checkedText | `ReactNode` | | | 开启状态下内嵌的文字或图标 |
| uncheckedText | `ReactNode` | | | 关闭状态下内嵌的文字或图标 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(checked: boolean, e: Event) => void` | 开关状态变化时触发。第一个参数为变化后的状态。disabled 或 loading 时不触发。 |

---

## Examples

### 基础用法

最简单的开关，默认非受控。

```tsx
import { Switch } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <Switch />
    <Switch defaultChecked />
    <Switch disabled />
  </div>
);
```

### 尺寸变体

三种尺寸适配不同场景。

```tsx
import { Switch } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <Switch size="small" defaultChecked />
    <Switch size="default" defaultChecked />
    <Switch size="large" defaultChecked />
  </div>
);
```

### 内嵌文字

使用 `checkedText` 和 `uncheckedText` 在开关内显示状态文字。

```tsx
import { Switch } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
    <Switch checkedText="开" uncheckedText="关" defaultChecked />
    <Switch size="large" checkedText="ON" uncheckedText="OFF" />
  </div>
);
```

### 加载状态

异步操作时显示 loading，防止用户重复点击。

```tsx
import { useState } from 'react';
import { Switch } from '@douyinfe/semi-ui';

const Demo = () => {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (val: boolean) => {
    setLoading(true);
    setTimeout(() => {
      setChecked(val);
      setLoading(false);
    }, 1500);
  };

  return (
    <Switch
      checked={checked}
      loading={loading}
      onChange={handleChange}
      checkedText="开" uncheckedText="关"
    />
  );
};
```

### 受控模式

配合表单或外部状态管理使用。

```tsx
import { useState } from 'react';
import { Switch } from '@douyinfe/semi-ui';

const Demo = () => {
  const [checked, setChecked] = useState(true);

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <Switch checked={checked} onChange={(val) => setChecked(val)} />
      <span>通知已{checked ? '开启' : '关闭'}</span>
    </div>
  );
};
```

---

## Behavior

- **loading**：
  - 设置 `loading={true}` 时，开关内显示旋转 spinner。
  - 自动进入不可操作状态，`onChange` 不会触发。
  - 开关位置保持不变，视觉上仍体现当前状态。
- **disabled**：
  - 视觉置灰，鼠标样式为 `not-allowed`。
  - `onChange` 不会触发。
  - 仍保留在 Tab 序列中（与 Button 不同）。
- **focus**：
  - 支持 Tab 聚焦，聚焦时显示 `:focus-visible` 外轮廓。
- **键盘**：
  - 聚焦状态下按 `Space` 或 `Enter` 切换开关。
- **动画**：
  - 开关切换时有平滑过渡动画，圆点从左滑到右或反向。

---

## When to use

**适用**：

- 功能启用/禁用（如开启通知、暗黑模式、自动保存）。
- 设置项的二态切换，需要即时反馈。
- 列表中每行的独立开关控制。

**不适用**：

- **需要提交才生效的选择** → 用 `Checkbox`。
- **"同意协议"类确认** → 用 `Checkbox`。
- **多个互斥选项** → 用 `Radio`。
- **多个可叠加选项** → 用 `Checkbox` / `CheckboxGroup`。

---

## Accessibility

- **键盘**：Tab 聚焦，Space / Enter 切换状态。
- **焦点**：Focus Ring 清晰可见，disabled 状态仍可聚焦（可配合 Tooltip 提示原因）。
- **ARIA**：
  - 自动设置 `role="switch"` 和 `aria-checked`。
  - 禁用时自动添加 `aria-disabled`。
  - 加载时建议配合 `aria-busy="true"`。
  - 无关联 label 时应提供 `aria-label` 说明用途。

---

## Related

- `Checkbox`：多选/确认场景使用，与 Switch 的"开/关"语义区分。
- `Radio`：互斥选择场景，两个选项的 Radio 可考虑替换为 Switch。
- `Form.Switch`：在 Form 中使用时用 Form 封装版本，自动绑定表单状态。
- `Button`：某些场景（如工具栏切换）可用 Button 的 active 状态替代 Switch。
