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
