---
name: Table
import: "import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';"
install: "npx shadcn@latest add table"
category: data
status: stable
since: 0.1.0
aliases: [表格, DataTable, 数据表]
keywords: [表格, 数据, 列表, 排序, 分页, table, data, list, grid]
dependencies: []
tokens: [--border, --muted, --muted-foreground]
source: "components/ui/table.tsx"
---

# Table

表格组件，用于展示结构化数据。基于原生 `<table>` 元素封装样式，可配合 TanStack Table 实现排序、筛选、分页等高级功能。

---

## 核心规则（AI 生成时必读）

- **组合结构**：**必须**使用 `Table` → `TableHeader`（含 `TableRow` → `TableHead`）+ `TableBody`（含 `TableRow` → `TableCell`）的标准 HTML 表格结构。
- **表头必填**：**必须**有 `TableHeader`，每列**必须**用 `TableHead` 而非 `TableCell`。
- **响应式处理**：窄屏时**建议**用 `<div className="overflow-x-auto">` 包裹 Table，允许横向滚动，或在移动端切换为 Card 列表视图。
- **空状态**：数据为空时**必须**显示空状态提示（在 TableBody 中放一个跨列的 TableRow）。
- **对齐规则**：数字/金额列**建议** `className="text-right"` 右对齐，文本列左对齐。
- **大量数据**：数据量大时**必须**配合分页，**禁止**一次性渲染超过 100 行。

---

## 子组件结构

| 子组件 | 说明 | 必须 |
|--------|------|:----:|
| Table | 根容器（`<table>`） | ✅ |
| TableHeader | 表头容器（`<thead>`） | ✅ |
| TableBody | 表体容器（`<tbody>`） | ✅ |
| TableFooter | 表尾容器（`<tfoot>`） | 可选 |
| TableRow | 行（`<tr>`） | ✅ |
| TableHead | 表头单元格（`<th>`） | ✅ |
| TableCell | 表体单元格（`<td>`） | ✅ |
| TableCaption | 表格标题（`<caption>`） | 可选 |

---

## Props

Table 及其子组件均为纯样式组件，接收对应 HTML 元素的标准属性：

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| className | `string` | | | 自定义类名 |
| children | `ReactNode` | | | 子内容 |

---

## Examples

### 基础用法

```tsx
import {
  Table, TableBody, TableCaption, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const invoices = [
  { id: "INV001", status: "已付款", method: "信用卡", amount: "¥250.00" },
  { id: "INV002", status: "待付款", method: "支付宝", amount: "¥150.00" },
  { id: "INV003", status: "已付款", method: "微信", amount: "¥350.00" },
];

const Demo = () => (
  <Table>
    <TableCaption>最近的发票记录</TableCaption>
    <TableHeader>
      <TableRow>
        <TableHead className="w-[100px]">发票号</TableHead>
        <TableHead>状态</TableHead>
        <TableHead>付款方式</TableHead>
        <TableHead className="text-right">金额</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {invoices.map((inv) => (
        <TableRow key={inv.id}>
          <TableCell className="font-medium">{inv.id}</TableCell>
          <TableCell>{inv.status}</TableCell>
          <TableCell>{inv.method}</TableCell>
          <TableCell className="text-right">{inv.amount}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);
```

### 带汇总行

使用 TableFooter 展示汇总信息。

```tsx
import {
  Table, TableBody, TableCell, TableFooter,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const data = [
  { name: "基础套餐", quantity: 10, price: "¥990" },
  { name: "高级套餐", quantity: 5, price: "¥2,495" },
];

const Demo = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>套餐名称</TableHead>
        <TableHead className="text-right">数量</TableHead>
        <TableHead className="text-right">金额</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {data.map((item) => (
        <TableRow key={item.name}>
          <TableCell>{item.name}</TableCell>
          <TableCell className="text-right">{item.quantity}</TableCell>
          <TableCell className="text-right">{item.price}</TableCell>
        </TableRow>
      ))}
    </TableBody>
    <TableFooter>
      <TableRow>
        <TableCell colSpan={2}>合计</TableCell>
        <TableCell className="text-right">¥3,485</TableCell>
      </TableRow>
    </TableFooter>
  </Table>
);
```

### 空状态

```tsx
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const Demo = () => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>名称</TableHead>
        <TableHead>状态</TableHead>
        <TableHead className="text-right">金额</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      <TableRow>
        <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
          暂无数据
        </TableCell>
      </TableRow>
    </TableBody>
  </Table>
);
```

---

## Behavior

- **纯展示**：Table 是纯样式组件，不内置排序、筛选、分页逻辑。
- **悬停高亮**：TableRow 默认有 hover 背景色变化。
- **斑马纹**：偶数行有微弱的背景色区分（通过 CSS 实现）。
- **响应式**：窄屏时需手动添加横向滚动容器。

---

## When to use

**适用**：

- 展示结构化的多列数据（订单、用户列表、配置项等）。
- 需要对比多行数据。
- 数据有明确的列标题。

**不适用**：

- **卡片式展示** → 用 Card 列表。
- **简单的键值对** → 用描述列表（`<dl>`）。
- **复杂的交互式数据表** → 用 TanStack Table + DataTable 模式。

---

## Accessibility

- **语义**：使用原生 `<table>` / `<thead>` / `<th>` / `<td>` 元素，天然支持屏幕阅读器。
- **Caption**：建议使用 `TableCaption` 为表格提供摘要。
- **scope**：TableHead 自动设置 `scope="col"`。

---

## Related

- `Card`：Table 常放在 Card 内作为容器。
- `Button`：Table 行操作列常用 Button 或 DropdownMenu。
- `DropdownMenu`：表格行的"更多操作"菜单。
- `Pagination`：数据量大时配合分页组件。
