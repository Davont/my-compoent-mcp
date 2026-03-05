---
name: Input
import: "import { Input } from '@douyinfe/semi-ui';"
category: input
status: stable
since: 0.1.0
aliases: [输入框, TextInput]
keywords: [input, text, form, password, textarea, 输入, 输入框, 文本]
tokens: [--semi-color-primary, --semi-color-text-0, --semi-border-radius-small]
source: packages/semi-ui/input/index.tsx
---

# Input

基础文本输入组件，支持前后缀、校验状态、密码模式、清除按钮等能力，用于表单填写、搜索、文本编辑等场景。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Input } from '@douyinfe/semi-ui'`，禁止从子路径导入。
- **受控模式**：表单场景必须同时设置 `value` 和 `onChange`，二者缺一不可。
- **密码输入**：密码输入必须用 `mode='password'`，禁止用 `type='password'`（Semi 通过 mode 控制密码模式，内置了显示/隐藏切换）。
- **校验状态**：校验样式通过 `validateStatus` 控制，配合 Form 使用时自动传入，禁止手动设置边框颜色。
- **清除按钮**：需要清除功能时用 `showClear` 开启，禁止自行实现清除按钮。
- **多行输入**：多行文本必须用 `TextArea` 组件（`import { TextArea } from '@douyinfe/semi-ui'`），禁止对 Input 设置多行相关属性。
- **placeholder 规范**：placeholder 仅用于格式提示（如"请输入手机号"），禁止替代字段标签。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string` | | | 受控值 |
| defaultValue | `string` | | `''` | 非受控默认值 |
| size | `'large' \| 'default' \| 'small'` | | `'default'` | 输入框尺寸 |
| prefix | `ReactNode` | | | 前缀内容（输入框内部左侧，常用于图标） |
| suffix | `ReactNode` | | | 后缀内容（输入框内部右侧，常用于图标） |
| addonBefore | `ReactNode` | | | 前置标签（输入框外部左侧，常用于文字） |
| addonAfter | `ReactNode` | | | 后置标签（输入框外部右侧，常用于文字） |
| showClear | `boolean` | | `false` | 是否在有内容且聚焦/悬浮时显示清除按钮 |
| mode | `'password'` | | | 设为 `'password'` 启用密码模式，内置显示/隐藏切换 |
| disabled | `boolean` | | `false` | 禁用状态 |
| readonly | `boolean` | | `false` | 只读状态 |
| validateStatus | `'default' \| 'error' \| 'warning'` | | `'default'` | 校验状态，控制边框颜色 |
| placeholder | `string` | | | 占位提示文本 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |
| type | `string` | | `'text'` | 原生 input 的 type（如 `text`、`number`、`email`），密码请用 `mode` |
| maxLength | `number` | | | 最大输入长度 |
| getValueLength | `(value: string) => number` | | | 自定义计算字符长度函数（如中文算两个字符） |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(value: string, e: ChangeEvent) => void` | 输入内容变化时触发 |
| onClear | `() => void` | 点击清除按钮时触发 |
| onEnterPress | `(e: KeyboardEvent) => void` | 按下 Enter 键时触发 |
| onFocus | `(e: FocusEvent) => void` | 获得焦点时触发 |
| onBlur | `(e: FocusEvent) => void` | 失去焦点时触发 |

---

## Examples

### 基础用法

```tsx
import { Input } from '@douyinfe/semi-ui';

const Demo = () => (
  <Input placeholder="请输入内容" style={{ width: 320 }} />
);
```

### 三种尺寸

Semi Input 提供 large、default、small 三种尺寸。

```tsx
import { Input } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
    <Input size="large" placeholder="大尺寸" />
    <Input size="default" placeholder="默认尺寸" />
    <Input size="small" placeholder="小尺寸" />
  </div>
);
```

### 前后缀与标签

prefix/suffix 在输入框内部，addonBefore/addonAfter 在外部。

```tsx
import { Input } from '@douyinfe/semi-ui';
import { IconSearch } from '@douyinfe/semi-icons';

const Demo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 400 }}>
    <Input prefix={<IconSearch />} showClear placeholder="搜索..." />
    <Input suffix="元" placeholder="请输入金额" />
    <Input addonBefore="https://" addonAfter=".com" placeholder="域名" />
  </div>
);
```

### 密码输入

使用 `mode='password'`，内置密码显示/隐藏切换按钮。

```tsx
import { Input } from '@douyinfe/semi-ui';

const Demo = () => (
  <Input mode="password" placeholder="请输入密码" style={{ width: 320 }} />
);
```

### 校验状态

通过 `validateStatus` 控制输入框的校验样式。

```tsx
import { Input } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}>
    <Input validateStatus="default" placeholder="默认状态" />
    <Input validateStatus="warning" placeholder="警告状态" />
    <Input validateStatus="error" placeholder="错误状态" />
  </div>
);
```

### TextArea 多行输入

多行文本必须使用 TextArea 组件。支持 `autosize` 自适应高度和 `maxCount` 字数限制。

```tsx
import { TextArea } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 400 }}>
    <TextArea placeholder="请输入内容" autosize rows={3} />
    <TextArea placeholder="限制 100 字" maxCount={100} />
  </div>
);
```

---

## Behavior

- **受控 vs 非受控**：
  - 传入 `value` 时为受控模式，组件值完全由外部控制，必须搭配 `onChange`。
  - 仅传 `defaultValue` 时为非受控模式，组件内部管理状态。
- **showClear**：
  - 输入框有内容且处于 hover 或 focus 状态时，右侧显示清除图标。
  - 点击清除后触发 `onClear`，随后自动聚焦输入框。
  - disabled 或 readonly 状态下清除按钮不显示。
- **mode='password'**：
  - 输入内容以圆点遮蔽显示。
  - 右侧自动出现 eye 图标，点击可切换明文/密文。
- **validateStatus**：
  - `error`：输入框边框变为红色（`--semi-color-danger`）。
  - `warning`：输入框边框变为橙色（`--semi-color-warning`）。
  - 配合 Form 使用时由表单自动传入，无需手动设置。
- **disabled vs readonly**：
  - `disabled`：视觉置灰，不可聚焦，不可选中文本。
  - `readonly`：可聚焦，可选中复制文本，但不可编辑。
- **键盘**：
  - `Enter` 触发 `onEnterPress`。
  - `Tab` 正常聚焦/移出。
  - `Esc` 在有清除按钮时可清空内容（具体行为取决于业务实现）。

---

## When to use

**适用**：

- 表单中的单行文本输入（用户名、邮箱、手机号等）。
- 搜索框（配合 prefix 图标 + showClear）。
- 密码输入（用 mode='password'）。
- 带单位/标签的输入（配合 addonBefore/addonAfter）。

**不适用**：

- **多行文本** → 用 `TextArea` 组件。
- **数字输入** → 用 `InputNumber` 组件。
- **选择操作** → 用 `Select` 或 `AutoComplete` 组件。
- **富文本编辑** → 用专用富文本编辑器。

---

## Usage guide

### prefix / suffix vs addonBefore / addonAfter

| 选项 | 位置 | 适用场景 | 示例 |
|------|------|----------|------|
| prefix | 输入框内部左侧 | 图标 | 搜索图标 |
| suffix | 输入框内部右侧 | 图标或文字 | 单位"元"、加载 spinner |
| addonBefore | 输入框外部左侧 | 标签文字 | "https://" |
| addonAfter | 输入框外部右侧 | 标签文字 | ".com" |

### 密码输入方式对比

| 选项 | 推荐 | 说明 |
|------|:----:|------|
| `mode='password'` | ✅ | Semi 标准方式，内置明暗文切换 |
| `type='password'` | ❌ | 原生方式，无内置切换功能，禁止使用 |

---

## Accessibility

- **键盘**：支持 Tab 聚焦/移出，Enter 触发 `onEnterPress`。
- **焦点**：Focus Ring 清晰可见，聚焦时边框高亮。
- **ARIA**：
  - 配合 `<label>` 使用，或提供 `aria-label` / `aria-labelledby`。
  - 校验错误时建议搭配 `aria-describedby` 指向错误提示信息。
  - 密码模式切换按钮自带 `aria-label`（"显示密码"/"隐藏密码"）。

---

## Related

- `TextArea`：多行文本输入场景用 TextArea 替代 Input。
- `InputNumber`：纯数字输入用 InputNumber，内置步进器和范围限制。
- `Select`：固定选项用 Select；需要输入+建议用 AutoComplete。
- `Form`：表单场景中 Input 通常嵌套在 Form.Input 中，validateStatus 自动传入。
- `InputGroup`：将多个 Input/Select 组合为一组，统一样式。
