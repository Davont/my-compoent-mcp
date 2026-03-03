/**
 * 组件库配置
 *
 * 集中管理组件库名称相关的常量，方便复用到其他组件库时一处修改。
 *
 * 换库时需同步修改：
 * - 此文件的所有常量
 * - package.json 的 name、bin 字段、keywords
 * - doc/ 目录下各组件 .md 文件中的 import 示例代码（grep "@my-design/react" 全局替换）
 */

/**
 * 组件库 ID（slug），用于：
 * - MCP 资源 URI 前缀：`${LIBRARY_ID}://components`
 * - MCP server name：`${LIBRARY_ID}-mcp`
 * - --help 里显示的 bin 命令名：`${LIBRARY_ID}-mcp-http`
 * - 必须是 URI-safe 字符（字母、数字、连字符），不能含空格或中文
 *
 * ⚠️  修改此值后需同步更新 package.json 的 bin 字段（无法自动同步）：
 *   "bin": { "${LIBRARY_ID}-mcp": "...", "${LIBRARY_ID}-mcp-http": "..." }
 */
export const LIBRARY_ID = 'my-design';

/**
 * 组件库展示名，用于日志、工具描述等纯文案场景
 * 可以是任意可读字符串
 */
export const LIBRARY_DISPLAY_NAME = 'my-design';

/**
 * 组件库 React npm 包名，用于 import 语句默认值、source_inspect 等
 */
export const PACKAGE_NAME = '@my-design/react';

/**
 * 环境变量名，用于覆盖组件库包的根目录路径
 * 修改此常量后，用户需同步更新本地 .env / shell 配置中的变量名
 */
export const ENV_PACKAGE_ROOT = 'COMPONENT_PACKAGE_ROOT';

/**
 * 兼容旧环境变量名（MY_DESIGN_PACKAGE_ROOT），过渡期同时读取
 * 待用户迁移完成后可删除此行
 */
export const ENV_PACKAGE_ROOT_LEGACY = 'MY_DESIGN_PACKAGE_ROOT';
