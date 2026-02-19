/**
 * get_code_block 工具
 *
 * 获取组件文档中被隐藏的代码块
 *
 * 当组件文档较长（超过阈值）时，component_details 会将代码块替换为编号占位符。
 * 此工具用于按编号读取被隐藏的代码块，实现"定点读取"，避免一次性返回大量代码。
 */
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
/**
 * 工具定义
 */
export declare const getCodeBlockTool: Tool;
/**
 * 工具处理器
 */
export declare function handleGetCodeBlock(args: Record<string, unknown>): Promise<CallToolResult>;
