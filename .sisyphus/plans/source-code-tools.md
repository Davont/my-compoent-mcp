# 源码阅读增强工具

## TL;DR

> **Quick Summary**: 为 my-design MCP Server 添加 3 个源码阅读工具，让 AI 能浏览组件库源码进行深度排查和理解。从 `node_modules/@my-design/react/` 读取源码，使用 `oxc-parser` 做 AST 解析实现大文件函数体剥离。
> 
> **Deliverables**:
> - `get_component_file_list` — 列出组件的所有源码文件
> - `get_file_code` — 读取文件代码（大文件自动去函数体）
> - `get_function_code` — 按函数名精读完整实现
> - `source-code-reader.ts` — 本地文件系统访问工具层
> - `remove-function-body.ts` — AST 函数体剥离工具
> 
> **Estimated Effort**: Medium
> **Parallel Execution**: YES - 5 waves
> **Critical Path**: Task 1 → Task 3 → Task 5 → Task 7 → Task 8

---

## Context

### Original Request
用户要实现 ROADMAP 中的"可选增强"工具：源码与函数读取，让 AI 能查看源码结构、样式与关键函数实现，用于深度理解、排查与二开。

### Interview Summary
**Key Discussions**:
- 源码位置：从 `node_modules/@my-design/react/` 读取
- 工具范围：3 个全要（文件列表 + 文件代码 + 函数精读）
- AST 方案：用 oxc-parser（follow semi-mcp 验证过的方案）
- 版本：不需要版本查询功能
- 包结构：具体目录结构后期确认，工具设计需灵活适配

**Research Findings**:
- semi-mcp 的 `remove-function-body.ts`（352 行）已验证可用，可直接适配复用
- semi-mcp 用 HTTP 远程读取，我们改为本地 fs 读取，更简单
- oxc-parser@^0.106.0 是 Rust 原生模块，需确认 rslib 打包兼容性

### Metis Review
**Identified Gaps** (addressed):
- 包路径解析策略：使用 `process.cwd()/node_modules/` 为默认值，`MY_DESIGN_PACKAGE_ROOT` 环境变量覆盖
- 路径穿越安全：所有文件读取必须验证路径在包目录内
- 包未安装降级：三个工具都必须优雅处理包不存在的情况
- 二进制文件检测：文件读取需检测二进制文件并跳过
- rslib + 原生模块：需验证构建是否正常外部化 oxc-parser

---

## Work Objectives

### Core Objective
为 MCP Server 添加源码阅读能力，让 AI 能按"文件列表 → 文件骨架 → 函数精读"的渐进式路径探索组件源码。

### Concrete Deliverables
- `src/utils/source-code-reader.ts` — 本地文件系统访问工具
- `src/utils/remove-function-body.ts` — AST 函数体剥离（适配 semi-mcp）
- `src/tools/get-component-file-list.ts` — 组件文件列表工具
- `src/tools/get-file-code.ts` — 文件代码读取工具
- `src/tools/get-function-code.ts` — 函数代码提取工具
- 更新 `src/tools/index.ts` 和 `src/index.ts` 注册新工具
- `package.json` 新增 `oxc-parser` 依赖

### Definition of Done
- [x] `npm run build` 成功（零错误）
- [x] 工具列表包含 10 个工具（7 原有 + 3 新增）
- [x] 三个新工具在包未安装时返回友好错误而非崩溃

### Must Have
- 路径穿越防护（filePath 不能越出包目录）
- 包未安装时的优雅降级（isError: true + 清晰错误信息）
- 大文件函数体剥离（.ts/.tsx/.js/.jsx >= 500 行）
- 函数未找到时返回可用函数名列表
- 组件未找到时返回可用目录列表

### Must NOT Have (Guardrails)
- ❌ 不加缓存机制
- ❌ 不加版本解析
- ❌ 不支持读取多个包（只读 `@my-design/react`）
- ❌ 不修改任何现有工具或 utils 的实现代码（允许在 index.ts 追加注册入口）
- ❌ 不添加源码映射（source map）支持
- ❌ 不递归发现子组件作为独立实体

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** — ALL verification is agent-executed. No exceptions.

### Test Decision
- **Infrastructure exists**: NO（项目无测试框架）
- **Automated tests**: None
- **Framework**: none

### QA Policy
Every task MUST include agent-executed QA scenarios.
Evidence saved to `.sisyphus/evidence/task-{N}-{scenario-slug}.{ext}`.

- **Build verification**: Use Bash — `npm run build`, check exit code
- **Tool registration**: Use Bash — node one-liner to import dist and check tool names
- **File operations**: Use Bash — create temp test files, invoke handlers programmatically

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately — no dependencies):
├── Task 1: Add oxc-parser dependency + verify build [quick]
└── Task 2: Create source-code-reader.ts utility [unspecified-high]

Wave 2 (After Wave 1 — core utilities):
├── Task 3: Create remove-function-body.ts (depends: 1) [quick]
└── Task 4: Create get-component-file-list.ts (depends: 2) [unspecified-high]

Wave 3 (After Wave 2 — remaining tools):
├── Task 5: Create get-file-code.ts (depends: 2, 3) [unspecified-high]
└── Task 6: Create get-function-code.ts (depends: 2, 3) [unspecified-high]

Wave 4 (After Wave 3 — registration):
└── Task 7: Register all tools in index files (depends: 4, 5, 6) [quick]

Wave 5 (After Wave 4 — verification):
└── Task 8: End-to-end build verification (depends: 7) [quick]

Critical Path: Task 1 → Task 3 → Task 5 → Task 7 → Task 8
Parallel Speedup: ~40% faster than sequential
Max Concurrent: 2 (Waves 1-3)
```

### Dependency Matrix

| Task | Depends On | Blocks | Wave |
|------|-----------|--------|------|
| 1 | — | 3 | 1 |
| 2 | — | 4, 5, 6 | 1 |
| 3 | 1 | 5, 6 | 2 |
| 4 | 2 | 7 | 2 |
| 5 | 2, 3 | 7 | 3 |
| 6 | 2, 3 | 7 | 3 |
| 7 | 4, 5, 6 | 8 | 4 |
| 8 | 7 | — | 5 |

### Agent Dispatch Summary

- **Wave 1**: 2 tasks — T1 → `quick`, T2 → `unspecified-high`
- **Wave 2**: 2 tasks — T3 → `quick`, T4 → `unspecified-high`
- **Wave 3**: 2 tasks — T5 → `unspecified-high`, T6 → `unspecified-high`
- **Wave 4**: 1 task — T7 → `quick`
- **Wave 5**: 1 task — T8 → `quick`

---

## TODOs

- [x] 1. Add oxc-parser dependency and verify build

  **What to do**:
  - Add `oxc-parser@^0.106.0` to `dependencies` in `package.json`
  - Run `npm install`
  - Run `npm run build` 验证 rslib 能正确处理原生模块（应自动外部化 dependencies）
  - 如果构建失败，在 `rslib.config.ts` 中添加 `output.externals: ['oxc-parser']`

  **Must NOT do**:
  - 不修改任何 src/ 文件
  - 不修改 tsconfig.json

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 2)
  - **Blocks**: Task 3
  - **Blocked By**: None

  **References**:
  - `package.json:59-66` — 现有 dependencies 格式
  - `rslib.config.ts:1-55` — 构建配置，如需添加 externals
  - `reference/mcp/semi-mcp/package.json:63` — semi-mcp 的 oxc-parser 版本参考

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Build succeeds with oxc-parser dependency
    Tool: Bash
    Preconditions: package.json updated with oxc-parser
    Steps:
      1. Run `npm install` — exit code 0
      2. Run `npm run build` — exit code 0
      3. Check `ls dist/` — index.js, stdio.js, http.js exist
    Expected Result: Build completes without errors, dist/ contains all expected files
    Failure Indicators: npm install fails, build errors mentioning oxc-parser or native module
    Evidence: .sisyphus/evidence/task-1-build-success.txt
  ```

  **Commit**: YES (group 1)
  - Message: `chore(deps): add oxc-parser for AST-based function extraction`
  - Files: `package.json`, `package-lock.json`
  - Pre-commit: `npm run build`

- [x] 2. Create `src/utils/source-code-reader.ts` — filesystem access layer

  **What to do**:
  - 创建 `src/utils/source-code-reader.ts`，实现以下函数：

  **`resolvePackageRoot(packageName?: string): string`**
  - 默认包名 `@my-design/react`
  - 优先读取环境变量 `MY_DESIGN_PACKAGE_ROOT`（如果设置）
  - 否则从 `process.cwd()` + `node_modules/{packageName}` 解析
  - 验证目录存在（`existsSync`），不存在则抛出明确错误
  - 处理 symlink：用 `realpathSync` 解析真实路径

  **`listComponentFiles(packageRoot: string, componentName: string): { files: string[]; packageName: string }`**
  - 在 packageRoot 下查找匹配 componentName 的顶层目录（大小写不敏感）
  - 递归列出该目录下所有文件（深度限制 10 层）
  - 排除目录：`/node_modules/`, `/dist/`, `/lib/`, `/es/`, `/cjs/`, `/__test__/`, `/__tests__/`, `/_story/`, `/_stories/`, `/.git/`
  - 返回格式：`@my-design/react/Button/index.tsx`（带包名前缀）

  **`readSourceFile(packageRoot: string, relativePath: string): string`**
  - 读取文件内容（`readFileSync` utf-8）
  - **路径穿越防护**：`path.resolve(packageRoot, relativePath)` 后验证仍以 `packageRoot` 开头
  - **二进制文件检测**：读取前 8KB，检查是否包含 null byte（`\x00`），若是则抛出 "Binary file" 错误

  **`listTopLevelDirectories(packageRoot: string): string[]`**
  - 列出包根目录下所有子目录（不递归）
  - 排除 `node_modules`, `.git`, `dist`, `lib`, `es`, `cjs` 等
  - 用于"组件未找到"时给出建议列表

  - 导出所有函数和必要类型
  - 遵循 `doc-reader.ts` 的编码风格（同步 fs、明确错误处理）

  **Must NOT do**:
  - 不添加 HTTP 请求功能
  - 不添加缓存
  - 不添加版本解析

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Task 1)
  - **Blocks**: Tasks 4, 5, 6
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/utils/doc-reader.ts:19-37` — `getDocPath()` 路径解析模式（多路径尝试 + existsSync 验证）
  - `src/utils/doc-reader.ts:261-271` — `readDocIndex()` 文件读取 + 错误处理模式
  - `src/utils/doc-reader.ts:278-298` — `readComponentDoc()` 组件名大小写不敏感查找模式

  **API/Type References**:
  - `src/utils/doc-reader.ts:42-67` — 类型定义风格（interface + JSDoc）

  **External References**:
  - `reference/mcp/semi-mcp/src/tools/get-component-file-list.ts:15-37` — 排除目录列表 + shouldExcludePath 函数

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Package root resolution works
    Tool: Bash
    Preconditions: Source file created and compiled
    Steps:
      1. Run `npx tsc --noEmit src/utils/source-code-reader.ts` — no type errors
      2. Verify file exports: resolvePackageRoot, listComponentFiles, readSourceFile, listTopLevelDirectories
    Expected Result: TypeScript compiles without errors, all functions exported
    Failure Indicators: Type errors, missing exports
    Evidence: .sisyphus/evidence/task-2-compile.txt

  Scenario: Path traversal prevention
    Tool: Bash
    Preconditions: source-code-reader.ts compiled
    Steps:
      1. Create a test script that calls readSourceFile with path containing "../../../etc/passwd"
      2. Verify it throws an error (not reads the file)
    Expected Result: Error thrown with message about path traversal
    Failure Indicators: File content returned instead of error
    Evidence: .sisyphus/evidence/task-2-path-traversal.txt
  ```

  **Commit**: YES (group 2)
  - Message: `feat(tools): add source code reading tools`
  - Files: `src/utils/source-code-reader.ts`

- [x] 3. Create `src/utils/remove-function-body.ts` — AST function body stripping

  **What to do**:
  - 从 `reference/mcp/semi-mcp/src/utils/remove-function-body.ts` 完整复制代码
  - **几乎不做修改**，因为该文件是纯 AST 工具函数，无任何 HTTP 依赖
  - 唯一需要调整：`findAllFunctions` 的默认 `filename` 参数从 `'code.tsx'` 改为根据文件后缀智能选择（如传入 `.js` 就用 `code.js`）—— 但这实际上 oxc-parser 对 filename 的要求仅用于判断 JSX 支持和语法模式，`.tsx` 作为默认值已是最宽松模式，**建议保持原样不改**
  - 确保所有 4 个导出函数完整：`findAllFunctions`, `removeFunctionBodies`, `extractFunction`, `getFunctionNames`
  - 确保 2 个类型导出完整：`FunctionInfo`, `ASTNode`（ASTNode 保留为非导出的内部 interface 也可）
  - 文件头添加简要注释说明来源和用途

  **Must NOT do**:
  - 不修改 AST 遍历逻辑
  - 不添加缓存
  - 不添加额外依赖（只用 oxc-parser）
  - 不重构函数签名（保持 semi-mcp 一致的 API）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 本质是复制 + 微调，无复杂设计决策
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 4)
  - **Blocks**: Tasks 5, 6
  - **Blocked By**: Task 1 (需要 oxc-parser 已安装)

  **References**:

  **Pattern References**:
  - `reference/mcp/semi-mcp/src/utils/remove-function-body.ts:1-352` — **完整源文件**，直接复制。关键导出：`findAllFunctions`(L256), `removeFunctionBodies`(L287), `extractFunction`(L329), `getFunctionNames`(L347)
  - `reference/mcp/semi-mcp/src/utils/remove-function-body.ts:6` — `import { parseSync } from 'oxc-parser'` 导入方式
  - `reference/mcp/semi-mcp/src/utils/remove-function-body.ts:87-206` — `extractFunctionsFromAST` 核心 AST 遍历（处理 6 种函数节点类型）
  - `reference/mcp/semi-mcp/src/utils/remove-function-body.ts:211-251` — `extractVariableDeclarationFunctions` 处理 `const fn = () => {}` 模式

  **API/Type References**:
  - `reference/mcp/semi-mcp/src/utils/remove-function-body.ts:11-24` — `FunctionInfo` 接口定义
  - `reference/mcp/semi-mcp/src/utils/remove-function-body.ts:29-47` — `ASTNode` 接口定义

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: oxc-parser installed (Task 1 complete), file created
    Steps:
      1. Run `npx tsc --noEmit src/utils/remove-function-body.ts` — exit code 0
      2. Verify exports: `grep -c "^export" src/utils/remove-function-body.ts` — at least 4 export statements
    Expected Result: No type errors, 4+ exports present
    Failure Indicators: tsc errors, missing exports
    Evidence: .sisyphus/evidence/task-3-compile.txt

  Scenario: Function body removal works correctly
    Tool: Bash
    Preconditions: File compiled successfully
    Steps:
      1. Create test script that imports removeFunctionBodies and runs it on a sample with 2 functions
      2. Input: `function hello() { console.log("hi"); return 1; }\nconst arrow = () => { return 2; }`
      3. Verify output contains `function hello() { ... }` and `const arrow = () => { ... }`
    Expected Result: Function bodies replaced with `{ ... }`, other code preserved
    Failure Indicators: Bodies not replaced, or code corrupted
    Evidence: .sisyphus/evidence/task-3-function-body-removal.txt

  Scenario: Function extraction works correctly
    Tool: Bash
    Preconditions: File compiled successfully
    Steps:
      1. Create test script that imports extractFunction
      2. Input code with function `hello`, extract by name "hello"
      3. Verify full function code returned
      4. Extract non-existent "nonexistent" — verify returns null
    Expected Result: Correct function extracted by name; null for missing
    Failure Indicators: Wrong function returned, crash on missing name
    Evidence: .sisyphus/evidence/task-3-function-extraction.txt
  ```

  **Commit**: YES (group 2 — bundled with Tasks 2, 4, 5, 6)
  - Message: `feat(tools): add source code reading tools`
  - Files: `src/utils/remove-function-body.ts`

- [x] 4. Create `src/tools/get-component-file-list.ts` — component file list tool

  **What to do**:
  - 创建 `src/tools/get-component-file-list.ts`
  - 导入 `resolvePackageRoot`, `listComponentFiles`, `listTopLevelDirectories` from `../utils/source-code-reader.js`

  **工具定义 `getComponentFileListTool: Tool`**:
  - name: `'get_component_file_list'`
  - description: 说明用途（获取组件所有源文件路径），给出路径格式示例（`@my-design/react/Button/index.tsx`），说明推荐工作流（先文件列表 → 再 get_file_code → 再 get_function_code）
  - inputSchema:
    - `componentName` (required, string): 组件名称，大小写不敏感
    - `packageName` (optional, string): npm 包名，默认 `@my-design/react`

  **处理器 `handleGetComponentFileList`**:
  - 参数校验：componentName 缺失 → isError: true
  - 调用 `resolvePackageRoot(packageName)` 获取包根目录
    - 如果抛出异常（包不存在）→ 返回友好错误信息 + isError: true
  - 调用 `listComponentFiles(packageRoot, componentName)` 获取文件列表
    - 如果返回空列表（组件不存在）→ 调用 `listTopLevelDirectories(packageRoot)` 获取可用目录列表，返回建议
  - 成功时：返回格式化输出，包含：
    - 组件名、包名、文件总数
    - 文件类型统计（.ts, .tsx, .js, .jsx, .scss, .css, 其他）
    - 文件列表（每行一个完整路径）
    - 提示语：使用 get_file_code 获取文件代码
  - 导出 `getComponentFileListTool` 和 `handleGetComponentFileList`

  **Must NOT do**:
  - 不添加版本参数（无版本概念）
  - 不添加双包查询（semi-mcp 查 foundation+ui 两个包，我们只查一个包）

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要正确适配 semi-mcp 模式到本地 fs 模式，有一定设计工作
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Task 3)
  - **Blocks**: Task 7
  - **Blocked By**: Task 2 (需要 source-code-reader.ts)

  **References**:

  **Pattern References**:
  - `reference/mcp/semi-mcp/src/tools/get-component-file-list.ts:98-127` — 工具定义格式（name, description, inputSchema）
  - `reference/mcp/semi-mcp/src/tools/get-component-file-list.ts:129-214` — 处理器实现模式（参数校验 → 调用 → 格式化输出）
  - `reference/mcp/semi-mcp/src/tools/get-component-file-list.ts:165-193` — 输出格式化（组件名 + 版本 + 统计 + 文件列表）
  - `src/tools/component-list.ts` — 现有工具定义 + 处理器导出模式（Tool + handler + export）

  **API/Type References**:
  - `src/utils/source-code-reader.ts` (Task 2 创建) — `resolvePackageRoot`, `listComponentFiles`, `listTopLevelDirectories` 函数签名

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: source-code-reader.ts exists (Task 2), file created
    Steps:
      1. Run `npx tsc --noEmit src/tools/get-component-file-list.ts` — exit code 0
      2. Verify exports: file exports `getComponentFileListTool` and `handleGetComponentFileList`
    Expected Result: No type errors, both exports present
    Failure Indicators: Type errors, missing exports
    Evidence: .sisyphus/evidence/task-4-compile.txt

  Scenario: Missing componentName returns error
    Tool: Bash
    Preconditions: File compiled
    Steps:
      1. Create script that calls `handleGetComponentFileList({})` (no componentName)
      2. Verify result has `isError: true`
      3. Verify result text contains "componentName" (tells user what's missing)
    Expected Result: isError: true with helpful message
    Failure Indicators: Crash or success without componentName
    Evidence: .sisyphus/evidence/task-4-missing-param.txt

  Scenario: Package not installed returns friendly error
    Tool: Bash
    Preconditions: File compiled
    Steps:
      1. Call `handleGetComponentFileList({ componentName: 'Button', packageName: '@nonexistent/pkg' })`
      2. Verify result has `isError: true`
      3. Verify error message mentions the package name
    Expected Result: Friendly error about package not found, no stack trace
    Failure Indicators: Unhandled exception, generic error
    Evidence: .sisyphus/evidence/task-4-missing-package.txt
  ```

  **Commit**: YES (group 2 — bundled with Tasks 2, 3, 5, 6)
  - Message: `feat(tools): add source code reading tools`
  - Files: `src/tools/get-component-file-list.ts`

- [x] 5. Create `src/tools/get-file-code.ts` — file code reading tool

  **What to do**:
  - 创建 `src/tools/get-file-code.ts`
  - 导入 `resolvePackageRoot`, `readSourceFile` from `../utils/source-code-reader.js`
  - 导入 `removeFunctionBodies` from `../utils/remove-function-body.js`

  **辅助函数 `parseFilePath(fullPath: string)`**:
  - 输入: `@my-design/react/Button/index.tsx`
  - 输出: `{ packageName: '@my-design/react', relativePath: 'Button/index.tsx' }`
  - 解析逻辑：匹配 `@scope/pkg/rest` 格式，提取包名和相对路径
  - 正则：`/^(@[^/]+\/[^/]+)\/(.+)$/` — 通用匹配，不硬编码包名

  **辅助函数 `isScriptFile(filePath: string): boolean`**:
  - 判断是否为 .ts/.tsx/.js/.jsx 文件（适用函数体剥离的文件类型）

  **常量**:
  - `LINE_THRESHOLD = 500` — 超过此行数才剥离函数体

  **工具定义 `getFileCodeTool: Tool`**:
  - name: `'get_file_code'`
  - description: 说明功能（获取文件代码），说明默认行为（大文件自动剥离函数体）和 fullCode 参数，给出路径格式示例
  - inputSchema:
    - `filePath` (required, string): 完整文件路径，格式 `@my-design/react/Button/index.tsx`
    - `fullCode` (optional, boolean): 是否获取完整代码，默认 false

  **处理器 `handleGetFileCode`**:
  - 参数校验：filePath 缺失 → isError: true
  - 解析路径 `parseFilePath(filePath)`
    - 解析失败 → 返回错误 + 正确格式示例
  - 调用 `resolvePackageRoot(parsed.packageName)` → 获取包根目录
    - 包不存在 → 友好错误
  - 调用 `readSourceFile(packageRoot, parsed.relativePath)` → 获取文件内容
    - 文件不存在 / 二进制文件 → 友好错误
  - 统计行数 `content.split('\n').length`
  - 判断是否需要剥离：`isScriptFile(filePath) && !fullCode && lineCount >= LINE_THRESHOLD`
    - 如果是 → `removeFunctionBodies(content, filePath)` 传文件名以确定解析模式
    - 如果否 → 直接返回原始内容
  - 成功时返回格式化输出：
    - 文件路径、行数、大小
    - 如果经过函数体剥离：添加处理提示（推荐用 get_function_code 精读）
    - 分割线
    - 代码内容
  - 导出 `getFileCodeTool` 和 `handleGetFileCode`

  **Must NOT do**:
  - 不添加版本参数
  - 不添加缓存
  - 不添加语法高亮或行号

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 需要正确组合 source-code-reader 和 remove-function-body，有集成逻辑
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 6)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3 (需要 source-code-reader.ts + remove-function-body.ts)

  **References**:

  **Pattern References**:
  - `reference/mcp/semi-mcp/src/tools/get-file-code.ts:16-26` — `parseFilePath` 函数（需适配从 `@douyinfe/semi-*` 到通用 `@scope/pkg` 格式）
  - `reference/mcp/semi-mcp/src/tools/get-file-code.ts:38-72` — 工具定义格式（description 写法、inputSchema）
  - `reference/mcp/semi-mcp/src/tools/get-file-code.ts:74-152` — 处理器实现（参数校验 → 读取 → 判断 → 格式化）
  - `reference/mcp/semi-mcp/src/tools/get-file-code.ts:114-119` — 函数体剥离判断逻辑 + removeFunctionBodies 调用
  - `src/tools/component-details.ts` — 现有工具的参数校验和错误处理模式

  **API/Type References**:
  - `src/utils/source-code-reader.ts` (Task 2) — `resolvePackageRoot`, `readSourceFile` 签名
  - `src/utils/remove-function-body.ts` (Task 3) — `removeFunctionBodies(code, filename)` 签名

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: Tasks 2, 3 complete; file created
    Steps:
      1. Run `npx tsc --noEmit src/tools/get-file-code.ts` — exit code 0
      2. Verify exports: `getFileCodeTool` and `handleGetFileCode`
    Expected Result: No type errors, both exports present
    Failure Indicators: Type errors, missing imports
    Evidence: .sisyphus/evidence/task-5-compile.txt

  Scenario: Missing filePath returns error
    Tool: Bash
    Preconditions: File compiled
    Steps:
      1. Call `handleGetFileCode({})` (no filePath)
      2. Verify `isError: true`
      3. Verify message mentions "filePath"
    Expected Result: isError: true with parameter guidance
    Failure Indicators: Crash or silent success
    Evidence: .sisyphus/evidence/task-5-missing-param.txt

  Scenario: Invalid path format returns error with example
    Tool: Bash
    Preconditions: File compiled
    Steps:
      1. Call `handleGetFileCode({ filePath: 'just-a-filename.ts' })`
      2. Verify `isError: true`
      3. Verify error message includes correct path format example
    Expected Result: Error with format guidance like "@my-design/react/Component/file.ts"
    Failure Indicators: Generic error without guidance
    Evidence: .sisyphus/evidence/task-5-invalid-path.txt
  ```

  **Commit**: YES (group 2 — bundled with Tasks 2, 3, 4, 6)
  - Message: `feat(tools): add source code reading tools`
  - Files: `src/tools/get-file-code.ts`

- [x] 6. Create `src/tools/get-function-code.ts` — function code extraction tool

  **What to do**:
  - 创建 `src/tools/get-function-code.ts`
  - 导入 `resolvePackageRoot`, `readSourceFile` from `../utils/source-code-reader.js`
  - 导入 `extractFunction`, `getFunctionNames` from `../utils/remove-function-body.js`

  **辅助函数 `parseFilePath`**:
  - 与 Task 5 相同逻辑。注意：**不要提取公共 parseFilePath**，两个文件各自内联一份即可（保持与 semi-mcp 一致的模式，每个工具文件自包含）

  **工具定义 `getFunctionCodeTool: Tool`**:
  - name: `'get_function_code'`
  - description: 说明功能（精读指定函数完整实现），列出支持的函数类型（声明/箭头/类方法/getter/setter），给出路径格式示例
  - inputSchema:
    - `filePath` (required, string): 完整文件路径
    - `functionName` (required, string): 函数名称

  **处理器 `handleGetFunctionCode`**:
  - 参数校验：filePath 和 functionName 缺失 → 各自返回 isError: true
  - 解析路径 `parseFilePath(filePath)` → 失败返回格式错误
  - 调用 `resolvePackageRoot(parsed.packageName)` → 包不存在返回友好错误
  - 调用 `readSourceFile(packageRoot, parsed.relativePath)` → 文件读取失败返回友好错误
  - 调用 `extractFunction(content, functionName, filePath)` 传文件名确定解析模式
    - 如果返回 null（函数未找到）：
      - 调用 `getFunctionNames(content, filePath)` 获取所有函数名
      - 返回 isError: true + "未找到函数 X" + "文件中可用函数（共 N 个）：" + 函数名列表
    - 如果找到：返回格式化输出（文件路径 + 函数名 + 分割线 + 函数代码）
  - 导出 `getFunctionCodeTool` 和 `handleGetFunctionCode`

  **Must NOT do**:
  - 不添加版本参数
  - 不支持正则匹配函数名
  - 不支持同时提取多个函数

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`
    - Reason: 与 Task 5 类似的集成复杂度
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Task 5)
  - **Blocks**: Task 7
  - **Blocked By**: Tasks 2, 3 (需要 source-code-reader.ts + remove-function-body.ts)

  **References**:

  **Pattern References**:
  - `reference/mcp/semi-mcp/src/tools/get-function-code.ts:13-22` — `parseFilePath` 函数（适配到通用格式）
  - `reference/mcp/semi-mcp/src/tools/get-function-code.ts:24-57` — 工具定义（description、inputSchema with 2 required params）
  - `reference/mcp/semi-mcp/src/tools/get-function-code.ts:59-161` — 处理器实现（参数校验 → 读取 → 提取 → 未找到时列出可用函数）
  - `reference/mcp/semi-mcp/src/tools/get-function-code.ts:109-129` — **关键：函数未找到时的降级处理模式**（getFunctionNames + 格式化列表）
  - `src/tools/component-details.ts` — 现有工具错误处理模式

  **API/Type References**:
  - `src/utils/source-code-reader.ts` (Task 2) — `resolvePackageRoot`, `readSourceFile` 签名
  - `src/utils/remove-function-body.ts` (Task 3) — `extractFunction(code, functionName, filename)`, `getFunctionNames(code, filename)` 签名

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: TypeScript compiles without errors
    Tool: Bash
    Preconditions: Tasks 2, 3 complete; file created
    Steps:
      1. Run `npx tsc --noEmit src/tools/get-function-code.ts` — exit code 0
      2. Verify exports: `getFunctionCodeTool` and `handleGetFunctionCode`
    Expected Result: No type errors, both exports present
    Failure Indicators: Type errors, missing imports
    Evidence: .sisyphus/evidence/task-6-compile.txt

  Scenario: Missing required params return specific errors
    Tool: Bash
    Preconditions: File compiled
    Steps:
      1. Call `handleGetFunctionCode({})` — verify error mentions filePath
      2. Call `handleGetFunctionCode({ filePath: '@my-design/react/Button/index.tsx' })` — verify error mentions functionName
    Expected Result: Each missing param gets its own clear error
    Failure Indicators: Generic error, crash
    Evidence: .sisyphus/evidence/task-6-missing-params.txt

  Scenario: Non-existent function returns available function list
    Tool: Bash
    Preconditions: A test file exists with known functions (use a real file from @my-design/react if installed, or create a temp file)
    Steps:
      1. Call handler with valid filePath but `functionName: 'thisDoesNotExist'`
      2. Verify `isError: true`
      3. Verify response text contains "未找到函数" and lists available function names
    Expected Result: Error with function names list as suggestion
    Failure Indicators: Crash, empty error, no suggestions
    Evidence: .sisyphus/evidence/task-6-function-not-found.txt
  ```

  **Commit**: YES (group 2 — bundled with Tasks 2, 3, 4, 5)
  - Message: `feat(tools): add source code reading tools`
  - Files: `src/tools/get-function-code.ts`

- [x] 7. Register all new tools in `src/tools/index.ts` and `src/index.ts`

  **What to do**:

  **更新 `src/tools/index.ts`**:
  - 在现有 import 块之后，添加 3 个新 import：
    ```
    import { getComponentFileListTool, handleGetComponentFileList } from './get-component-file-list.js';
    import { getFileCodeTool, handleGetFileCode } from './get-file-code.js';
    import { getFunctionCodeTool, handleGetFunctionCode } from './get-function-code.js';
    ```
  - 在 `tools` 数组中追加 3 个新工具：`getComponentFileListTool`, `getFileCodeTool`, `getFunctionCodeTool`
  - 在 `toolHandlers` 对象中追加 3 个映射：
    ```
    [getComponentFileListTool.name]: handleGetComponentFileList,
    [getFileCodeTool.name]: handleGetFileCode,
    [getFunctionCodeTool.name]: handleGetFunctionCode,
    ```
  - 在底部 re-export 块中追加 6 个新导出

  **更新 `src/index.ts`**:
  - 在 tools re-export 块中追加 6 个新导出（3 个 Tool + 3 个 handler）
  - 在 utils export 块中追加新的 source-code-reader exports：`resolvePackageRoot`, `listComponentFiles`, `readSourceFile`, `listTopLevelDirectories`
  - 在 utils export 块中追加新的 remove-function-body exports：`findAllFunctions`, `removeFunctionBodies`, `extractFunction`, `getFunctionNames`
  - 在类型导出块中追加：`FunctionInfo` type from remove-function-body

  **验证**：
  - 运行 `npm run build` 确保编译成功

  **Must NOT do**:
  - 不修改任何现有 import 或 export（只追加）
  - 不改变现有工具的注册顺序
  - 不修改 `src/server.ts`（server.ts 已经动态从 tools/index.ts 获取工具列表）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯追加操作，无设计决策
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (solo)
  - **Blocks**: Task 8
  - **Blocked By**: Tasks 4, 5, 6 (所有工具文件必须存在)

  **References**:

  **Pattern References**:
  - `src/tools/index.ts:1-64` — **完整文件**，在此基础上追加。关键位置：imports(L10-16), tools 数组(L21-29), toolHandlers(L34-45), re-exports(L48-63)
  - `src/index.ts:1-62` — **完整文件**，在此基础上追加。关键位置：tools re-exports(L11-28), utils exports(L31-49), type exports(L52-61)

  **API/Type References**:
  - `src/tools/get-component-file-list.ts` (Task 4) — 导出 `getComponentFileListTool`, `handleGetComponentFileList`
  - `src/tools/get-file-code.ts` (Task 5) — 导出 `getFileCodeTool`, `handleGetFileCode`
  - `src/tools/get-function-code.ts` (Task 6) — 导出 `getFunctionCodeTool`, `handleGetFunctionCode`
  - `src/utils/source-code-reader.ts` (Task 2) — 导出 `resolvePackageRoot`, `listComponentFiles`, `readSourceFile`, `listTopLevelDirectories`
  - `src/utils/remove-function-body.ts` (Task 3) — 导出 `findAllFunctions`, `removeFunctionBodies`, `extractFunction`, `getFunctionNames`, type `FunctionInfo`

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Build succeeds with all tools registered
    Tool: Bash
    Preconditions: All Tasks 2-6 complete, index files updated
    Steps:
      1. Run `npm run build` — exit code 0
      2. Check `ls dist/` — all expected files exist
    Expected Result: Clean build with no errors
    Failure Indicators: Import errors, type errors, missing module errors
    Evidence: .sisyphus/evidence/task-7-build.txt

  Scenario: 10 tools registered in tools array
    Tool: Bash
    Preconditions: Build successful
    Steps:
      1. Run `node -e "import('./dist/index.js').then(m => console.log('Tool count:', m.tools.length))"`
      2. Verify output: `Tool count: 10`
      3. Run `node -e "import('./dist/index.js').then(m => m.tools.forEach(t => console.log(t.name)))"`
      4. Verify all 10 tool names are printed, including `get_component_file_list`, `get_file_code`, `get_function_code`
    Expected Result: Exactly 10 tools, all 3 new ones present
    Failure Indicators: Count != 10, missing tool names
    Evidence: .sisyphus/evidence/task-7-tool-count.txt

  Scenario: All tool handlers are registered
    Tool: Bash
    Preconditions: Build successful
    Steps:
      1. Run `node -e "import('./dist/index.js').then(m => console.log('Handler count:', Object.keys(m.toolHandlers).length))"`
      2. Verify output: `Handler count: 10`
      3. Verify handlers include keys: `get_component_file_list`, `get_file_code`, `get_function_code`
    Expected Result: 10 handlers, all 3 new ones present
    Failure Indicators: Count != 10, missing handler keys
    Evidence: .sisyphus/evidence/task-7-handler-count.txt

  Scenario: Existing tools not broken
    Tool: Bash
    Preconditions: Build successful
    Steps:
      1. Run `node -e "import('./dist/index.js').then(m => { const names = m.tools.map(t=>t.name); ['component_list','component_search','component_details','component_examples','theme_tokens','changelog_query','get_code_block'].forEach(n => console.log(n, names.includes(n) ? 'OK' : 'MISSING')) })"`
      2. Verify all 7 original tools show "OK"
    Expected Result: All 7 original tools still registered
    Failure Indicators: Any original tool shows "MISSING"
    Evidence: .sisyphus/evidence/task-7-existing-tools.txt
  ```

  **Commit**: YES (group 3)
  - Message: `feat(tools): register source code tools in server`
  - Files: `src/tools/index.ts`, `src/index.ts`
  - Pre-commit: `npm run build`

- [x] 8. End-to-end build verification

  **What to do**:
  - 运行完整构建流程：`npm run build`
  - 验证 dist 目录包含所有输出文件
  - 验证工具数量和名称
  - 验证无回归（现有功能不受影响）
  - 如果项目安装了 `@my-design/react`，做一次真实的端到端调用测试

  **Must NOT do**:
  - 不修改任何源文件
  - 不创建新的源代码文件（`.sisyphus/evidence/` 下的验证产物除外）

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 纯验证，无代码变更
  - **Skills**: []

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 5 (solo, final)
  - **Blocks**: None (final task before verification wave)
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `package.json` — `scripts.build` 命令定义
  - `rslib.config.ts` — 构建配置

  **Acceptance Criteria**:

  **QA Scenarios (MANDATORY):**

  ```
  Scenario: Full build succeeds from clean state
    Tool: Bash
    Preconditions: All Tasks 1-7 complete
    Steps:
      1. Run `rm -rf dist/` — clean old artifacts
      2. Run `npm run build` — exit code 0
      3. Verify `ls dist/` — index.js, stdio.js, http.js exist (or whichever outputs rslib.config.ts defines)
    Expected Result: Clean build, all output files present
    Failure Indicators: Build errors, missing dist files
    Evidence: .sisyphus/evidence/task-8-clean-build.txt

  Scenario: Tool count verification (10 tools)
    Tool: Bash
    Preconditions: Build successful
    Steps:
      1. Run `node -e "import('./dist/index.js').then(m => { console.log('Tools:', m.tools.length); console.log('Handlers:', Object.keys(m.toolHandlers).length); m.tools.forEach(t => console.log(' -', t.name)); })"`
      2. Verify: Tools = 10, Handlers = 10
      3. Verify all 10 tool names are listed
    Expected Result: 10 tools, 10 handlers, all names correct
    Failure Indicators: Wrong counts, missing names
    Evidence: .sisyphus/evidence/task-8-tool-verification.txt

  Scenario: New utility exports accessible
    Tool: Bash
    Preconditions: Build successful
    Steps:
      1. Run `node -e "import('./dist/index.js').then(m => { ['resolvePackageRoot','listComponentFiles','readSourceFile','findAllFunctions','removeFunctionBodies','extractFunction','getFunctionNames'].forEach(fn => console.log(fn, typeof m[fn] === 'function' ? 'OK' : 'MISSING')) })"`
      2. Verify all 7 utility functions show "OK"
    Expected Result: All utility functions exported and accessible
    Failure Indicators: Any function shows "MISSING"
    Evidence: .sisyphus/evidence/task-8-exports.txt

  Scenario: Graceful error when package not installed (if @my-design/react not in node_modules)
    Tool: Bash
    Preconditions: Build successful, @my-design/react may not be installed
    Steps:
      1. Run `node -e "import('./dist/index.js').then(m => m.toolHandlers['get_component_file_list']({ componentName: 'Button' }).then(r => console.log(JSON.stringify(r, null, 2))))"`
      2. If @my-design/react IS installed: verify success with file list
      3. If @my-design/react NOT installed: verify isError: true with friendly message (no stack trace)
    Expected Result: Either success with real data OR clean error message
    Failure Indicators: Unhandled exception, crash, stack trace in output
    Evidence: .sisyphus/evidence/task-8-e2e-graceful.txt
  ```

  **Commit**: NO (pure verification, no code changes)

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle`
  Read the plan end-to-end. For each "Must Have": verify implementation exists. For each "Must NOT Have": search codebase for forbidden patterns. Check evidence files exist. Compare deliverables against plan.
  Output: `Must Have [N/N] | Must NOT Have [N/N] | Tasks [N/N] | VERDICT: APPROVE/REJECT`

- [x] F2. **Code Quality Review** — `unspecified-high`
  Run `npm run build`. Review all new files for: `as any` usage, empty catches, console.log in prod, path traversal holes, unhandled error cases. Check AI slop: excessive comments, over-abstraction.
  Output: `Build [PASS/FAIL] | Files [N clean/N issues] | VERDICT`

- [x] F3. **Scope Fidelity Check** — `deep`
  For each task: read "What to do", read actual code. Verify 1:1 — everything in spec was built, nothing beyond spec was built. Check "Must NOT do" compliance. Flag unaccounted changes.
  Output: `Tasks [N/N compliant] | Unaccounted [CLEAN/N files] | VERDICT`

---

## Commit Strategy

- **Commit 1** (after Task 1): `chore(deps): add oxc-parser for AST-based function extraction` — package.json, package-lock.json
- **Commit 2** (after Tasks 2-6): `feat(tools): add source code reading tools (file list, file code, function code)` — all new src files
- **Commit 3** (after Task 7): `feat(tools): register source code tools in server` — index.ts files

---

## Success Criteria

### Verification Commands
```bash
npm run build                    # Expected: exit 0, no errors
node -e "import('./dist/index.js').then(m => console.log(m.tools.length))"  # Expected: 10
```

### Final Checklist
- [x] All "Must Have" present
- [x] All "Must NOT Have" absent
- [x] `npm run build` succeeds
- [x] 10 tools registered (7 existing + 3 new)
- [x] No existing tools broken
