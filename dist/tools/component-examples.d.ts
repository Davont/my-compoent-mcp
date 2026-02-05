/**
 * component_examples 工具
 *
 * 获取 my-design 组件的代码示例
 */
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
/**
 * 工具定义
 */
export declare const componentExamplesTool: Tool;
/**
 * 工具处理器
 */
export declare function handleComponentExamples(args: Record<string, unknown>): Promise<CallToolResult>;
