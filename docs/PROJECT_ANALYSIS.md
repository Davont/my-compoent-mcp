# 项目全面分析报告

> 分析日期：2026-02-23
> 分析范围：全部源码（18 个 TypeScript 文件，约 2,825 行）、文档、配置、依赖

---

## 一、项目概述

这是一个 **MCP (Model Context Protocol) Server**，为内部 React 组件库 `@my-design/react` 提供 AI 可调用的工具接口。核心目标是让 LLM（Claude、Cursor 等）能够在**没有训练数据**的情况下，结构化地访问内部组件库的 API、设计规范、Token 和源码。

**技术栈**: TypeScript + Node.js 18+ + ESM + oxc-parser + rslib

**架构理念**:
- **MCP 层（Tool & Resource）**: 提供可调用工具和只读资源，返回结构化数据
- **Skills 层（Workflow & Delivery）**: 编排 MCP 工具，形成端到端的页面生成、组件选择、迁移指导等工作流

---

## 二、项目结构

```
my-compoent-mcp/
├── src/                          # TypeScript 源码
│   ├── index.ts                  # 主导出文件
│   ├── server.ts                 # MCP Server 配置与请求处理
│   ├── stdio.ts                  # 入口：stdio 传输（本地开发）
│   ├── http.ts                   # 入口：HTTP/SSE 传输（生产部署）
│   ├── tools/                    # 10 个 MCP 工具实现
│   │   ├── component-list.ts     # 列出所有组件
│   │   ├── component-search.ts   # 搜索组件
│   │   ├── component-details.ts  # 获取组件 API 详情
│   │   ├── component-examples.ts # 获取使用示例
│   │   ├── theme-tokens.ts       # 查询设计 Token
│   │   ├── changelog-query.ts    # 变更日志查询
│   │   ├── get-code-block.ts     # 获取隐藏的代码块
│   │   ├── get-component-file-list.ts  # 列出组件源文件
│   │   ├── get-file-code.ts      # 读取文件源码
│   │   ├── get-function-code.ts  # 提取指定函数
│   │   └── index.ts              # 工具注册中心
│   └── utils/
│       ├── doc-reader.ts         # 文档解析（Markdown + YAML frontmatter）
│       ├── source-code-reader.ts # 源码读取（npm 包解析）
│       └── remove-function-body.ts # AST 解析（oxc-parser 函数体折叠）
│
├── doc/                          # 机器友好的文档数据（随 npm 包发布）
│   ├── index.json                # 组件与规范索引
│   ├── components/               # 组件文档（5 个 + 模板）
│   ├── tokens/                   # 设计 Token（JSON）
│   ├── guidelines/               # 设计规范
│   └── changelog/                # 变更日志
│
├── mock/                         # Mock @my-design/react 包（本地开发用）
├── dist/                         # 构建输出
├── reference/                    # 参考实现（semi-mcp、magic-mcp）
├── scripts/                      # 工具脚本
├── context-problem/              # 设计研究文档
├── skills/                       # Skills 层定义
│
├── package.json                  # 包配置
├── tsconfig.json                 # TypeScript 配置
└── rslib.config.ts               # 构建配置
```

---

## 三、评分总览

| 维度 | 评分 | 评价 |
|------|------|------|
| **架构设计** | 9/10 | 模块清晰，关注点分离优秀 |
| **代码质量** | 8/10 | 干净一致，少量重复 |
| **类型安全** | 8/10 | 开启了 strict，部分 `as` 断言缺乏运行时校验 |
| **安全性** | 8.5/10 | 路径穿越防护优秀，HTTP 层有小缺陷 |
| **Token 管理** | 9.5/10 | 三级上下文控制策略设计精妙 |
| **依赖管理** | 9/10 | 仅 2 个运行时依赖，极简 |
| **构建打包** | 9/10 | rslib 配置合理，三入口输出 |
| **文档** | 8/10 | 中文注释详尽，有完整的设计文档 |
| **测试** | 2/10 | 项目本身无测试，仅 reference 中有 |
| **生产就绪度** | 7/10 | 核心功能完备，缺测试和部分健壮性 |

**综合评分：8.0/10 — 设计优秀，实现扎实，测试缺失是最大短板**

---

## 四、亮点分析

### 4.1 上下文控制策略（最大亮点）

三级 Token 节省设计非常出色，充分体现了对 LLM token 成本的深入理解：

| 级别 | 策略 | 效果 |
|------|------|------|
| 第一级 | `brief=true` 模式 | 只返回概览 + 可用 section 列表 + 属性名，跳过完整文档 |
| 第二级 | `sections` 过滤 | 按需获取指定章节（props/events/rules 等） |
| 第三级 | 代码块隐藏 | 大文档中用占位符替代代码块，通过 `get_code_block` 按需获取 |
| 额外 | 函数体折叠 | 源码文件默认只返回函数签名，通过 `get_function_code` 获取函数体 |

### 4.2 安全防护

- **路径穿越检测**: 使用 `realpathSync` 解析符号链接 + 绝对路径前缀校验
- **二进制文件检测**: 前 8KB null byte 检查，防止读取图片/编译产物
- **排除路径黑名单**: node_modules、dist、.git 等目录自动过滤

```typescript
// src/utils/source-code-reader.ts:241-248
const realRoot = realpathSync(packageRoot);
const absPath = resolve(realRoot, relativePath);
if (!absPath.startsWith(realRoot + sep) && absPath !== realRoot) {
  throw new Error(`Path traversal detected: ${relativePath}`);
}
```

### 4.3 极简依赖

仅 2 个运行时依赖，供应链风险极低：

| 依赖 | 版本 | 用途 |
|------|------|------|
| `@modelcontextprotocol/sdk` | ^1.25.1 | MCP 协议 SDK |
| `oxc-parser` | ^0.106.0 | Rust 实现的高性能 AST 解析器 |

### 4.4 双传输层

stdio（本地开发）+ HTTP/SSE（生产部署）共享同一套 server 逻辑，无代码重复。

### 4.5 工具设计哲学

遵循 semi-mcp 的「少量强参数化工具」路线（而非 magic-mcp 的「大量专用工具」），10 个工具覆盖完整链路：

```
组件发现 → 详情查询 → 示例获取 → 源码分析
component_search → component_details → component_examples → get_function_code
```

---

## 五、问题与风险

### 5.1 严重问题

#### P0-1: 无测试套件

- **影响**: 整个项目
- **风险**: 无法保证重构安全性，回归风险高
- **现状**: TEST_PLAN.md 写得很详细但未落地；仅 reference/semi-mcp 中有参考测试
- **建议**: 优先补充核心测试（工具参数校验、路径安全、AST 边界情况）

#### P0-2: HTTP body 无大小限制

- **文件**: `src/http.ts:136-139`
- **风险**: 恶意大请求可耗尽内存（DoS 攻击）

```typescript
// 当前代码 - 无限制
req.on('data', (chunk) => {
  body += chunk.toString();  // 没有大小检查
});

// 建议修复
const MAX_BODY_SIZE = 1024 * 1024; // 1MB
req.on('data', (chunk) => {
  body += chunk.toString();
  if (body.length > MAX_BODY_SIZE) {
    res.writeHead(413);
    res.end('Request body too large');
    req.destroy();
    return;
  }
});
```

### 5.2 中等问题

#### P1-1: 工具参数缺乏运行时校验

- **文件**: 所有 `src/tools/*.ts`
- **问题**: 使用 `as` 类型断言代替运行时验证

```typescript
// 当前 - 仅类型断言
const category = args?.category as string | undefined;

// 建议 - 添加运行时校验
const category = typeof args?.category === 'string' ? args.category : undefined;
```

#### P1-2: parseFilePath 函数重复

- **文件**: `src/tools/get-function-code.ts:16-24` 和 `src/tools/get-file-code.ts:17-25`
- **问题**: 完全相同的函数在两个文件中重复定义
- **建议**: 提取到 `src/utils/` 作为共享工具函数

#### P1-3: Session 超时未正确关闭传输

- **文件**: `src/http.ts:78-88`
- **问题**: 超时 session 只从 map 中删除，未调用 `transport.close()`
- **建议**: 删除前先关闭连接

#### P1-4: doc/ 目录缺失会导致启动崩溃

- **文件**: `src/utils/doc-reader.ts`
- **问题**: 未做启动时目录存在性校验
- **建议**: 添加启动检查，缺失时给出明确错误信息

### 5.3 低风险问题

| # | 问题 | 文件 | 说明 |
|---|------|------|------|
| P2-1 | AST 解析错误只 `console.warn` | `remove-function-body.ts:258-280` | 错误不上报调用方，静默失败 |
| P2-2 | JSON.parse 无 try-catch | `doc-reader.ts:270, 371, 386` | doc 文件损坏会导致崩溃 |
| P2-3 | 正则中 sectionName 未转义 | `doc-reader.ts:349` | 特殊字符可能破坏匹配 |
| P2-4 | oxc-parser 版本范围过宽 | `package.json` | `^0.106.0` 允许小版本更新，AST 输出可能变化 |

---

## 六、10 个 MCP 工具清单

| 工具 | 用途 | 关键参数 |
|------|------|----------|
| `component_list` | 列出所有组件 | `category`, `status` |
| `component_search` | 搜索组件 | `query` |
| `component_details` | 获取组件 API 文档 | `componentName`, `brief`, `sections`, `propFilter` |
| `component_examples` | 获取使用示例 | `componentName` |
| `theme_tokens` | 查询设计 Token | `type`, `theme` |
| `changelog_query` | 变更日志查询 | `query`, `version` |
| `get_code_block` | 获取隐藏的代码块 | `componentName`, `codeBlockIndex` |
| `get_component_file_list` | 列出组件源文件 | `componentName` |
| `get_file_code` | 读取完整源文件 | `filePath` |
| `get_function_code` | 提取指定函数 | `filePath`, `functionName` |

---

## 七、项目当前状态

### 已完成

- [x] MCP Server 核心架构（共享 server + stdio/http 传输）
- [x] 10 个 MCP 工具全部实现
- [x] 5 个组件文档（Button、Input、Modal、Select、Tooltip）
- [x] Token 体系（颜色、间距、圆角、字体、阴影）
- [x] 文档模板系统
- [x] 源码分析能力（oxc-parser 集成）
- [x] 上下文控制机制（brief/sections/代码块隐藏/函数体折叠）
- [x] 构建和打包配置（rslib 三入口输出）

### 未完成（TODO.md 中 10 项）

| # | 内容 | 类型 |
|---|------|------|
| 1 | SECTION_MAP 扩展（Usage guide 章节） | 待讨论 |
| 2 | SECTION_MAP 扩展（Related 章节） | 待讨论 |
| 3 | 创建 `get_guideline` 工具 | 待讨论 |
| 4 | Props 连字符属性解析（aria-label 等） | Bug |
| 5 | Source 字段映射（frontmatter → 源码路径） | 待讨论 |
| 6 | 碎片化上下文对 AI 跨组件推理的影响 | 待讨论 |
| 7 | 完整 AI-MCP 调用链文档 | 待规划 |
| 8 | 多组件库支持策略 | 待规划 |
| 9 | 量化指标系统（token 消耗、延迟、准确率） | 待规划 |
| 10 | 设计稿到代码能力 | 待规划 |

---

## 八、构建与部署

### 构建产物

```
dist/index.js    70.1 kB  ← 库导出（供其他项目引用）
dist/stdio.js    69.8 kB  ← stdio 传输入口
dist/http.js     79.4 kB  ← HTTP 传输入口
```

### 可执行命令

```bash
npm run build        # 构建
npm run dev          # 开发模式（watch）
npm start            # 启动 stdio server
npm run start:http   # 启动 HTTP server
```

### 包导出

```json
{
  "exports": {
    ".": "./dist/index.js",
    "./http": "./dist/http.js",
    "./tools": "./dist/tools/index.js",
    "./utils/*": "./dist/utils/*.js"
  },
  "bin": {
    "my-design-mcp": "./dist/stdio.js",
    "my-design-mcp-http": "./dist/http.js"
  }
}
```

---

## 九、修复建议优先级

### 第一优先级（应立即修复）

1. **补充核心测试套件**
   - 工具参数校验测试
   - 路径穿越安全测试
   - AST 解析边界情况测试
   - 文档解析测试

2. **修复 HTTP body 大小限制**（安全漏洞）

### 第二优先级（近期修复）

3. 添加工具参数运行时校验（替代 `as` 断言）
4. 提取重复的 `parseFilePath` 函数
5. 修复 Session 超时清理逻辑
6. 添加启动时 doc/ 目录校验

### 第三优先级（后续优化）

7. AST 解析错误上报机制
8. JSON.parse 添加 try-catch
9. 正则特殊字符转义
10. 推进 TODO.md 中的功能项

---

## 十、总体评价

**这是一个设计水平很高的项目。** 它解决了一个真实痛点——让 AI 能够结构化访问内部组件库，而不是靠 prompt 堆砌文档。

**核心优势**：
- 上下文控制策略的三级设计精妙，体现了对 LLM token 成本的深入理解
- 遵循 semi-mcp 的成熟模式，架构决策有据可依
- 极简依赖 + 强安全防护 + 双传输层，工程质量高

**最大短板**：
- 测试完全缺失，与项目的成熟度不匹配
- HTTP 层存在安全隐患（body 无限制）

**结论**：项目已具备核心功能，距离生产就绪主要差**测试覆盖**和**少量安全修复**。建议优先补齐这两项，再推进 TODO 中的功能扩展。
