# Work Log

## 2026-03-02

### 背景
- 目标：减少 AI 在内网慢链路下的多次 MCP 往返，收敛工具面并提升一次调用拿到可用上下文的能力。

### 本次改动
- 新增聚合工具 `get_context_bundle`：支持 `uiType`（`form/table/modal/other`）、`depth`（`summary/full`）、内存缓存。
- 新增源码聚合工具 `source_inspect`：以 `mode` 合并原有源码三件套能力（列文件、读文件、读函数）。
- 对外 MCP 工具收敛：`src/tools/index.ts` 仅公开 6 个工具。
- `component_details` 扩展 `sections`：支持 `examples`、`related`。
- `http` 根路径 tools 列表改为动态读取注册工具，避免硬编码与真实注册不一致。
- 新增 `doc/profiles/*.json`（`form/table/modal`）和 `doc/profiles/README.md`。
- 新增测试：
  - `tests/tools/get-context-bundle.test.ts`
  - `tests/tools/source-inspect.test.ts`

### 对外公开工具（当前）
- `get_context_bundle`
- `component_search`
- `component_details`
- `theme_tokens`
- `changelog_query`
- `source_inspect`

### 下线但保留实现（不对外注册）
- `component_list`
- `component_examples`
- `get_code_block`
- `get_component_file_list`
- `get_file_code`
- `get_function_code`
- `get_related_components`

### 设计约定（本轮）
- `uiType=form/table/modal`：走模板化稳定输出，`goal` 不参与排序与编排。
- `uiType=other`：按 `goal` 做检索组装。

### 待继续（下一轮）
- 让 `constraints` 真正影响 token/checklist 裁剪。
- 若 `constraints` 影响输出，再把 `constraintsHash` 纳入缓存 key。
- 补充更多边界测试和回归测试。

---

## 2026-03-02（追加）

### 背景
- 目标：移除低使用率的 `uiType/profile` 路径，改为 `components/query` 驱动，提升场景泛化能力并降低 profile 维护成本。

### 本次追加改动
- `get_context_bundle` 参数重构：
  - 删除 `goal/uiType` 输入分支。
  - 新增 `components`（精准）和 `query`（模糊）输入。
- 新增 query 检索编排：
  - 在 `doc/index.json` 上执行 name/alias/keyword/category 匹配。
  - 按匹配等级排序并按 category 扩展同类组件。
  - 增加最大返回数截断（默认最多 5 个）与提示语。
- 数据源策略调整：
  - 新增 `.d.ts` Props 提取（`extractPropsFromDts`）。
  - 保留 `.md` 规则/示例读取，作为业务语义补充与降级路径。
- 输出策略调整：
  - summary：Props + 核心规则。
  - full：在 summary 基础上追加示例。
  - checklist 改为从组件“核心规则”自动提取（每组件最多 3 条）。
- 缓存策略更新：
  - 组件路径 key 改为排序后组件集合 + depth。
  - query 路径 key 使用 `q:{query}|{depth}`。
  - 修复 `components=[] + query` 时 key 分支判断。
- 工具文案同步：
  - 更新 `component_list` / `component_search` / `theme_tokens` 对 `get_context_bundle` 的引用描述，去除旧 `uiType` 语义。
- 测试更新：
  - 重写 `tests/tools/get-context-bundle.test.ts`，覆盖参数校验、query 排序、截断、别名、缓存等路径。

### 同步变更文件
- `src/tools/get-context-bundle.ts`
- `src/utils/doc-reader.ts`
- `src/utils/source-code-reader.ts`
- `src/tools/component-list.ts`
- `src/tools/component-search.ts`
- `src/tools/theme-tokens.ts`
- `tests/tools/get-context-bundle.test.ts`
- `doc/profiles/*`（删除）

### 已知事项
- 构建环境中仍存在与本次重构无关的声明生成问题：`@babel/parser` 类型解析失败（`npm run build` 阶段）。
