/**
 * component_details 工具
 *
 * 获取 my-design 组件的详细文档（Props、Behavior、核心规则等）
 */
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
/**
 * 工具定义
 */
export declare const componentDetailsTool: Tool;
/**
 * 工具处理器
 */
export declare function handleComponentDetails(args: Record<string, unknown>): Promise<CallToolResult>;
