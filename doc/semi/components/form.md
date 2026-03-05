---
name: Form
import: "import { Form } from '@douyinfe/semi-ui';"
category: input
status: stable
since: 0.1.0
aliases: [表单]
keywords: [form, field, validate, submit, 表单, 校验, 提交]
tokens: [--semi-color-primary, --semi-color-danger]
source: packages/semi-ui/form/index.tsx
---

# Form

表单组件，用于数据收集、校验和提交。Semi 的 Form 采用 Field 组件内聚模式——Form.Input / Form.Select 等自带 label、校验、布局能力，无需额外 Form.Item 包裹。

---

## 核心规则（AI 生成时必读）

- **统一导入**：必须 `import { Form } from '@douyinfe/semi-ui'`，禁止从子路径导入。
- **使用内置 Field**：表单项必须使用 `Form.Input` / `Form.Select` / `Form.Switch` 等内置 Field 组件，禁止直接放裸 `<Input />`，否则无法接入表单状态管理。
- **field 必填**：每个 Field 组件必须设置 `field` 属性作为表单值的 key，缺失会导致取值失败。
- **校验规则**：校验逻辑必须写在 Field 的 `rules` prop 中，支持 required / type / min / max / pattern / validator，禁止在外部手写校验逻辑。
- **获取 formApi**：通过 `ref` 或 render props 模式获取：`<Form render={({ formState, formApi }) => (...)} />`，禁止自行维护表单状态。
- **提交方式**：使用 `onSubmit` 回调或 `formApi.submitForm()`，禁止手动遍历收集表单值。

---

## Props

### Form

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| layout | `'horizontal' \| 'vertical'` | | `'vertical'` | 表单布局方式 |
| labelPosition | `'top' \| 'left' \| 'inset'` | | `'top'` | 标签位置 |
| labelWidth | `string \| number` | | | 标签宽度，labelPosition 为 left 时生效 |
| labelAlign | `'left' \| 'right'` | | `'left'` | 标签对齐方式 |
| initValues | `Record<string, any>` | | | 表单初始值对象 |
| disabled | `boolean` | | `false` | 禁用整个表单 |
| trigger | `'blur' \| 'change' \| 'custom' \| 'mount'` | | `'change'` | 全局校验触发时机 |
| getFormApi | `(formApi: FormApi) => void` | | | 获取 formApi 的回调 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义样式 |

### Field 通用 Props（Form.Input / Form.Select 等）

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| field | `string` | ✅ | | 字段名，作为表单值的 key |
| label | `ReactNode` | | | 标签文本 |
| rules | `Rule[]` | | | 校验规则数组 |
| trigger | `'blur' \| 'change' \| 'custom' \| 'mount'` | | 继承 Form | 该字段的校验触发时机 |
| initValue | `any` | | | 该字段的初始值 |
| validate | `(value, values) => string \| Promise` | | | 自定义校验函数 |
| noLabel | `boolean` | | `false` | 隐藏 label |

### Rule 结构

| 属性 | Type | Description |
|------|------|-------------|
| required | `boolean` | 是否必填 |
| type | `string` | 值类型，如 'email' / 'url' / 'number' |
| min | `number` | 最小值/最小长度 |
| max | `number` | 最大值/最大长度 |
| pattern | `RegExp` | 正则校验 |
| message | `string` | 校验失败提示文案 |
| validator | `(rule, value) => boolean \| Promise` | 自定义校验器 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onSubmit | `(values: Record<string, any>) => void` | 校验通过后的提交回调 |
| onSubmitFail | `(errors: object, values: object) => void` | 校验失败时的回调 |
| onValueChange | `(values: object, changedValues: object) => void` | 任意字段值变化时触发 |
| onReset | `() => void` | 重置表单时触发 |

---

## Examples

### 基础用法

最简单的登录表单，使用 `Form.Input` 自动管理 label 和值。

```tsx
import { Form, Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <Form onSubmit={(values) => console.log(values)}>
    <Form.Input field="username" label="用户名" placeholder="请输入用户名" />
    <Form.Input field="password" label="密码" type="password" placeholder="请输入密码" />
    <Button htmlType="submit" theme="solid" type="primary">登录</Button>
  </Form>
);
```

### 水平布局 + labelPosition

`layout="horizontal"` 配合 `labelPosition="left"` 实现左标签右控件的经典表单。

```tsx
import { Form, Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <Form
    layout="horizontal"
    labelPosition="left"
    labelWidth="100px"
    labelAlign="right"
    onSubmit={(values) => console.log(values)}
  >
    <Form.Input field="name" label="姓名" placeholder="请输入姓名" />
    <Form.Select field="role" label="角色" placeholder="请选择角色">
      <Form.Select.Option value="admin">管理员</Form.Select.Option>
      <Form.Select.Option value="user">普通用户</Form.Select.Option>
    </Form.Select>
    <Form.Switch field="active" label="启用状态" />
    <Button htmlType="submit" theme="solid" type="primary">保存</Button>
  </Form>
);
```

### 校验规则

通过 `rules` 配置必填、类型、正则等校验，支持 `trigger` 指定触发时机。

```tsx
import { Form, Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <Form onSubmit={(values) => console.log(values)}>
    <Form.Input
      field="email"
      label="邮箱"
      rules={[
        { required: true, message: '请输入邮箱' },
        { type: 'email', message: '邮箱格式不正确' },
      ]}
      trigger="blur"
    />
    <Form.Input
      field="phone"
      label="手机号"
      rules={[
        { required: true, message: '请输入手机号' },
        { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
      ]}
    />
    <Form.Input
      field="age"
      label="年龄"
      type="number"
      rules={[
        { required: true, message: '请输入年龄' },
        { type: 'number', min: 1, max: 150, message: '年龄范围 1-150' },
      ]}
    />
    <Button htmlType="submit" theme="solid" type="primary">提交</Button>
  </Form>
);
```

### formApi 用法

通过 render props 获取 formApi，实现外部控制表单。

```tsx
import { Form, Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <Form
    initValues={{ name: '张三', department: 'engineering' }}
    render={({ formState, formApi }) => (
      <>
        <Form.Input field="name" label="姓名" />
        <Form.Select field="department" label="部门">
          <Form.Select.Option value="engineering">工程</Form.Select.Option>
          <Form.Select.Option value="design">设计</Form.Select.Option>
        </Form.Select>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button theme="solid" type="primary" onClick={() => formApi.submitForm()}>
            提交
          </Button>
          <Button onClick={() => formApi.reset()}>重置</Button>
          <Button onClick={() => formApi.setValue('name', '')}>清空姓名</Button>
        </div>
        <pre style={{ marginTop: 12 }}>{JSON.stringify(formState.values, null, 2)}</pre>
      </>
    )}
  />
);
```

### ArrayField 动态数组

用于动态增删表单行，如联系人列表。

```tsx
import { Form, Button, ArrayField } from '@douyinfe/semi-ui';
import { IconPlusCircle, IconMinusCircle } from '@douyinfe/semi-icons';

const Demo = () => (
  <Form onSubmit={(values) => console.log(values)}>
    <ArrayField field="contacts" initValue={[{ name: '', phone: '' }]}>
      {({ add, arrayFields }) => (
        <>
          {arrayFields.map(({ field, key, remove }) => (
            <div key={key} style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <Form.Input field={`${field}[name]`} label="姓名" style={{ width: 200 }} />
              <Form.Input field={`${field}[phone]`} label="电话" style={{ width: 200 }} />
              <Button
                type="danger"
                theme="borderless"
                icon={<IconMinusCircle />}
                onClick={remove}
              />
            </div>
          ))}
          <Button
            theme="borderless"
            icon={<IconPlusCircle />}
            onClick={add}
          >
            添加联系人
          </Button>
        </>
      )}
    </ArrayField>
    <Button htmlType="submit" theme="solid" type="primary" style={{ marginTop: 16 }}>
      提交
    </Button>
  </Form>
);
```

---

## Behavior

- **布局**：
  - `vertical`（默认）：标签在上，控件在下，逐行排列。
  - `horizontal`：所有 Field 在同一行排列，适合筛选栏等紧凑场景。
- **labelPosition**：
  - `top`：标签在控件上方。
  - `left`：标签在控件左侧，需配合 `labelWidth` 控制标签列宽度。
  - `inset`：标签嵌入控件内部。
- **校验**：
  - 根据 `trigger` 配置（change / blur / mount / custom）触发校验。
  - 校验失败时在 Field 下方显示红色错误信息，控件边框变为 danger 色。
  - `onSubmit` 只在全部校验通过后触发；校验不通过触发 `onSubmitFail`。
- **formApi**：
  - `getValue(field)` / `getValues()`：获取单个/全部字段值。
  - `setValue(field, value)` / `setValues(values)`：设置字段值。
  - `validate()` / `validate([fields])`：手动触发校验。
  - `reset()` / `reset([fields])`：重置表单。
  - `submitForm()`：程序化提交。
- **禁用**：Form 设置 `disabled` 后，内部所有 Field 自动禁用。
- **键盘**：Tab 在 Field 之间跳转，Enter 在最后一个 Field 中可触发提交。

---

## When to use

**适用**：

- 需要收集用户输入的场景（登录、注册、个人信息编辑、设置页）。
- 需要统一校验、统一提交的场景。
- 动态表单项（增删行）场景，使用 ArrayField。

**不适用**：

- 纯展示数据 → 用 `Descriptions` 或 `Table`。
- 仅搜索/简单筛选 → 简单场景直接用 `Input` + `Button`，无需 Form 包裹。
- 复杂步骤式表单 → 配合 `Steps` 组件分步收集。

---

## Accessibility

- **键盘**：Tab 在字段间跳转，Enter 提交表单。
- **标签**：Field 的 label 自动生成 `<label>` 并通过 `htmlFor` 关联到内部控件。
- **错误提示**：校验失败时通过 `aria-describedby` 关联错误文本，`aria-invalid="true"` 标识错误状态。
- **必填标识**：设置 required 规则后自动显示红色星号，并添加 `aria-required="true"`。

---

## Related

- `Input`：最常用的表单控件，使用时必须用 `Form.Input` 而非裸 `Input`。
- `Select`：下拉选择控件，使用时用 `Form.Select`。
- `Switch`：开关控件，使用时用 `Form.Switch`。
- `Checkbox` / `Radio`：多选/单选控件，使用时用 `Form.Checkbox` / `Form.RadioGroup`。
- `ArrayField`：动态增删表单行，import 自 `@douyinfe/semi-ui`。
- `Modal`：弹窗内嵌表单时，通过 `formApi` 在弹窗按钮中控制提交。
- `Steps`：多步表单场景下配合使用，每步对应一个 Form 或一组 Field。
