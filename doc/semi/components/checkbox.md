---
name: Checkbox
import: "import { Checkbox, CheckboxGroup } from '@douyinfe/semi-ui';"
category: input
status: stable
since: 0.1.0
aliases: [复选框, 多选]
keywords: [checkbox, check, multiple, 复选, 多选, 勾选]
tokens: [--semi-color-primary, --semi-color-bg-2]
source: packages/semi-ui/checkbox/index.tsx
---

# Checkbox

多选控件，允许用户从一组选项中选择零个或多个值。单独使用表示二态切换，配合 CheckboxGroup 管理一组多选项。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Checkbox, CheckboxGroup } from '@douyinfe/semi-ui'`，禁止从子路径导入。
- **分组管理**：多个复选框必须用 `CheckboxGroup` 管理状态，禁止手动维护 `checked` 数组在多个独立 `Checkbox` 上。
- **全选实现**：全选/反选必须用 `indeterminate` + `checked` 组合实现，禁止用额外 state 模拟半选样式。
- **快捷模式互斥**：`CheckboxGroup` 的 `options` 快捷模式和 `children` 模式二选一，禁止混用。
- **受控配对**：受控模式下 `value` + `onChange` 必须配对使用，单独传 `value` 不传 `onChange` 会导致选项无法切换。
- **语义区分**：二态开关场景（如"开启通知"）建议用 `Switch` 而非 `Checkbox`。

---

## Props

### Checkbox

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| checked | `boolean` | | | 受控：是否选中 |
| defaultChecked | `boolean` | | `false` | 非受控：初始是否选中 |
| indeterminate | `boolean` | | `false` | 半选状态，仅控制样式不影响 checked 值 |
| disabled | `boolean` | | `false` | 禁用状态 |
| value | `any` | | | 在 CheckboxGroup 中使用的值标识 |
| extra | `ReactNode` | | | 副文本，显示在主文本下方 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

### CheckboxGroup

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `any[]` | | | 受控：当前选中值数组 |
| defaultValue | `any[]` | | `[]` | 非受控：初始选中值数组 |
| options | `Array<string \| { label, value, disabled, extra }>` | | | 快捷配置选项，与 children 互斥 |
| direction | `'horizontal' \| 'vertical'` | | `'horizontal'` | 排列方向 |
| disabled | `boolean` | | `false` | 整组禁用 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

---

## Events

### Checkbox

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(e: { target: { checked: boolean }, nativeEvent: Event }) => void` | 选中状态变化时触发。disabled 时不触发。 |

### CheckboxGroup

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(value: any[]) => void` | 组内选中值变化时触发，参数为当前选中值数组。 |

---

## Examples

### 基础用法

单独使用 Checkbox，作为二态切换。

```tsx
import { Checkbox } from '@douyinfe/semi-ui';

const Demo = () => (
  <div style={{ display: 'flex', gap: 16 }}>
    <Checkbox defaultChecked>已选</Checkbox>
    <Checkbox>未选</Checkbox>
    <Checkbox disabled>禁用</Checkbox>
  </div>
);
```

### CheckboxGroup 快捷模式

通过 `options` 快速创建一组复选框。

```tsx
import { useState } from 'react';
import { CheckboxGroup } from '@douyinfe/semi-ui';

const Demo = () => {
  const [value, setValue] = useState(['beijing']);

  return (
    <CheckboxGroup
      options={[
        { label: '北京', value: 'beijing' },
        { label: '上海', value: 'shanghai' },
        { label: '广州', value: 'guangzhou' },
        { label: '深圳', value: 'shenzhen', disabled: true },
      ]}
      value={value}
      onChange={setValue}
    />
  );
};
```

### 全选 / 半选（indeterminate）

使用 `indeterminate` + `checked` 实现全选控制。

```tsx
import { useState } from 'react';
import { Checkbox, CheckboxGroup } from '@douyinfe/semi-ui';

const allOptions = ['A', 'B', 'C', 'D'];

const Demo = () => {
  const [value, setValue] = useState(['A', 'B']);

  const allChecked = value.length === allOptions.length;
  const indeterminate = value.length > 0 && !allChecked;

  const onCheckAll = (e) => {
    setValue(e.target.checked ? [...allOptions] : []);
  };

  return (
    <div>
      <Checkbox
        indeterminate={indeterminate}
        checked={allChecked}
        onChange={onCheckAll}
      >
        全选
      </Checkbox>
      <div style={{ marginTop: 8 }}>
        <CheckboxGroup options={allOptions} value={value} onChange={setValue} />
      </div>
    </div>
  );
};
```

### 垂直排列

设置 `direction='vertical'` 纵向排列选项。

```tsx
import { CheckboxGroup } from '@douyinfe/semi-ui';

const Demo = () => (
  <CheckboxGroup
    direction="vertical"
    defaultValue={['develop']}
    options={[
      { label: '开发', value: 'develop' },
      { label: '测试', value: 'test' },
      { label: '运维', value: 'ops' },
    ]}
  />
);
```

---

## Behavior

- **indeterminate**：
  - 仅控制视觉样式（半选对勾），不影响 `checked` 的实际值。
  - 点击半选状态的 Checkbox 会触发 `onChange`，由开发者决定切换逻辑。
- **disabled**：
  - 视觉置灰，鼠标样式为 `not-allowed`。
  - `onChange` 不会触发。
  - `CheckboxGroup` 的 `disabled` 会覆盖子项 `disabled`。
- **focus**：
  - 支持 Tab 聚焦，聚焦时显示 `:focus-visible` 外轮廓。
- **键盘**：
  - 聚焦状态下按 `Space` 切换选中。

---

## When to use

**适用**：

- 从多个选项中选择零到多个值（如兴趣标签、权限勾选）。
- 单个选项的二态确认（如"同意协议"）。
- 结合全选功能批量操作列表项。
- 表单中多选字段的收集。

**不适用**：

- **二态开关**（启用/禁用功能） → 用 `Switch`。
- **单选场景** → 用 `Radio` / `RadioGroup`。
- **从大量选项中选择** → 用 `Select` 的 `multiple` 模式。

---

## Accessibility

- **键盘**：Tab 聚焦，Space 切换选中状态。
- **焦点**：Focus Ring 清晰可见，disabled 状态跳过 Tab 序列。
- **ARIA**：
  - 自动设置 `role="checkbox"` 和 `aria-checked`。
  - 半选状态自动设置 `aria-checked="mixed"`。
  - CheckboxGroup 自动设置 `role="group"`。
  - 禁用项自动添加 `aria-disabled`。

---

## Related

- `CheckboxGroup`：管理一组 Checkbox 的选中状态，必须搭配使用。
- `Switch`：二态开关，用于"开启/关闭"语义场景，与 Checkbox 的"选中/未选中"区分。
- `Radio` / `RadioGroup`：单选场景使用，与 Checkbox 的多选互补。
- `Select`：选项较多时用下拉多选替代 CheckboxGroup。
- `Form.Checkbox` / `Form.CheckboxGroup`：在 Form 中使用时用 Form 封装版本，自动绑定表单状态。
