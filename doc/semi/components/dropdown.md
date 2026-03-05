---
name: Dropdown
import: "import { Dropdown } from '@douyinfe/semi-ui';"
category: show
status: stable
since: 0.1.0
aliases: [下拉菜单, DropdownMenu]
keywords: [dropdown, menu, action, context, 下拉, 菜单, 操作]
tokens: [--semi-color-bg-0, --semi-color-text-0, --semi-shadow-elevated]
source: packages/semi-ui/dropdown/index.tsx
---

# Dropdown

下拉菜单组件，向下弹出操作列表。用于收敛多个操作项，在触发元素附近展示一组命令或选项。

---

## 核心规则（AI 生成时必读）

- **导入路径**：必须 `import { Dropdown } from '@douyinfe/semi-ui'`，禁止从子路径导入。
- **菜单结构**：菜单内容必须通过 `render` prop 返回 `Dropdown.Menu > Dropdown.Item` 结构，禁止直接传入任意 JSX。
- **触发元素**：`children` 必须是单个可接受 `ref` 的 React 元素，不能是字符串或 Fragment。
- **危险操作**：删除/不可逆操作项必须用 `type='danger'`，视觉上醒目警示。
- **分组结构**：菜单内分组用 `Dropdown.Title` 标题 + `Dropdown.Divider` 分割线，保持信息层级清晰。
- **受控模式**：需要控制显隐时用 `visible` + `onVisibleChange` 配对，避免仅设 `visible` 导致无法关闭。

---

## Props

### Dropdown

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| render | `ReactNode` | ✅ | | 弹出层渲染内容，使用 `Dropdown.Menu` 包裹 |
| trigger | `'hover' \| 'click' \| 'custom'` | | `'hover'` | 触发方式 |
| position | `'top' \| 'topLeft' \| 'topRight' \| 'left' \| 'leftTop' \| 'leftBottom' \| 'right' \| 'rightTop' \| 'rightBottom' \| 'bottom' \| 'bottomLeft' \| 'bottomRight'` | | `'bottomLeft'` | 弹出位置，支持 12 方向 |
| visible | `boolean` | | | 是否显示（受控） |
| clickToHide | `boolean` | | `true` | 点击菜单项后是否自动收起 |
| showTick | `boolean` | | `false` | 是否在激活项前显示勾选图标 |
| closeOnEsc | `boolean` | | `true` | 按 Esc 键关闭 |
| spacing | `number` | | `4` | 弹出层与触发元素的间距（px） |
| zIndex | `number` | | `1050` | 弹出层 z-index |
| getPopupContainer | `() => HTMLElement` | | `() => document.body` | 指定弹出层挂载的容器 |
| mouseEnterDelay | `number` | | `50` | hover 触发延迟（ms） |
| mouseLeaveDelay | `number` | | `50` | hover 关闭延迟（ms） |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

### Dropdown.Item

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| disabled | `boolean` | | `false` | 禁用状态 |
| type | `'primary' \| 'secondary' \| 'tertiary' \| 'warning' \| 'danger'` | | `'tertiary'` | 菜单项类型，影响文字颜色 |
| active | `boolean` | | `false` | 激活状态，配合 `showTick` 显示勾选 |
| icon | `ReactNode` | | | 菜单项前置图标 |
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

### Dropdown.Menu

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

### Dropdown.Title

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| className | `string` | | | 自定义类名 |
| style | `CSSProperties` | | | 自定义内联样式 |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onVisibleChange | `(visible: boolean) => void` | 弹出层显隐变化时触发 |
| Dropdown.Item onClick | `(e: MouseEvent) => void` | 点击菜单项时触发，disabled 状态不触发 |

---

## Examples

### 基础用法

hover 触发的下拉菜单，菜单内容通过 `render` 传入。

```tsx
import { Dropdown, Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <Dropdown
    render={
      <Dropdown.Menu>
        <Dropdown.Item>编辑</Dropdown.Item>
        <Dropdown.Item>复制链接</Dropdown.Item>
        <Dropdown.Item>移动到</Dropdown.Item>
      </Dropdown.Menu>
    }
  >
    <Button>悬停展开</Button>
  </Dropdown>
);
```

### 点击触发

`trigger='click'` 改为点击触发，适合需要明确意图的场景。

```tsx
import { Dropdown, Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <Dropdown
    trigger="click"
    render={
      <Dropdown.Menu>
        <Dropdown.Item>新建文档</Dropdown.Item>
        <Dropdown.Item>新建表格</Dropdown.Item>
        <Dropdown.Item>导入文件</Dropdown.Item>
      </Dropdown.Menu>
    }
  >
    <Button type="primary" theme="solid">新建</Button>
  </Dropdown>
);
```

### 分组与分割线

`Dropdown.Title` 标记分组，`Dropdown.Divider` 添加分割线，`type='danger'` 标记危险操作。

```tsx
import { Dropdown, Button } from '@douyinfe/semi-ui';
import { IconEdit, IconCopy, IconDelete } from '@douyinfe/semi-icons';

const Demo = () => (
  <Dropdown
    trigger="click"
    render={
      <Dropdown.Menu>
        <Dropdown.Title>编辑操作</Dropdown.Title>
        <Dropdown.Item icon={<IconEdit />}>编辑</Dropdown.Item>
        <Dropdown.Item icon={<IconCopy />}>复制</Dropdown.Item>
        <Dropdown.Divider />
        <Dropdown.Title>危险操作</Dropdown.Title>
        <Dropdown.Item type="danger" icon={<IconDelete />}>删除</Dropdown.Item>
      </Dropdown.Menu>
    }
  >
    <Button>更多操作</Button>
  </Dropdown>
);
```

### 受控模式

通过 `visible` + `onVisibleChange` 控制显隐，可在菜单项点击后执行逻辑再关闭。

```tsx
import { useState } from 'react';
import { Dropdown, Button } from '@douyinfe/semi-ui';

const Demo = () => {
  const [visible, setVisible] = useState(false);

  const handleSelect = (action: string) => {
    console.log('选中操作:', action);
    setVisible(false);
  };

  return (
    <Dropdown
      visible={visible}
      onVisibleChange={setVisible}
      trigger="click"
      clickToHide={false}
      render={
        <Dropdown.Menu>
          <Dropdown.Item onClick={() => handleSelect('export-pdf')}>导出 PDF</Dropdown.Item>
          <Dropdown.Item onClick={() => handleSelect('export-png')}>导出 PNG</Dropdown.Item>
          <Dropdown.Item onClick={() => handleSelect('export-svg')}>导出 SVG</Dropdown.Item>
        </Dropdown.Menu>
      }
    >
      <Button>导出</Button>
    </Dropdown>
  );
};
```

### showTick 勾选状态

`showTick` 配合 `active` 显示当前激活项。

```tsx
import { Dropdown, Button } from '@douyinfe/semi-ui';

const Demo = () => (
  <Dropdown
    showTick
    trigger="click"
    render={
      <Dropdown.Menu>
        <Dropdown.Item active>按名称排序</Dropdown.Item>
        <Dropdown.Item>按日期排序</Dropdown.Item>
        <Dropdown.Item>按大小排序</Dropdown.Item>
      </Dropdown.Menu>
    }
  >
    <Button>排序方式</Button>
  </Dropdown>
);
```

---

## Behavior

- **hover 触发**：鼠标移入触发元素后延迟 `mouseEnterDelay` ms 展开，移出弹出层 + 触发元素后延迟 `mouseLeaveDelay` ms 收起。鼠标在触发元素和弹出层之间移动不会收起。
- **click 触发**：点击触发元素切换显隐。`clickToHide=true` 时点击菜单项自动收起。
- **custom 触发**：完全受控，需手动管理 `visible`。
- **定位**：弹出层自动跟随触发元素定位，空间不足时自动翻转方向。
- **关闭**：
  - 点击菜单外部区域自动关闭。
  - `closeOnEsc=true` 时按 Esc 关闭。
  - `clickToHide=true` 时点击菜单项关闭。
- **键盘**：
  - Tab/Shift+Tab 在菜单项间导航。
  - Enter/Space 选中当前聚焦项。
  - Esc 关闭菜单并将焦点返回触发元素。

---

## When to use

**适用**：

- 操作项较多（>3 个），需要收敛到"更多"菜单。
- 列表/卡片上的行操作菜单。
- 工具栏的折叠操作。
- 状态切换/排序方式选择（配合 `showTick`）。

**不适用**：

- **表单选择** → 用 `Select`（支持搜索、多选、标签）。
- **右键菜单** → Semi 未提供原生右键菜单，需自行基于 `trigger='custom'` 封装。
- **导航菜单** → 用 `Nav` 组件。
- **仅 1-2 个操作** → 直接用 `Button` 展示，不需要收敛。

---

## Accessibility

- **键盘**：Esc 关闭并聚焦回触发元素，方向键/Tab 在菜单项间导航，Enter/Space 选中。
- **焦点**：弹出后焦点自动移入菜单，关闭后焦点返回触发元素。
- **ARIA**：
  - 触发元素自动添加 `aria-haspopup="true"` 和 `aria-expanded`。
  - 菜单渲染为 `role="menu"`，菜单项为 `role="menuitem"`。
  - 禁用项添加 `aria-disabled="true"`。

---

## Related

- `Button`：常作为 Dropdown 的触发元素，配合使用收敛多个操作。
- `Select`：表单场景的选择控件，支持搜索、多选、远程加载。
- `Tooltip`：仅展示提示信息时用 Tooltip，有交互操作用 Dropdown。
- `Popover`：需要展示复杂自定义内容（非纯菜单列表）时用 Popover。
- `Nav`：导航菜单场景使用，支持多层级和侧栏模式。
