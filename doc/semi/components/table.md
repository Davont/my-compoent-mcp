---
name: Table
import: "import { Table } from '@douyinfe/semi-ui';"
category: show
status: stable
since: 0.1.0
aliases: [表格, DataTable]
keywords: [table, grid, data, list, sort, filter, 表格, 数据, 排序]
tokens: [--semi-color-bg-0, --semi-color-border, --semi-color-fill-0]
source: packages/semi-ui/table/index.tsx
---

# Table

表格组件，用于展示结构化的行列数据。支持排序、筛选、分页、行选择、展开行、固定列/表头、虚拟滚动等能力。

---

## 核心规则（AI 生成时必读）

- **统一导入**：必须 `import { Table } from '@douyinfe/semi-ui'`，禁止从子路径导入。
- **columns 外置**：`columns` 和 `dataSource` 必须在组件外部或 useMemo 中定义，禁止内联在 JSX 中，避免每次渲染生成新数组导致性能问题。
- **行唯一 key**：每行数据必须有唯一标识，通过 `rowKey` 指定字段名（默认读取 `key` 字段），缺失会导致选择、展开等功能异常。
- **大数据量虚拟化**：数据超过 1000 行时建议开启 `virtualized`，否则渲染性能会显著下降。
- **固定列必设宽度**：使用 `fixed: 'left'` / `fixed: 'right'` 时，该 column 必须设置 `width`，否则布局异常。
- **后端分页模式**：后端分页/排序/筛选时，`pagination` 必须设置 `total`，并通过 `onChange` 回调配合请求。

---

## Props

### Table

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| columns | `Column[]` | ✅ | | 列配置数组 |
| dataSource | `any[]` | ✅ | | 数据数组 |
| rowKey | `string \| ((record) => string)` | | `'key'` | 行唯一标识字段名或取值函数 |
| pagination | `false \| PaginationProps` | | | 分页配置，传 false 关闭分页 |
| rowSelection | `RowSelection` | | | 行选择配置 |
| expandedRowRender | `(record, index, expanded) => ReactNode` | | | 展开行渲染函数 |
| scroll | `{ x?: number \| string, y?: number \| string }` | | | 滚动区域设置，x 横向滚动 / y 固定表头 |
| loading | `boolean` | | `false` | 加载状态 |
| empty | `ReactNode` | | 内置空状态 | 数据为空时的展示内容 |
| size | `'default' \| 'small' \| 'middle'` | | `'default'` | 表格尺寸 |
| bordered | `boolean` | | `false` | 是否显示边框 |
| resizable | `boolean \| object` | | `false` | 是否可拖拽调整列宽 |
| virtualized | `boolean` | | `false` | 是否开启虚拟滚动 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义样式 |

### Column

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| title | `ReactNode` | ✅ | | 列标题 |
| dataIndex | `string` | ✅ | | 数据字段名 |
| key | `string` | | 同 dataIndex | 列唯一标识 |
| render | `(text, record, index) => ReactNode` | | | 自定义渲染函数 |
| width | `number \| string` | | | 列宽度（固定列时必填） |
| sorter | `((a, b) => number) \| boolean` | | | 排序函数，传 true 表示后端排序 |
| filters | `Array<{ text: string, value: any }>` | | | 筛选菜单项 |
| onFilter | `(value, record) => boolean` | | | 前端筛选函数 |
| fixed | `'left' \| 'right' \| boolean` | | | 固定列方向 |
| align | `'left' \| 'center' \| 'right'` | | `'left'` | 对齐方式 |
| ellipsis | `boolean \| { showTitle: boolean }` | | `false` | 超长文本省略 |

### RowSelection

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| selectedRowKeys | `Array<string \| number>` | | | 当前选中行 key 数组（受控） |
| onChange | `(selectedRowKeys, selectedRows) => void` | | | 选中变化回调 |
| type | `'checkbox' \| 'radio'` | | `'checkbox'` | 选择类型 |
| disabled | `boolean` | | `false` | 禁用所有行选择 |
| getCheckboxProps | `(record) => object` | | | 自定义每行选择框属性 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onChange | `(pagination, filters, sorter, extra) => void` | 分页、排序、筛选变化时触发 |
| onRow | `(record, index) => HTMLAttributes` | 行级事件绑定（onClick、onMouseEnter 等） |
| onHeaderRow | `(columns, index) => HTMLAttributes` | 表头行事件绑定 |
| onExpandedRowsChange | `(expandedRowKeys) => void` | 展开行变化回调 |

---

## Examples

### 基础用法

最简单的表格，定义 columns 和 dataSource。

```tsx
import { Table } from '@douyinfe/semi-ui';

const columns = [
  { title: '姓名', dataIndex: 'name', key: 'name' },
  { title: '年龄', dataIndex: 'age', key: 'age' },
  { title: '地址', dataIndex: 'address', key: 'address' },
];

const dataSource = [
  { key: '1', name: '张三', age: 28, address: '北京市海淀区' },
  { key: '2', name: '李四', age: 32, address: '上海市浦东新区' },
  { key: '3', name: '王五', age: 25, address: '杭州市西湖区' },
];

const Demo = () => <Table columns={columns} dataSource={dataSource} pagination={false} />;
```

### 排序 + 筛选

列级排序使用 `sorter`，筛选使用 `filters` + `onFilter`。

```tsx
import { Table } from '@douyinfe/semi-ui';

const columns = [
  {
    title: '姓名',
    dataIndex: 'name',
    filters: [
      { text: '姓张', value: '张' },
      { text: '姓李', value: '李' },
    ],
    onFilter: (value, record) => record.name.startsWith(value),
  },
  {
    title: '年龄',
    dataIndex: 'age',
    sorter: (a, b) => a.age - b.age,
  },
  {
    title: '地址',
    dataIndex: 'address',
  },
];

const dataSource = [
  { key: '1', name: '张三', age: 28, address: '北京市海淀区' },
  { key: '2', name: '李四', age: 32, address: '上海市浦东新区' },
  { key: '3', name: '张伟', age: 25, address: '杭州市西湖区' },
];

const Demo = () => <Table columns={columns} dataSource={dataSource} />;
```

### 行选择

通过 `rowSelection` 启用多选/单选能力。

```tsx
import { useState } from 'react';
import { Table } from '@douyinfe/semi-ui';

const columns = [
  { title: '姓名', dataIndex: 'name' },
  { title: '年龄', dataIndex: 'age' },
];

const dataSource = [
  { key: '1', name: '张三', age: 28 },
  { key: '2', name: '李四', age: 32 },
  { key: '3', name: '王五', age: 25 },
];

const Demo = () => {
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys, rows) => {
      setSelectedRowKeys(keys);
      console.log('选中行：', rows);
    },
  };

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      rowSelection={rowSelection}
      pagination={false}
    />
  );
};
```

### 固定表头 + 固定列

大量数据场景下固定表头（scroll.y）和首尾列（fixed），固定列必须设置 width。

```tsx
import { Table } from '@douyinfe/semi-ui';

const columns = [
  { title: '姓名', dataIndex: 'name', fixed: 'left', width: 120 },
  { title: '年龄', dataIndex: 'age', width: 100 },
  { title: '地址', dataIndex: 'address', width: 300 },
  { title: '电话', dataIndex: 'phone', width: 200 },
  { title: '邮箱', dataIndex: 'email', width: 250 },
  {
    title: '操作',
    dataIndex: 'action',
    fixed: 'right',
    width: 100,
    render: () => <a>编辑</a>,
  },
];

const dataSource = Array.from({ length: 50 }, (_, i) => ({
  key: String(i),
  name: `用户${i}`,
  age: 20 + (i % 30),
  address: `地址${i}`,
  phone: `138000000${String(i).padStart(2, '0')}`,
  email: `user${i}@example.com`,
}));

const Demo = () => (
  <Table
    columns={columns}
    dataSource={dataSource}
    scroll={{ x: 1200, y: 400 }}
    pagination={false}
  />
);
```

### 展开行

通过 `expandedRowRender` 在行下方展示详情。

```tsx
import { Table } from '@douyinfe/semi-ui';

const columns = [
  { title: '订单号', dataIndex: 'orderId' },
  { title: '金额', dataIndex: 'amount' },
  { title: '状态', dataIndex: 'status' },
];

const dataSource = [
  { key: '1', orderId: 'ORD-001', amount: '¥128.00', status: '已完成', detail: '购买了 3 件商品' },
  { key: '2', orderId: 'ORD-002', amount: '¥256.00', status: '配送中', detail: '购买了 1 件商品' },
];

const Demo = () => (
  <Table
    columns={columns}
    dataSource={dataSource}
    expandedRowRender={(record) => <p style={{ margin: 0 }}>{record.detail}</p>}
    pagination={false}
  />
);
```

---

## Behavior

- **排序**：
  - 点击列头触发排序，循环切换升序 → 降序 → 取消排序。
  - `sorter` 为函数时前端排序；为 `true` 时需配合 `onChange` 做后端排序。
- **筛选**：
  - 点击列头筛选图标打开筛选下拉面板。
  - `onFilter` 存在时前端筛选；不存在时需配合 `onChange` 做后端筛选。
- **分页**：
  - 默认每页 10 条，可通过 `pagination` 自定义 pageSize、total 等。
  - 传 `pagination={false}` 关闭分页，展示全部数据。
- **行选择**：
  - `checkbox` 类型支持全选/取消全选，跨页选择需业务层自行维护。
  - `radio` 类型一次只能选中一行。
- **展开行**：
  - 点击展开图标在当前行下方插入展开区域。
  - 同一时间可展开多行。
- **固定列**：
  - 固定列通过 `position: sticky` 实现，横向滚动时固定列保持可见。
  - 固定列之间有阴影分隔线。
- **虚拟滚动**：
  - 开启 `virtualized` 后只渲染可视区域内的行，大幅提升大数据量渲染性能。
  - 虚拟滚动需要设置 `scroll.y` 以确定容器高度。
- **loading**：
  - 设置 `loading={true}` 时表格覆盖半透明遮罩和 Spin 组件。
  - 数据操作期间建议开启 loading 防止误操作。

---

## When to use

**适用**：

- 展示结构化的行列数据（用户列表、订单列表、日志等）。
- 需要排序、筛选、分页的数据展示场景。
- 需要行选择做批量操作的场景。

**不适用**：

- 简单的键值对展示 → 用 `Descriptions`。
- 非结构化内容列表 → 用 `List`。
- 仅需展示少量数据（<5 条）且无需排序/筛选 → 直接用 HTML 表格或 `Descriptions`。
- 复杂可编辑表格 → 配合 `Form` 组件或考虑专用 EditableTable 方案。

---

## Accessibility

- **键盘**：Tab 在可交互元素间跳转（排序按钮、筛选按钮、分页控件、选择框），Enter/Space 触发操作。
- **焦点**：排序和筛选列头可聚焦，聚焦时有可见焦点环。
- **ARIA**：
  - 表格容器设置 `role="table"`。
  - 可排序列头添加 `aria-sort="ascending"` / `"descending"` / `"none"`。
  - 行选择的 checkbox 包含合适的 `aria-label`。
  - loading 状态设置 `aria-busy="true"`。
- **屏幕阅读器**：列头文本作为每列的语义标签，render 中的纯图标元素需提供文字说明。

---

## Related

- `Pagination`：Table 内置分页，也可单独使用 Pagination 做自定义分页布局。
- `Form`：表格内编辑场景需配合 Form 管理编辑状态。
- `Select` / `Input`：常用于表格上方的筛选区域。
- `Button`：表格操作列中的操作按钮。
- `Popconfirm`：操作列中的删除等危险操作需配合 Popconfirm 做二次确认。
- `Empty`：自定义空状态展示。
- `Spin`：Table 内置 loading 基于 Spin 实现。
