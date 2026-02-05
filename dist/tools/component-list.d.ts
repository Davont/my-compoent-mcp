/**
 * component_list 工具
 *
 * 获取 my-design 组件库的组件列表
 */
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
/**
 * 工具定义
 */
export declare const componentListTool: Tool;
/**
 * 工具处理器
 */
export declare function handleComponentList(args: Record<string, unknown>): Promise<CallToolResult>;
