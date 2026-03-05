---
name: Select
import: "import { Select } from '@douyinfe/semi-ui';"
category: input
status: stable
since: 0.1.0
aliases: [选择器, Picker]
keywords: [select, dropdown, option, picker, 选择, 下拉]
tokens: [--semi-color-primary, --semi-color-bg-2, --semi-border-radius-small]
source: packages/semi-ui/select/index.tsx
---

# Select

用于从一组选项中选择一个或多个值，支持搜索、远程加载、自定义渲染等能力。

---

## 核心规则（AI 生成时必读）

- **统一导入**：必须 `import { Select } from '@douyinfe/semi-ui'`，子组件通过 `Select.Option` 访问
- **选项声明二选一**：用 `Select.Option` 子元素或 `optionList` prop 声明选项，禁止两种方式混用
- **远程搜索三件套**：远程搜索必须同时设置 `remote={true}` + `filter` + `onSearch`，缺一不可
- **受控配对**：受控模式下 `value` + `onChange` 必须同时提供，单独传 `value` 会导致选择无效
- **大数据量虚拟化**：选项超过 100 条时建议开启 `virtualize`，否则会导致渲染卡顿
- **多选标签收纳**：多选模式建议设置 `maxTagCount`，避免已选标签撑开布局

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| value | `string \| number \| string[] \| number[]` | | | 受控值，多选时为数组 |
| defaultValue | `string \| number \| string[] \| number[]` | | | 非受控默认值 |
| optionList | `Array<{label: ReactNode, value: string \| number, disabled?: boolean}>` | | | 选项列表，与 Select.Option 子元素二选一 |
| multiple | `boolean` | | `false` | 是否多选 |
| filter | `boolean \| (input: string, option: OptionProps) => boolean` | | `false` | 是否可搜索，可传自定义过滤函数 |
| remote | `boolean` | | `false` | 是否远程搜索，开启后不再本地过滤 |
| size | `'large' \| 'default' \| 'small'` | | `'default'` | 尺寸 |
| loading | `boolean` | | `false` | 加载状态，显示 Spin |
| disabled | `boolean` | | `false` | 是否禁用 |
| validateStatus | `'default' \| 'error' \| 'warning'` | | `'default'` | 校验状态 |
| placeholder | `string` | | | 占位文本 |
| emptyContent | `ReactNode` | | | 无匹配选项时的提示内容 |
| maxTagCount | `number` | | | 多选时最多展示的标签数，超出显示 +N |
| allowCreate | `boolean` | | `false` | 是否允许创建不在选项中的条目 |
| virtualize | `{height: number, width?: number, itemSize: number}` | | | 虚拟滚动配置 |
| showClear | `boolean` | | `false` | 是否显示清除按钮 |
| renderSelectedItem | `(option: OptionProps) => ReactNode` | | | 自定义已选项渲染 |
| renderOptionItem | `(option: OptionProps, state: {selected, focused, disabled}) => ReactNode` | | | 自定义下拉选项渲染 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(value: string \| number \| string[] \| number[]) => void` | 选中值变化时触发 |
| onSearch | `(input: string) => void` | 搜索输入变化时触发 |
| onSelect | `(value: string \| number, option: OptionProps) => void` | 选中某项时触发 |
| onDeselect | `(value: string \| number, option: OptionProps) => void` | 多选时取消选中某项触发 |
| onFocus | `(e: FocusEvent) => void` | 获得焦点时触发 |
| onBlur | `(e: FocusEvent) => void` | 失去焦点时触发 |
| onClear | `() => void` | 点击清除按钮时触发 |

---

## Examples

### 基础用法 — Option 子元素

使用 `Select.Option` 声明选项，最直观的写法。

```tsx
import { Select } from '@douyinfe/semi-ui';

const App = () => (
  <Select defaultValue="beijing" style={{ width: 200 }} placeholder="请选择城市">
    <Select.Option value="beijing">北京</Select.Option>
    <Select.Option value="shanghai">上海</Select.Option>
    <Select.Option value="guangzhou">广州</Select.Option>
    <Select.Option value="shenzhen">深圳</Select.Option>
  </Select>
);
```

### optionList 模式

选项通过数据驱动时使用 `optionList`，适合动态数据场景。

```tsx
import { Select } from '@douyinfe/semi-ui';

const options = [
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '广州', value: 'guangzhou' },
  { label: '深圳', value: 'shenzhen' },
];

const App = () => (
  <Select
    optionList={options}
    defaultValue="shanghai"
    style={{ width: 200 }}
    placeholder="请选择城市"
  />
);
```

### 多选

开启 `multiple`，搭配 `maxTagCount` 收纳标签。

```tsx
import { Select } from '@douyinfe/semi-ui';

const options = [
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '广州', value: 'guangzhou' },
  { label: '深圳', value: 'shenzhen' },
  { label: '杭州', value: 'hangzhou' },
];

const App = () => (
  <Select
    multiple
    maxTagCount={2}
    optionList={options}
    defaultValue={['beijing', 'shanghai']}
    style={{ width: 320 }}
    placeholder="请选择城市"
  />
);
```

### 搜索过滤

设置 `filter` 开启本地搜索过滤。

```tsx
import { Select } from '@douyinfe/semi-ui';

const options = [
  { label: '北京', value: 'beijing' },
  { label: '上海', value: 'shanghai' },
  { label: '广州', value: 'guangzhou' },
  { label: '深圳', value: 'shenzhen' },
];

const App = () => (
  <Select
    filter
    optionList={options}
    style={{ width: 200 }}
    placeholder="搜索城市"
  />
);
```

### 远程搜索

远程搜索需同时设置 `remote`、`filter` 和 `onSearch`。

```tsx
import { useState } from 'react';
import { Select } from '@douyinfe/semi-ui';

const App = () => {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = (input) => {
    setLoading(true);
    fetchOptions(input).then((result) => {
      setOptions(result);
      setLoading(false);
    });
  };

  return (
    <Select
      remote
      filter
      loading={loading}
      optionList={options}
      onSearch={handleSearch}
      style={{ width: 200 }}
      placeholder="输入关键词搜索"
    />
  );
};
```

---

## Behavior

- **下拉展开**：点击触发器或获得焦点时展开下拉面板，点击外部区域或按 Esc 关闭
- **搜索过滤**：开启 `filter` 后输入文字实时过滤选项，开启 `remote` 后不做本地过滤而是触发 `onSearch`
- **多选**：开启 `multiple` 后已选项以标签形式展示在输入框内，点击标签上的关闭图标可取消选中
- **标签折叠**：设置 `maxTagCount` 后，超出数量的标签折叠为 "+N" 标记
- **创建选项**：开启 `allowCreate` 后，输入框中的文字若无匹配项则显示"创建"选项
- **虚拟滚动**：传入 `virtualize` 配置后，仅渲染可视区域内的选项 DOM
- **清除**：开启 `showClear` 后，有选中值时触发器右侧出现清除图标
- **键盘**：支持 ↑/↓ 方向键导航选项，Enter 选中，Esc 关闭下拉

---

## When to use

**适用**：

- 从超过 5 个预定义选项中选择一个或多个值
- 需要搜索过滤的选项列表
- 远程加载的动态选项

**不适用**：

- 选项不超过 5 个且无需搜索 → 用 `RadioGroup` 或 `CheckboxGroup`
- 选择日期/时间 → 用 `DatePicker` / `TimePicker`
- 级联选择 → 用 `Cascader`
- 自由输入文本且带建议 → 用 `AutoComplete`

---

## Accessibility

- **键盘**：Tab 聚焦触发器，Enter / Space 展开下拉，↑ / ↓ 导航选项，Enter 选中，Esc 关闭
- **焦点**：触发器和选项均有可见的 focus 样式
- **ARIA**：触发器具有 `role="combobox"`、`aria-expanded`、`aria-haspopup="listbox"`；选项列表具有 `role="listbox"`，各选项具有 `role="option"` 和 `aria-selected`

---

## Related

- `AutoComplete`：自由输入文本 + 联想建议，Select 用于从固定选项列表中选择
- `Cascader`：多级联动选择场景
- `TreeSelect`：选项带层级结构时使用
- `RadioGroup` / `CheckboxGroup`：选项少（≤5）且需要全部可见时使用
