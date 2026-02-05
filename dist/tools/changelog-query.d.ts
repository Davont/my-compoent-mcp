/**
 * changelog_query 工具
 *
 * 查询 my-design 组件库的变更日志和迁移指南
 */
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
/**
 * 工具定义
 */
export declare const changelogQueryTool: Tool;
/**
 * 工具处理器
 */
export declare function handleChangelogQuery(args: Record<string, unknown>): Promise<CallToolResult>;
