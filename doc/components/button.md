---
name: Button
import: "import { Button } from '@my-design/react';"
category: form
status: stable
since: 1.0.0
aliases: [Btn, 按钮]
keywords: [提交, 保存, 确认, 取消, 删除, primary, loading, icon]
figma: "figma://file/xxx/button"
tokens: [--md-color-primary, --md-color-danger, --md-radius-sm, --md-spacing-sm]
source: "src/components/Button/index.tsx"
---

# Button

触发操作的基础组件，用于提交表单、确认操作、触发流程等场景。

---

## 核心规则（AI 生成时必读）

- **Primary 数量**：同一视图（页面/对话框）**最多 1 个** Primary 按钮。
- **危险操作**：删除/清空/不可逆操作**必须**用 `danger`，且**必须**配合二次确认（Popconfirm/Modal）。
- **表单按钮**：表单内的非提交按钮（如“取消”）**必须**设置 `htmlType="button"`，避免误触发 submit。
- **仅图标按钮**：**必须**提供 `aria-label`，内容应与操作语义一致（如“搜索”、“关闭”）。
- **加载状态**：异步操作**必须**用 `loading` 状态防止重复提交。
- **禁止硬编码**：颜色/间距/圆角**必须**使用 token，禁止写 `8px` / `#1890ff`。

---

## Props

| Prop | Type | Required | Default | Description |
|------|------|:--------:|---------|-------------|
| variant | `'primary' \| 'secondary' \| 'tertiary' \| 'danger' \| 'link'` | | `'secondary'` | 按钮层级/样式变体 |
| size | `'small' \| 'default' \| 'large'` | | `'default'` | 按钮尺寸 |
| loading | `boolean` | | `false` | 加载状态，加载中禁止点击且保持宽度 |
| disabled | `boolean` | | `false` | 禁用状态 |
| htmlType | `'button' \| 'submit' \| 'reset'` | | `'button'` | 原生 button 的 type 属性 |
| icon | `ReactNode` | | | 图标组件（通常用于文字左侧） |
| iconPosition | `'left' \| 'right'` | | `'left'` | 图标位置 |
| block | `boolean` | | `false` | 是否将按钮宽度调整为父容器宽度 |
| href | `string` | | | 如设置，渲染为 `<a>` 标签（Link 变体时常用） |

---

## Events

| Event | Type | Description |
|-------|------|-------------|
| onClick | `(e: MouseEvent) => void` | 点击按钮时触发。loading 或 disabled 状态下不会触发。 |

---

## Examples

### 基础用法

主操作用 `primary`，次操作用 `secondary`。

```tsx
import { Button } from '@my-design/react';

const Demo = () => (
  <div style={{ gap: 'var(--md-spacing-sm)', display: 'flex' }}>
    <Button variant="primary">提交</Button>
    <Button variant="secondary">取消</Button>
  </div>
);
```

### 加载状态

异步操作时显示 loading，防止重复提交。

```tsx
import { useState } from 'react';
import { Button } from '@my-design/react';

const Demo = () => {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    // 模拟异步请求
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <Button variant="primary" loading={loading} onClick={handleClick}>
      {loading ? '提交中...' : '提交'}
    </Button>
  );
};
```

### 危险操作

删除等不可逆操作用 `danger`，必须配合二次确认。

```tsx
import { Button, Popconfirm } from '@my-design/react';

const Demo = () => (
  <Popconfirm title="确定要删除这条记录吗？" onConfirm={() => console.log('Deleted')}>
    <Button variant="danger">删除</Button>
  </Popconfirm>
);
```

### 仅图标按钮

必须提供 `aria-label` 以保证可访问性。

```tsx
import { Button } from '@my-design/react';
import { SearchIcon, CloseIcon } from '@my-design/icons';

const Demo = () => (
  <div style={{ gap: 'var(--md-spacing-sm)', display: 'flex' }}>
    <Button variant="tertiary" icon={<SearchIcon />} aria-label="搜索" />
    <Button variant="tertiary" icon={<CloseIcon />} aria-label="关闭" />
  </div>
);
```

### 组合模式：按钮组

多个相关操作并列时，注意间距统一。

```tsx
import { Button } from '@my-design/react';

const Demo = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'flex-end', 
    gap: 'var(--md-spacing-sm)',
    padding: 'var(--md-spacing-md)',
    borderTop: '1px solid var(--md-color-border)' 
  }}>
    <Button variant="secondary">取消</Button>
    <Button variant="primary">确认</Button>
  </div>
);
```

---

## Behavior

- **loading**：
  - 设置 `loading={true}` 时，按钮左侧会出现 spinner。
  - 按钮自动进入 disabled 状态，忽略点击事件。
  - 按钮原有宽度应保持不变（min-width 控制），避免布局抖动。
- **disabled**：
  - 视觉置灰，鼠标样式为 `not-allowed`。
  - 不会触发 `onClick` 事件。
  - 不可被键盘聚焦（tabIndex = -1）。
- **focus**：
  - 支持 Tab 键聚焦。
  - 聚焦时显示明显的外发光轮廓（outline），与 hover 状态区分。
- **键盘**：
  - 聚焦状态下，按下 `Enter` 或 `Space` 键触发 `onClick`。

---

## When to use

**适用**：

- 提交表单、保存数据。
- 对话框的“确认/取消”操作。
- 触发一个即时操作（如“刷新”、“复制”）。

**不适用**：

- **页面跳转**：请使用 `Link` 组件或 `<a>` 标签，除非需要按钮样式的外观（此时用 `<Button variant="link" href="...">`）。
- **很多个并列操作**：如果操作超过 3 个，请考虑使用 `Dropdown` 或 `Menu` 收敛到“更多”中。

---

## Accessibility

- [ ] **键盘**：支持 Tab 序列聚焦，支持 Enter/Space 激活。
- [ ] **焦点**：Focus Ring 清晰可见，不被 `overflow: hidden` 截断。
- [ ] **ARIA**：
  - 仅图标按钮必须有 `aria-label`。
  - 加载中状态建议配合 `aria-busy="true"` 或 `aria-live` 区域（通常由业务层处理，组件层提供基础支持）。

---

## Related

- `Modal`：Button 常作为 Modal 的触发器和底部操作按钮；危险操作按钮需配合 Modal 做二次确认。
- `Tooltip`：仅图标按钮必须配合 Tooltip 提供文字说明；disabled 按钮可用 Tooltip 解释禁用原因。
- `Input`：表单场景中 Button 与 Input 搭配使用，注意表单内非提交按钮设置 `htmlType="button"`。
- `Select`：表单场景中 Button 与 Select 搭配使用，提交按钮应在所有表单控件之后。
