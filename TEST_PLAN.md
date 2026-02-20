# 测试方案

## 前置条件

### 必须满足
- [ ] `npm run build` 成功
- [ ] `doc/components/` 下有 5 个组件文档：button.md, input.md, modal.md, select.md, tooltip.md
- [ ] MCP server 已部署并连接到 AI 客户端

### 源码工具额外条件
- [ ] `@my-design/react` 已安装（`npm ls @my-design/react` 能找到，通过 symlink 指向 mock 包）
- [ ] 包内有 `components/` 目录，每个组件含 `index.js` + `index.d.ts`

> mock 包模拟真实 npm 包结构：tsc 编译产物（.js + .d.ts），非源码 .tsx

---

## 测试组件清单

| 组件 | 分类 | 状态 | 测试价值 |
|------|------|------|----------|
| Button | form | stable | 基准组件，Props 最丰富 |
| Input | form | stable | 同分类多组件，测搜索区分 |
| Modal | feedback | stable | 不同分类，测选型场景 |
| Select | form | stable | 复杂交互，测源码理解 |
| Tooltip | display | beta | 测 status 过滤，beta 状态提示 |

---

## 测试用例

### 第一轮：文档工具（7 个，无额外依赖）

#### T1. component_list — 组件列表
```
提问：列出所有可用的组件
预期：返回 5 个组件，显示 name/category/status
通过标准：
  - 5 个组件全部出现
  - 分类正确：Button/Input/Select=form, Modal=feedback, Tooltip=display
  - 状态正确：Tooltip=beta，其余=stable
```

#### T2. component_search — 组件搜索
```
测试 2a - 中文别名：
提问：搜索"弹窗"
预期：通过 aliases 匹配到 Modal
通过标准：Modal 出现在结果中

测试 2b - 英文别名：
提问：搜索 "Btn"
预期：通过别名匹配到 Button
通过标准：Button 出现在结果中

测试 2c - 关键词跨分类：
提问：搜索"选择"
预期：匹配到 Select（keywords 含"选择"）
通过标准：Select 出现，不会误匹配 Input

测试 2d - 模糊搜索：
提问：搜索 "form"
预期：匹配到 Button、Input、Select（category=form）
通过标准：3 个 form 组件全部出现，Modal/Tooltip 不出现
```

#### T3. component_details — 组件详情（核心测试）
```
测试 3a - brief 模式：
提问：简单介绍一下 Modal 组件
预期：AI 调用 brief=true，返回概述 + 章节列表 + Props 名称列表
通过标准：输出简短（<30 行），包含 Props 名称但不含完整表格

测试 3b - sections 过滤：
提问：Select 组件有哪些 Props？
预期：AI 调用 sections=["props"]，只返回 Props 章节
通过标准：只看到 Props 表格，不含 Examples/Behavior 等

测试 3c - propFilter：
提问：Button 的 loading 属性怎么用？
预期：AI 调用 propFilter=["loading"]
通过标准：只返回 loading 这一行 prop 信息

测试 3d - 完整文档：
提问：给我 Tooltip 的完整文档
预期：返回所有章节
通过标准：包含 Props + Events + Examples + Behavior + 核心规则

测试 3e - 跨组件对比：
提问：对比 Button 和 Input 的 Props
预期：AI 分别调用两次 component_details(sections=["props"])
通过标准：两个组件的 Props 表格都返回，可做对比
```

#### T4. component_examples — 示例获取
```
提问：给我 Select 的使用示例
预期：返回 Examples 章节下的所有示例
通过标准：能看到"基础用法""多选 + 标签限制""可搜索""禁用选项"等示例标题和代码
```

#### T5. get_code_block — 代码块定点读取
```
提问：给我 Modal 文档里第 2 个代码块
预期：返回指定编号的代码块内容
通过标准：返回正确的代码片段（异步确认示例）
注意：这个工具主要在大文档（>500行）代码块被隐藏时使用
```

#### T6. theme_tokens — 主题 Token
```
测试 6a - 单组件：
提问：Modal 用了哪些 design token？
预期：返回 frontmatter 中 tokens 字段的值
通过标准：显示 --md-color-mask, --md-radius-md, --md-spacing-lg, --md-shadow-lg

测试 6b - 跨组件对比：
提问：Button 和 Tooltip 分别用了哪些 token？
预期：分别返回两个组件的 tokens
通过标准：能看出不同组件使用不同的 token 集合
```

#### T7. changelog_query — 变更日志
```
提问：Modal 最近有什么更新？
预期：返回 changelog 内容（如果 doc/changelog/ 目录存在）
通过标准：返回分页结果或"无 changelog"的友好提示
```

---

### 第二轮：源码工具（3 个，需要 @my-design/react mock 包）

#### T8. get_component_file_list — 组件文件列表
```
测试 8a - 正常列出：
提问：Modal 组件的源码有哪些文件？
预期：列出 components/modal/ 下所有文件
通过标准：返回 index.js, index.d.ts

测试 8b - 多组件对比：
提问：Select 和 Tooltip 分别有哪些源文件？
预期：分别列出两个组件的文件
通过标准：各自返回 index.js, index.d.ts

降级测试（组件不存在时）：
提问：DatePicker 组件的源码有哪些文件？
预期：返回友好错误 "找不到组件 DatePicker"
通过标准：不崩溃，错误信息有指导性
```

#### T9. get_file_code — 文件代码读取
```
测试 9a - 小文件（.d.ts 类型声明）：
提问：给我看 Tooltip 的类型声明文件
预期：返回 components/tooltip/index.d.ts 完整内容
通过标准：代码完整，有行数和字符数统计

测试 9b - 较大文件（.js 实现）自动折叠：
提问：给我看 Select 的 index.js 源码
预期：如果超过 500 行则函数体被自动替换为 { /* ... */ }
通过标准：能看到函数签名但函数体被折叠，输出提示"已处理"

测试 9c - fullCode 强制完整：
提问：给我 Modal 的 index.js 完整源码，不要折叠
预期：AI 传 fullCode=true，返回完整代码
通过标准：函数体完整展示
```

#### T10. get_function_code — 函数精读
```
测试 10a - 正常提取：
提问：给我看 Modal 组件中 useFocusTrap 函数的实现
预期：只返回 useFocusTrap 函数的完整代码
通过标准：返回完整函数实现，不含其他函数

测试 10b - 提取组件主函数：
提问：给我看 Select 组件的 filterOptions 函数
预期：返回 filterOptions 函数代码
通过标准：只返回该函数，不含组件其他代码

测试 10c - 函数不存在：
提问：给我看 Tooltip 的 fooBar 函数
预期：返回"未找到函数"+ 可用函数列表
通过标准：列出文件中所有可用函数名，方便用户选择
```

---

### 第三轮：集成场景（模拟真实使用）

#### S1. 组件开发辅助
```
提问：我要用 Button 组件实现一个带 loading 的提交按钮，帮我写代码
预期 AI 行为：
1. 先调 component_details(brief=true) 了解组件
2. 再调 component_details(propFilter=["loading","onClick"]) 获取相关 prop
3. 可能调 component_examples 看示例
4. 基于信息生成代码
通过标准：AI 生成的代码使用了正确的 prop 名和类型
```

#### S2. 组件选型
```
提问：我需要一个用户确认操作的弹窗，应该用什么组件？
预期 AI 行为：
1. 调 component_search("弹窗") 或 component_search("确认")
2. 匹配到 Modal（aliases 含"弹窗"，keywords 含"确认"）
3. 调 component_details(name="modal", brief=true) 确认适用性
4. 给出推荐并说明理由
通过标准：AI 推荐 Modal，并能说明 Modal vs Tooltip 的区别（反馈类 vs 展示类）
```

#### S3. 源码理解
```
提问：Modal 组件内部是怎么处理焦点陷阱的？
预期 AI 行为：
1. 调 get_component_file_list("modal") 看文件结构
2. 调 get_file_code 看主文件（可能自动折叠）
3. 调 get_function_code("useFocusTrap") 精读焦点陷阱函数
通过标准：AI 能准确描述 useFocusTrap 的实现逻辑（Tab 循环、首尾元素判断）
```

#### S4. 跨组件表单搭建
```
提问：帮我搭建一个包含 Input、Select 和提交 Button 的表单
预期 AI 行为：
1. 分别调 component_details 获取 3 个组件的 Props
2. 可能调 component_examples 看各组件示例
3. 组合生成表单代码
通过标准：
  - 代码中 import 路径正确（@my-design/react）
  - 各组件 Props 使用正确（Input 的 onChange、Select 的 options、Button 的 onClick）
  - 表单有合理的状态管理
```

#### S5. beta 组件风险评估
```
提问：Tooltip 组件能用在生产环境吗？
预期 AI 行为：
1. 调 component_details(name="tooltip", brief=true)
2. 注意到 status=beta
3. 给出风险提示
通过标准：AI 明确指出 Tooltip 处于 beta 状态，建议谨慎使用或关注后续版本
```

---

## 通过标准总结

| 维度 | 合格线 |
|------|--------|
| 功能正确 | 10 个工具全部能被 AI 正确调用，返回预期内容 |
| 组件覆盖 | 5 个组件（3 分类、2 状态）全部可被发现、搜索、查看 |
| 上下文控量 | brief 模式 < 30 行；propFilter 只返回指定 prop；大文件自动折叠 |
| 优雅降级 | 组件不存在、函数不存在 → 友好错误，不崩溃 |
| AI 行为 | AI 能渐进式获取信息（先 brief → 再深入），而不是一次性拉全量 |
| 端到端 | S1-S5 集成场景中，AI 生成的代码质量可用 |

## 不合格信号

- AI 一次性调用 component_details 不带任何过滤参数（上下文爆炸）
- 工具返回空内容但没有错误提示
- 源码工具在组件不存在时抛异常/崩溃
- AI 无法找到 5 个组件中的任何一个（搜索/列表失败）
- 大文件没有触发函数体折叠
- AI 忽略 beta 状态，不做风险提示
- 跨分类搜索返回错误结果（如搜"弹窗"返回 Button）

---

## 端到端测试流程（Cline + VSCode）

### 环境准备

1. 构建：`npm run build`
2. 配置 Cline MCP（设置面板或配置文件）：
```json
{
  "mcpServers": {
    "my-design": {
      "command": "node",
      "args": ["/Users/zhanghanyu/Desktop/my-compoent-mcp/dist/stdio.js"]
    }
  }
}
```
3. 重启 Cline，确认工具列表中出现 10 个 my-design 工具

### 推荐测试问题

| # | 问题 | 预期触发的工具 | 验证重点 |
|---|------|--------------|---------|
| 1 | "列出所有可用组件" | component_list | 5 个组件、分类、状态正确 |
| 2 | "我需要一个弹窗组件，用哪个？" | component_search → component_details(brief) | 搜索匹配 + 渐进查询 |
| 3 | "用 Button 写一个带 loading 的提交按钮" | component_details(propFilter) → component_examples | 生成代码正确性 |
| 4 | "帮我搭一个包含 Input、Select 和 Button 的表单" | 多次 component_details | 跨组件协作 |
| 5 | "Modal 内部是怎么处理焦点陷阱的？" | get_component_file_list → get_function_code | 源码理解 |

### 记录模板

每个问题按以下格式记录，方便后续分析：

```
## 问题 N：[问题内容]

**AI 调用的工具链**：
1. tool_name(param1=xxx, param2=xxx)
2. tool_name(param1=xxx)
...

**思考时间**：x 秒
**总响应时间**：x 秒

**生成的代码**：
（贴代码）

**观察记录**：
- [ ] AI 是否先用 brief 再深入
- [ ] import 路径是否正确（@my-design/react）
- [ ] prop 名称和类型是否与文档一致
- [ ] 是否注意到 beta 状态（如涉及 Tooltip）
```

### 关键观察点

| 观察项 | 合格 | 不合格 |
|--------|------|--------|
| 查询策略 | 先 brief/search → 再按需深入 | 一上来就拉全量文档 |
| import 路径 | `import { X } from '@my-design/react'` | 路径错误或自己编造 |
| Prop 使用 | 名称、类型与文档一致 | 使用文档中不存在的 prop |
| 状态感知 | 提到 Tooltip 是 beta | 忽略 status 字段 |
| 源码理解 | 能准确描述函数逻辑 | 胡编实现细节 |
| 响应时间 | 渐进查询总时间可接受 | 因拉全量导致思考过久 |

### 基准数据参考

运行 `node scripts/context-benchmark.mjs` 可获取量化数据：

| 查询方式 | 平均字符数 | vs 原始文档 |
|---------|-----------|------------|
| 原始 md 全文 | ~3,839 | 基准 |
| brief 模式 | ~389 | -89.9% |
| sections=props | ~809 | -78.9% |
| propFilter(单属性) | ~263 | -93.1% |
