---
name: Select
import: "import { Select } from '@my-design/react';"
category: form
status: stable
since: 1.1.0
aliases: [下拉选择, 选择器, Dropdown]
keywords: [选择, 下拉, 多选, 搜索, option, 筛选, filter]
figma: "figma://file/xxx/select"
tokens: [--md-color-primary, --md-color-border, --md-radius-sm, --md-spacing-sm]
source: "src/components/Select/index.tsx"
---

# Select

下拉选择器，从预定义的选项列表中选择一个或多个值。

---

## 核心规则（AI 生成时必读）

- **options 必传**：必须通过 `options` 传入选项数组，不支持 children 写法。
- **受控优先**：表单场景必须使用受控模式（`value` + `onChange`），避免状态不同步。
- **多选标签溢出**：多选场景必须设置 `maxTagCount`，防止选项过多撑爆布局。
- **搜索防抖**：`searchable` 配合远程搜索时，业务层必须自行做防抖（300ms 推荐）。
- **禁用项提示**：`disabled` 的选项应通过 Tooltip 说明禁用原因。
- **空状态**：无匹配项时组件自动显示"无匹配项"，无需额外处理。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string \| number \| (string \| number)[]` | | | 受控值 |
| defaultValue | `string \| number \| (string \| number)[]` | | | 默认值（非受控） |
| options | `SelectOption[]` | ✅ | `[]` | 选项列表 |
| placeholder | `string` | | `'请选择'` | 占位文字 |
| disabled | `boolean` | | `false` | 禁用状态 |
| multiple | `boolean` | | `false` | 是否多选 |
| allowClear | `boolean` | | `false` | 是否显示清除按钮 |
| searchable | `boolean` | | `false` | 是否可搜索 |
| size | `'small' \| 'medium' \| 'large'` | | `'medium'` | 尺寸 |
| maxTagCount | `number` | | | 多选时最多显示的标签数 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(value, option) => void` | 选中值变化时触发 |
| onSearch | `(keyword: string) => void` | 搜索输入变化时触发 |
| onFocus | `(e: FocusEvent) => void` | 获得焦点时触发 |
| onBlur | `(e: FocusEvent) => void` | 失去焦点时触发 |

---

## Examples

### 基础用法

单选下拉，最常见的使用方式。

```tsx
import { useState } from 'react';
import { Select } from '@my-design/react';

const options = [
  { label: '选项一', value: 1 },
  { label: '选项二', value: 2 },
  { label: '选项三', value: 3 },
];

const Demo = () => {
  const [value, setValue] = useState(undefined);
  return (
    <Select
      options={options}
      value={value}
      onChange={(val) => setValue(val)}
      placeholder="请选择"
    />
  );
};
```

### 多选 + 标签限制

多选场景用 `maxTagCount` 控制标签数量。

```tsx
import { useState } from 'react';
import { Select } from '@my-design/react';

const options = [
  { label: '北京', value: 'bj' },
  { label: '上海', value: 'sh' },
  { label: '广州', value: 'gz' },
  { label: '深圳', value: 'sz' },
  { label: '杭州', value: 'hz' },
];

const Demo = () => {
  const [value, setValue] = useState([]);
  return (
    <Select
      options={options}
      value={value}
      onChange={(val) => setValue(val)}
      multiple
      maxTagCount={2}
      placeholder="请选择城市"
    />
  );
};
```

### 可搜索

`searchable` 开启搜索过滤。

```tsx
import { Select } from '@my-design/react';

const options = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Angular', value: 'angular' },
  { label: 'Svelte', value: 'svelte' },
];

const Demo = () => (
  <Select options={options} searchable placeholder="搜索框架" />
);
```

### 禁用选项

部分选项不可选时，设置 `disabled: true`。

```tsx
import { Select } from '@my-design/react';

const options = [
  { label: '可选项', value: 1 },
  { label: '不可选（权限不足）', value: 2, disabled: true },
  { label: '可选项', value: 3 },
];

const Demo = () => <Select options={options} placeholder="请选择" />;
```

---

## Behavior

- **展开/收起**：点击选择器展开下拉，点击外部区域自动收起。
- **单选**：选中后立即收起下拉，显示选中项文本。
- **多选**：选中后不收起，以标签形式展示已选项，超出 `maxTagCount` 显示 `+N`。
- **搜索**：展开时输入框自动聚焦，实时过滤选项，无匹配显示"无匹配项"。
- **清除**：`allowClear` 时，hover 显示清除按钮，点击清空已选值。
- **键盘**：Tab 聚焦选择器，Enter/Space 展开，上下箭头导航选项。

---

## When to use

**适用**：

- 从 5 个以上预定义选项中选择。
- 表单中的枚举字段（状态、类型、地区等）。
- 需要搜索过滤的长列表选择。

**不适用**：

- **2-4 个选项** → 用 `Radio`（单选）或 `Checkbox`（多选），更直观。
- **树形层级选择** → 用 `TreeSelect` 或 `Cascader`。
- **自由输入 + 建议** → 用 `AutoComplete`。

---

## Accessibility

- **键盘**：Tab 聚焦，Enter/Space 展开，上下箭头导航，Enter 选中，ESC 收起。
- **焦点**：选择器有清晰的 focus 样式，下拉展开时焦点在搜索框或选项上。
- **ARIA**：`role="combobox"`、`aria-expanded`、`aria-haspopup="listbox"`，选项 `role="option"`、`aria-selected`。

---

## Related

- `Input`：自由文本输入用 Input，固定选项用 Select；需要输入+建议时用 AutoComplete。
- `Button`：表单中 Select 与 Button 搭配使用，Select 选定后由 Button 提交。
- `Tooltip`：Select 中 disabled 选项建议配合 Tooltip 说明禁用原因。
- `Modal`：Modal 内使用 Select 时，注意将下拉浮层挂载到 Modal 容器内以避免层级问题。
