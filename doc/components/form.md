---
name: Form
import: "import { Form } from '@my-design/react';"
category: form
status: stable
since: 1.0.0
aliases: [表单]
keywords: [表单, 提交, 校验, 验证, form, validate, submit]
figma: ""
tokens: [--md-color-primary, --md-color-danger, --md-spacing-sm, --md-spacing-md]
source: "src/components/Form/index.tsx"
---

# Form

表单容器组件，用于数据收集、校验和提交。通过 Form + Form.Item 组合使用，管理表单控件的布局、标签和校验。

---

## 核心规则（AI 生成时必读）

- **结构约束**：表单**必须**使用 `<Form>` → `<Form.Item>` → `表单控件` 的三层结构。**禁止**在 Form 和 Form.Item 之间插入 `<div>`、`<span>` 或任何包裹元素。
- **Form.Item 包裹**：每个表单控件（Input、Select 等）**必须**被 `<Form.Item>` 直接包裹，**禁止**裸写表单控件或用 div 替代 Form.Item。
- **字段名**：每个 `<Form.Item>` **必须**设置 `field` 属性作为字段标识，用于取值和校验。
- **标签**：`<Form.Item>` **必须**设置 `label` 属性，**禁止**省略标签或用 placeholder 替代标签。
- **校验规则**：有校验需求时通过 `<Form.Item rules={[...]}>`  配置，**禁止**在控件外层手写校验逻辑。
- **禁止硬编码**：颜色/间距/圆角**必须**使用 token，禁止写 `8px` / `#1890ff`。

---

## Props

### Form

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| layout | `'horizontal' \| 'vertical' \| 'inline'` | | `'horizontal'` | 表单布局方式 |
| initialValues | `Record<string, any>` | | | 表单默认值 |
| onSubmit | `(values: Record<string, any>) => void` | | | 提交回调 |
| onValuesChange | `(changedValues: object, allValues: object) => void` | | | 字段值变化回调 |
| disabled | `boolean` | | `false` | 禁用整个表单 |

### Form.Item

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| field | `string` | Yes | | 字段名，用于取值和校验 |
| label | `ReactNode` | | | 标签文本 |
| rules | `Rule[]` | | | 校验规则数组 |
| required | `boolean` | | `false` | 是否必填（显示红色星号） |

---

## Examples

### 基础用法

```tsx
import Form from '@my-design/react/Form';
import Input from '@my-design/react/Input';
import Button from '@my-design/react/Button';

const Demo = () => (
  <Form onSubmit={(values) => console.log(values)}>
    <Form.Item field="username" label="用户名" required>
      <Input placeholder="请输入用户名" />
    </Form.Item>
    <Form.Item field="password" label="密码" required>
      <Input placeholder="请输入密码" />
    </Form.Item>
    <Form.Item>
      <Button htmlType="submit" variant="primary">提交</Button>
    </Form.Item>
  </Form>
);
```

### 带校验

```tsx
import Form from '@my-design/react/Form';
import Input from '@my-design/react/Input';
import Select from '@my-design/react/Select';
import Button from '@my-design/react/Button';

const Demo = () => (
  <Form layout="vertical" onSubmit={(values) => console.log(values)}>
    <Form.Item
      field="email"
      label="邮箱"
      rules={[
        { required: true, message: '请输入邮箱' },
        { type: 'email', message: '邮箱格式不正确' },
      ]}
    >
      <Input placeholder="请输入邮箱" />
    </Form.Item>
    <Form.Item
      field="role"
      label="角色"
      rules={[{ required: true, message: '请选择角色' }]}
    >
      <Select placeholder="请选择角色" />
    </Form.Item>
    <Form.Item>
      <Button htmlType="submit" variant="primary">提交</Button>
    </Form.Item>
  </Form>
);
```

---

## Behavior

- **布局**：
  - `horizontal`：标签在左，控件在右（默认）。
  - `vertical`：标签在上，控件在下。
  - `inline`：所有字段水平排列。
- **校验**：
  - 提交时自动校验所有带 `rules` 的字段。
  - 校验失败时阻止提交，并在对应 Form.Item 下方显示错误信息。
- **禁用**：
  - Form 设置 `disabled` 后，内部所有表单控件自动禁用。

---

## When to use

**适用**：

- 需要收集用户输入的场景（登录、注册、设置页等）。
- 需要字段校验的场景。

**不适用**：

- 纯展示数据：请使用 Descriptions 组件。
- 仅搜索/筛选：简单场景可直接用 Input，无需 Form 包裹。

---

## Accessibility

- [ ] **键盘**：Tab 在字段间跳转，Enter 提交表单。
- [ ] **标签**：Form.Item 的 label 自动关联 for 属性到内部控件。
- [ ] **错误提示**：校验失败时通过 `aria-describedby` 关联错误文本。

---

## Related

- `Input`：最常用的表单控件，配合 Form.Item 使用。
- `Select`：下拉选择控件，配合 Form.Item 使用。
- `Button`：表单提交按钮，必须设置 `htmlType="submit"`。
- `Modal`：Modal 内嵌表单时，提交和关闭逻辑需协调处理。
