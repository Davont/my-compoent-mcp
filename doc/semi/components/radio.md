---
name: Radio
import: "import { Radio, RadioGroup } from '@douyinfe/semi-ui';"
category: input
status: stable
since: 0.1.0
aliases: [单选框, 单选]
keywords: [radio, option, single, 单选, 选择]
tokens: [--semi-color-primary, --semi-color-bg-2]
source: packages/semi-ui/radio/index.tsx
---

# Radio

单选按钮组件，用于在一组互斥选项中选择一个。支持 default / button / card / pureCard 四种展示形态，配合 RadioGroup 实现分组管理。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Radio, RadioGroup } from '@douyinfe/semi-ui'`，禁止从子路径导入。
- **分组管理**：多个单选项必须用 `RadioGroup` 包裹，由 RadioGroup 统一管理选中状态，禁止手动维护各 Radio 的 checked。
- **按钮风格**：需要按钮样式的单选组用 `type='button'`，卡片样式用 `type='card'` 或 `type='pureCard'`。
- **快捷与 children 互斥**：`options` 快捷模式和 `RadioGroup > Radio` children 模式二选一，不可混用。
- **受控模式**：受控模式下 `value` + `onChange` 必须配对使用，缺少 `onChange` 会导致选中状态无法更新。
- **默认选中**：非受控场景用 `defaultValue`，不要同时传 `value` 和 `defaultValue`。

---

## Props

### Radio

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `any` | | | Radio 的值，在 RadioGroup 内作为唯一标识 |
| checked | `boolean` | | `false` | 是否选中（受控，独立使用时） |
| defaultChecked | `boolean` | | `false` | 初始是否选中（非受控） |
| disabled | `boolean` | | `false` | 禁用状态 |
| extra | `ReactNode` | | | 副文本，显示在 label 下方 |
| mode | `'advanced'` | | | 设为 `'advanced'` 时可点击已选中项取消选中 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

### RadioGroup

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `any` | | | 当前选中值（受控） |
| defaultValue | `any` | | | 默认选中值（非受控） |
| options | `Array<string \| { label, value, disabled, extra }>` | | | 快捷配置选项列表 |
| type | `'default' \| 'button' \| 'card' \| 'pureCard'` | | `'default'` | 展示形态 |
| direction | `'horizontal' \| 'vertical'` | | `'horizontal'` | 排列方向 |
| buttonSize | `'small' \| 'middle' \| 'large'` | | `'middle'` | 按钮尺寸，仅 `type='button'` 时有效 |
| disabled | `boolean` | | `false` | 整组禁用 |
| name | `string` | | | 底层 `<input>` 的 name 属性 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange（Radio） | `(e: { target: { value, checked }, nativeEvent }) => void` | 单个 Radio 选中状态变化时触发 |
| onChange（RadioGroup） | `(e: { target: { value }, nativeEvent }) => void` | 选中项变化时触发，`e.target.value` 为选中值 |

---

## Examples

### 基础用法

使用 RadioGroup 管理一组单选项，通过 `defaultValue` 设置默认选中。

```tsx
import { Radio, RadioGroup } from '@douyinfe/semi-ui';

const Demo = () => (
  <RadioGroup defaultValue="apple" onChange={(e) => console.log(e.target.value)}>
    <Radio value="apple">苹果</Radio>
    <Radio value="banana">香蕉</Radio>
    <Radio value="orange">橘子</Radio>
  </RadioGroup>
);
```

### options 快捷模式

通过 `options` 数组快速生成选项，支持字符串数组或对象数组。

```tsx
import { RadioGroup } from '@douyinfe/semi-ui';

const options = [
  { label: '小程序', value: 'miniapp' },
  { label: 'Web 应用', value: 'webapp' },
  { label: '移动端', value: 'mobile', disabled: true },
];

const Demo = () => (
  <RadioGroup options={options} defaultValue="webapp" />
);
```

### 按钮风格

`type='button'` 呈现为按钮组样式，用 `buttonSize` 控制尺寸。

```tsx
import { RadioGroup } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <RadioGroup type="button" buttonSize="small" defaultValue="day">
      <Radio value="day">日</Radio>
      <Radio value="week">周</Radio>
      <Radio value="month">月</Radio>
    </RadioGroup>
    <RadioGroup type="button" buttonSize="large" defaultValue="all">
      <Radio value="all">全部</Radio>
      <Radio value="unread">未读</Radio>
      <Radio value="read">已读</Radio>
    </RadioGroup>
  </div>
);
```

### 卡片风格

`type='card'` 带背景的卡片样式，`type='pureCard'` 无背景纯卡片样式，配合 `extra` 显示描述。

```tsx
import { Radio, RadioGroup } from '@douyinfe/semi-ui';

const Demo = () => (
  <RadioGroup type="card" defaultValue="standard" direction="vertical">
    <Radio value="standard" extra="适用于中小型项目，基础功能完备">
      标准版
    </Radio>
    <Radio value="pro" extra="适用于大型项目，包含高级分析和协作功能">
      专业版
    </Radio>
    <Radio value="enterprise" extra="企业级部署，私有化和定制化支持" disabled>
      企业版
    </Radio>
  </RadioGroup>
);
```

### 垂直排列

`direction='vertical'` 垂直排列适合选项较多或 label 较长的场景。

```tsx
import { Radio, RadioGroup } from '@douyinfe/semi-ui';

const Demo = () => (
  <RadioGroup direction="vertical" defaultValue="option1">
    <Radio value="option1">使用系统默认配置</Radio>
    <Radio value="option2">自定义高级配置</Radio>
    <Radio value="option3">从模板导入配置</Radio>
  </RadioGroup>
);
```

---

## Behavior

- **选中互斥**：同一 RadioGroup 内同时只能有一个选项被选中，选中新项时自动取消前一项。
- **disabled**：
  - 禁用的 Radio 视觉置灰，鼠标为 `not-allowed`。
  - RadioGroup 的 `disabled` 会覆盖所有子 Radio。
  - 已选中 + 禁用的 Radio 保持选中样式但不可取消。
- **mode='advanced'**：设置后可点击已选中项取消选中（清空值）。
- **键盘**：
  - 方向键（↑/↓ 或 ←/→）在组内切换焦点并选中。
  - Tab 进入和离开 RadioGroup。

---

## When to use

**适用**：

- 互斥选项中选择一项（如性别、支付方式）。
- 筛选栏切换视图模式（配合 `type='button'`）。
- 卡片式选择方案/套餐（配合 `type='card'`）。

**不适用**：

- **多选场景** → 用 `Checkbox` / `CheckboxGroup`。
- **选项超过 7 个** → 用 `Select` 下拉选择。
- **开关切换** → 两个互斥状态用 `Switch`。
- **标签页切换** → 用 `Tabs`。

---

## Accessibility

- **键盘**：方向键在 RadioGroup 内切换选项并选中，Tab 进入/离开组。
- **焦点**：选中项获得焦点，Focus Ring 清晰可见。
- **ARIA**：
  - RadioGroup 自动添加 `role="radiogroup"`。
  - 每个 Radio 渲染为 `role="radio"`，`aria-checked` 反映选中状态。
  - 建议为 RadioGroup 提供 `aria-label` 或关联 `<label>` 说明分组用途。

---

## Related

- `Checkbox` / `CheckboxGroup`：多选场景使用，支持选中多项。
- `Select`：选项较多（>7）时用下拉选择替代 Radio。
- `Switch`：仅两个互斥状态的开关切换。
- `Tabs`：页面/面板切换场景，功能上类似但语义和展示不同。
- `Form.RadioGroup`：表单场景下 RadioGroup 会自动与 Form 集成。
