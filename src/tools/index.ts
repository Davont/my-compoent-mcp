/**
 * 工具注册
 * 
 * 导出所有工具定义和处理器
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// 导入所有工具
import { componentListTool, handleComponentList } from './component-list.js';
import { componentSearchTool, handleComponentSearch } from './component-search.js';
import { componentDetailsTool, handleComponentDetails } from './component-details.js';
import { componentExamplesTool, handleComponentExamples } from './component-examples.js';
import { themeTokensTool, handleThemeTokens } from './theme-tokens.js';
import { changelogQueryTool, handleChangelogQuery } from './changelog-query.js';

/**
 * 所有工具的定义
 */
export const tools: Tool[] = [
  componentListTool,
  componentSearchTool,
  componentDetailsTool,
  componentExamplesTool,
  themeTokensTool,
  changelogQueryTool,
];

/**
 * 工具名称到处理器的映射
 */
export const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<CallToolResult>
> = {
  [componentListTool.name]: handleComponentList,
  [componentSearchTool.name]: handleComponentSearch,
  [componentDetailsTool.name]: handleComponentDetails,
  [componentExamplesTool.name]: handleComponentExamples,
  [themeTokensTool.name]: handleThemeTokens,
  [changelogQueryTool.name]: handleChangelogQuery,
};

// 重新导出各工具
export {
  componentListTool,
  handleComponentList,
  componentSearchTool,
  handleComponentSearch,
  componentDetailsTool,
  handleComponentDetails,
  componentExamplesTool,
  handleComponentExamples,
  themeTokensTool,
  handleThemeTokens,
  changelogQueryTool,
  handleChangelogQuery,
};
