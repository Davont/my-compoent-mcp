---
name: Input
import: "import { Input } from '@my-design/react';"
category: form
status: stable
since: 1.0.0
aliases: [输入框, TextInput]
keywords: [输入, 文本, 表单, 搜索, 密码]
figma: ""
tokens: [--md-color-primary, --md-color-border, --md-radius-sm, --md-spacing-sm]
source: "components/input/index.js"
---

# Input

基础文本输入组件，用于表单填写、搜索、文本编辑等场景。

---

## 核心规则（AI 生成时必读）

- **受控优先**：表单场景**必须**使用受控模式（传入 `value` + `onChange`），避免状态不一致。
- **placeholder 规范**：placeholder 用于提示输入格式（如"请输入手机号"），**禁止**用作字段标签替代。
- **maxLength**：有长度限制的输入**必须**设置 `maxLength`，并在 UI 上显示剩余字符数。
- **禁止硬编码**：颜色/间距/圆角**必须**使用 token，禁止写 `8px` / `#1890ff`。
- **清除按钮**：搜索场景**建议**开启 `allowClear`，方便用户快速清空。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string` | | | 受控值 |
| defaultValue | `string` | | `''` | 非受控默认值 |
| placeholder | `string` | | | 占位提示文本 |
| disabled | `boolean` | | `false` | 禁用状态 |
| readOnly | `boolean` | | `false` | 只读状态 |
| maxLength | `number` | | | 最大输入长度 |
| size | `'small' \| 'medium' \| 'large'` | | `'medium'` | 输入框尺寸 |
| prefix | `ReactNode` | | | 前缀内容（如图标） |
| suffix | `ReactNode` | | | 后缀内容（如图标） |
| allowClear | `boolean` | | `false` | 是否显示清除按钮 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(value: string, e: ChangeEvent) => void` | 输入内容变化时触发 |
| onFocus | `(e: FocusEvent) => void` | 获得焦点时触发 |
| onBlur | `(e: FocusEvent) => void` | 失去焦点时触发 |
| onPressEnter | `(e: KeyboardEvent) => void` | 按下 Enter 键时触发 |

---

## Examples

### 基础用法

```tsx
import { Input } from '@my-design/react';

const Demo = () => (
  <Input placeholder="请输入内容" />
);
```

### 受控模式

表单场景推荐使用受控模式。

```tsx
import { useState } from 'react';
import { Input } from '@my-design/react';

const Demo = () => {
  const [value, setValue] = useState('');

  return (
    <Input
      value={value}
      onChange={(val) => setValue(val)}
      placeholder="请输入用户名"
    />
  );
};
```

### 带图标和清除按钮

搜索场景常用组合。

```tsx
import { Input } from '@my-design/react';
import { SearchIcon } from '@my-design/icons';

const Demo = () => (
  <Input
    prefix={<SearchIcon />}
    allowClear
    placeholder="搜索..."
  />
);
```

---

## Behavior

- **受控 vs 非受控**：
  - 传入 `value` 时为受控模式，组件值完全由外部控制。
  - 仅传 `defaultValue` 时为非受控模式，组件内部管理状态。
- **allowClear**：
  - 输入框有内容且非 disabled 时，右侧显示清除图标。
  - 点击清除后自动聚焦输入框。
- **disabled vs readOnly**：
  - `disabled`：视觉置灰，不可聚焦，不可选中文本。
  - `readOnly`：可聚焦，可选中复制文本，但不可编辑。

---

## When to use

**适用**：

- 表单中的文本输入（用户名、邮箱、地址等）。
- 搜索框。
- 简短的文本编辑。

**不适用**：

- **多行文本**：请使用 `Textarea` 组件。
- **数字输入**：请使用 `InputNumber` 组件。
- **选择操作**：请使用 `Select` 或 `AutoComplete`。

---

## Accessibility

- [ ] **键盘**：支持 Tab 聚焦，Enter 触发 `onPressEnter`。
- [ ] **焦点**：Focus Ring 清晰可见。
- [ ] **ARIA**：配合 `<label>` 使用，或提供 `aria-label`。

---

## Related

- `Select`：当选项为固定枚举值时用 Select 替代 Input；需要自由输入+建议时考虑 AutoComplete。
- `Button`：表单中 Input 与 Button 搭配提交，搜索场景常组合使用（Input + 搜索按钮）。
- `Tooltip`：可在 Input 旁用 Tooltip 提供输入格式说明或帮助信息。
- `Modal`：Modal 内常包含 Input 作为表单输入，注意 `destroyOnClose` 对受控状态的影响。
