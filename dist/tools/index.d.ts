/**
 * 工具注册
 *
 * 导出所有工具定义和处理器
 */
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { componentListTool, handleComponentList } from './component-list.js';
import { componentSearchTool, handleComponentSearch } from './component-search.js';
import { componentDetailsTool, handleComponentDetails } from './component-details.js';
import { componentExamplesTool, handleComponentExamples } from './component-examples.js';
import { themeTokensTool, handleThemeTokens } from './theme-tokens.js';
import { changelogQueryTool, handleChangelogQuery } from './changelog-query.js';
import { getCodeBlockTool, handleGetCodeBlock } from './get-code-block.js';
/**
 * 所有工具的定义
 */
export declare const tools: Tool[];
/**
 * 工具名称到处理器的映射
 */
export declare const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<CallToolResult>>;
export { componentListTool, handleComponentList, componentSearchTool, handleComponentSearch, componentDetailsTool, handleComponentDetails, componentExamplesTool, handleComponentExamples, themeTokensTool, handleThemeTokens, changelogQueryTool, handleChangelogQuery, getCodeBlockTool, handleGetCodeBlock, };
