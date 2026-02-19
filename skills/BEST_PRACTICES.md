# my-design 最佳实践

## 引入方式

```tsx
// 正确：从 @my-design/react 引入
import { Button, Input, Table } from '@my-design/react';

// 正确：图标从 @my-design/icons 引入
import { SearchIcon, CloseIcon } from '@my-design/icons';

// 错误：不要从子路径引入
import Button from '@my-design/react/lib/Button';
```

> 具体引入方式以 `component_details` 返回的 `import` 字段为准。

---

## Design Token 使用

### 规则

- **禁止硬编码** 颜色、间距、圆角、字体大小等值
- **必须使用** CSS 变量形式的 design token
- 通过 `theme_tokens` 工具查询可用 token

### 示例

```tsx
// 正确：使用 token
<div style={{ 
  color: 'var(--md-color-primary)',
  padding: 'var(--md-spacing-md)',
  borderRadius: 'var(--md-radius-sm)',
}}>

// 错误：硬编码
<div style={{ 
  color: '#1890ff',
  padding: '16px',
  borderRadius: '4px',
}}>
```

---

## 常见规范要点

### 按钮

- 同一视图最多 1 个 Primary 按钮
- 危险操作必须用 `danger` + 二次确认
- 异步操作必须显示 `loading` 状态
- 仅图标按钮必须有 `aria-label`

### 表单

- 非提交按钮必须设 `htmlType="button"`
- 必填字段必须标注
- 提交时需要表单验证

### 布局

- 使用 token 间距，不要硬编码 px 值
- 响应式布局优先使用栅格系统

### 无障碍

- 交互元素必须支持键盘操作
- 图标/图片必须有替代文本
- 焦点状态必须清晰可见

> 详细规范可通过 `my-design://guidelines` 资源获取。

---

## 常见问题

### Q: 组件没有我需要的功能怎么办？

1. 先用 `component_search` 确认是否有其他组件能满足
2. 检查 `component_details(sections: ['props'])` 是否有遗漏的属性
3. 如果确实不支持，建议组合多个组件实现，而非魔改单个组件

### Q: 如何适配暗色主题？

1. 使用 `theme_tokens(theme: 'dark')` 查看暗色 token
2. 代码中使用 CSS 变量（如 `var(--md-color-primary)`），主题切换时自动生效
3. 不要基于主题写 if/else，让 token 系统处理

### Q: 升级版本后组件行为变了？

1. `changelog_query(keyword: '组件名')` 查看变更历史
2. `changelog_query(version: '目标版本')` 查看具体版本的 breaking changes
3. 按变更说明调整代码
