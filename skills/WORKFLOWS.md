# my-design 工作流

## 工作流 1：组件选型

用户描述需求，推荐合适的组件。

```
步骤 1: component_search(query: '用户需求关键词')
        → 找到候选组件列表

步骤 2: 对每个候选 → component_details(componentName, brief: true)
        → 看概述和适用场景

步骤 3: component_details(componentName, sections: ['when-to-use'])
        → 确认适用/不适用条件

步骤 4: 输出推荐结果 + 理由
```

---

## 工作流 2：代码生成

用户要求生成页面/组件代码。

```
步骤 1: 确定需要哪些组件
        → component_search 或 component_list

步骤 2: 获取每个组件的 API 和规则
        → component_details(componentName, sections: ['props', 'rules'])

步骤 3: 获取参考示例
        → component_examples(componentName) 看目录
        → component_examples(componentName, exampleName: '...') 取具体示例

步骤 4: 获取 token
        → theme_tokens(type: 'color') / theme_tokens(type: 'spacing')

步骤 5: 生成代码
        - 遵守核心规则
        - 使用 token CSS 变量
        - 使用正确的 import 方式

步骤 6: 输出规范对齐 checklist
        □ Primary 按钮数量符合规则？
        □ 危险操作有二次确认？
        □ 颜色/间距使用了 token？
        □ 仅图标按钮有 aria-label？
        □ 异步操作有 loading 状态？
```

---

## 工作流 3：迁移/升级排查

用户在版本升级时遇到问题。

```
步骤 1: changelog_query(version: '目标版本')
        → 查看该版本的变更内容

步骤 2: changelog_query(keyword: '组件名')
        → 搜索该组件的历史变更

步骤 3: component_details(componentName, sections: ['props'])
        → 确认当前版本的 API

步骤 4: 输出迁移步骤
        - 列出 Breaking Changes
        - 给出代码修改建议
        - 标注风险点
```

---

## 工作流 4：问题排查

用户遇到组件使用问题。

```
步骤 1: component_details(componentName, brief: true)
        → 快速了解组件

步骤 2: 根据问题定位章节
        - 样式问题 → sections: ['props']，检查相关属性
        - 交互问题 → sections: ['behavior']
        - 事件问题 → sections: ['events']
        - 规范问题 → sections: ['rules']

步骤 3: component_examples(componentName, exampleName: '相关场景')
        → 对比示例代码与用户代码

步骤 4: 给出修复建议
```
