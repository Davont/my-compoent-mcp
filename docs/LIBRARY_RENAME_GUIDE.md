# 组件库改名操作指南（MCP）

适用场景：
- 组件库展示名要改（例如 `my-design` -> `acme-ui`）
- npm 包名要改（例如 `@my-design/react` -> `@acme/ui-react`）
- 希望 MCP 服务尽量只改少量配置

---

## 1. 先改中心配置（必须）

修改 `src/config.ts`：

- `LIBRARY_ID`
  - 用于 MCP server name、resources URI 前缀、help 中命令名展示
  - 必须是 URI-safe（字母/数字/连字符）
- `LIBRARY_DISPLAY_NAME`
  - 仅用于对外文案展示
- `PACKAGE_NAME`
  - 组件 npm 包名，影响 import 默认输出和源码工具默认包名
- `ENV_PACKAGE_ROOT`
  - 覆盖组件包根目录的环境变量名（默认 `COMPONENT_PACKAGE_ROOT`）
- `ENV_PACKAGE_ROOT_LEGACY`
  - 旧变量兼容（默认 `MY_DESIGN_PACKAGE_ROOT`）

---

## 2. 同步 package.json（必须）

修改 `package.json`：

- `name`
- `description`
- `bin`
  - 建议与 `LIBRARY_ID` 保持一致（例如 `${LIBRARY_ID}-mcp` / `${LIBRARY_ID}-mcp-http`）
- `keywords`（可选）

注意：
- `src/http.ts --help` 会显示 `${LIBRARY_ID}-mcp-http`。
- 如果 `bin` 不同步，help 里显示的命令名与真实可执行命令会不一致。

---

## 3. MCP 客户端配置同步（必须）

如果你本地/团队使用 MCP 客户端配置，需要同步：

- `command` / `args`（如果你改了包名或入口）
- 环境变量名：
  - 新变量：`COMPONENT_PACKAGE_ROOT`（或你在 `ENV_PACKAGE_ROOT` 里设置的名字）
  - 旧变量 `MY_DESIGN_PACKAGE_ROOT` 仍可用（过渡兼容）

---

## 4. 文档 import 示例（建议）

当前 `get_context_bundle` 已支持根据 `PACKAGE_NAME` 重写 frontmatter import 的包名。

但建议仍把 `doc/components/*.md` frontmatter 的 `import` 字段同步到新包名，避免文档和真实输出不一致。

---

## 5. 自检命令（建议）

改完后在仓库根目录执行：

```bash
rg -n "my-design|@my-design/react|MY_DESIGN_PACKAGE_ROOT" src docs doc package.json
npm run build
npx rstest run
```

检查要点：
- 不应残留旧品牌/旧包名（注释里可少量保留历史说明）
- build 必须通过
- tests 必须通过

---

## 6. 影响说明（对接方需要感知）

- 如果改了 `LIBRARY_ID`，resources URI 会变化（如 `my-design://...` -> `acme-ui://...`）。
- 如果改了 `bin`，CLI 命令会变化。
- 如果改了环境变量名，部署/本地脚本需要同步更新。

