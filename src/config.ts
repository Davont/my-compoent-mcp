/**
 * 组件库配置
 *
 * 集中管理组件库名称相关的常量，方便复用到其他组件库时一处修改。
 *
 * 换库时需同步修改：
 * - 此文件的所有常量
 * - package.json 的 name、bin 字段、keywords
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
export const LIBRARY_ID = 'semi-design';

/**
 * 组件库展示名，用于日志、工具描述等纯文案场景
 * 可以是任意可读字符串
 */
export const LIBRARY_DISPLAY_NAME = 'Semi Design';

/**
 * 组件库 React npm 包名
 *
 * Semi Design 统一使用 @douyinfe/semi-ui 包名。
 */
export const PACKAGE_NAME = '@douyinfe/semi-ui';

/**
 * 默认 import 风格（当组件文档 frontmatter 未指定 import 时使用）
 * - 'named':   import { Button } from '@douyinfe/semi-ui';
 * - 'default': import Button from '@douyinfe/semi-ui';
 *
 * Semi Design 统一使用 named export
 */
export const DEFAULT_IMPORT_STYLE: 'named' | 'default' = 'named';

/**
 * 文档子目录名
 *
 * 指定 doc/ 下的子目录作为文档根，用于同仓库维护多套组件库文档。
 * - 空字符串 ''：直接使用 doc/（my-design）
 * - 'semi'：使用 doc/semi/
 *
 * 可通过环境变量 DOC_SUBDIR 覆盖
 */
export const DOC_SUBDIR = 'semi';

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

/**
 * 环境变量名，用于覆盖 .octo/ 目录的路径
 * 默认值：process.cwd()/.octo
 * 在 MCP 客户端 cwd 不确定的场景下，通过此变量指定设计稿目录
 * 示例：OCTO_DIR=/Users/xxx/my-project/.octo
 */
export const ENV_OCTO_DIR = 'OCTO_DIR';

/**
 * design_to_code 工具的默认输出格式
 * - 'html':  React 脚手架（CSS + JSX，推荐弱模型）
 * - 'dsl':   精简 JSON（token 少，适合强模型）
 * - 'devUI': Vue SFC（含组件库组件代码 + scoped style）
 */
export type OutputMode = 'html' | 'dsl' | 'devUI';
export const DEFAULT_OUTPUT_MODE: OutputMode = 'html';
