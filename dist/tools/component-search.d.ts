/**
 * component_search 工具
 *
 * 搜索 my-design 组件库的组件
 */
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
/**
 * 工具定义
 */
export declare const componentSearchTool: Tool;
/**
 * 工具处理器
 */
export declare function handleComponentSearch(args: Record<string, unknown>): Promise<CallToolResult>;
