/**
 * 工具注册
 *
 * 对外公开 7 个工具。旧工具 handler 保留可内部复用，但不注册到 MCP。
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// 公开工具
import { getContextBundleTool, handleGetContextBundle } from './get-context-bundle.js';
import { componentSearchTool, handleComponentSearch } from './component-search.js';
import { componentDetailsTool, handleComponentDetails } from './component-details.js';
import { themeTokensTool, handleThemeTokens } from './theme-tokens.js';
import { changelogQueryTool, handleChangelogQuery } from './changelog-query.js';
import { sourceInspectTool, handleSourceInspect } from './source-inspect.js';
import { designToCodeTool, handleDesignToCode } from './design-to-code.js';

// 内部保留（不对外注册，供 get_context_bundle 等内部编排复用）
import { handleComponentList } from './component-list.js';
import { handleComponentExamples } from './component-examples.js';
import { handleGetRelatedComponents } from './get-related-components.js';
import { handleGetCodeBlock } from './get-code-block.js';
import { handleGetComponentFileList } from './get-component-file-list.js';
import { handleGetFileCode } from './get-file-code.js';
import { handleGetFunctionCode } from './get-function-code.js';

/**
 * 对外公开的工具列表（ListTools 返回此数组）
 */
export const tools: Tool[] = [
  getContextBundleTool,
  componentSearchTool,
  componentDetailsTool,
  themeTokensTool,
  changelogQueryTool,
  sourceInspectTool,
  designToCodeTool,
];

/**
 * 工具名称到处理器的映射
 */
export const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<CallToolResult>
> = {
  [getContextBundleTool.name]: handleGetContextBundle,
  [componentSearchTool.name]: handleComponentSearch,
  [componentDetailsTool.name]: handleComponentDetails,
  [themeTokensTool.name]: handleThemeTokens,
  [changelogQueryTool.name]: handleChangelogQuery,
  [sourceInspectTool.name]: handleSourceInspect,
  [designToCodeTool.name]: handleDesignToCode,
};

// 重新导出公开工具
export {
  getContextBundleTool,
  handleGetContextBundle,
  componentSearchTool,
  handleComponentSearch,
  componentDetailsTool,
  handleComponentDetails,
  themeTokensTool,
  handleThemeTokens,
  changelogQueryTool,
  handleChangelogQuery,
  sourceInspectTool,
  handleSourceInspect,
  designToCodeTool,
  handleDesignToCode,
  // 内部工具 handler 也导出，供外部直接 import 使用
  handleComponentList,
  handleComponentExamples,
  handleGetRelatedComponents,
  handleGetCodeBlock,
  handleGetComponentFileList,
  handleGetFileCode,
  handleGetFunctionCode,
};
