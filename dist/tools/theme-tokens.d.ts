/**
 * theme_tokens 工具
 *
 * 获取 my-design 的 Design Token 和主题信息
 */
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
/**
 * 工具定义
 */
export declare const themeTokensTool: Tool;
/**
 * 工具处理器
 */
export declare function handleThemeTokens(args: Record<string, unknown>): Promise<CallToolResult>;
