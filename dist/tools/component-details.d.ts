/**
 * component_details 工具
 *
 * 获取 my-design 组件的详细文档（Props、Behavior、核心规则等）
 *
 * 控量策略：
 * - brief 模式：只返回组件概述 + 可用章节 + Props 名称列表（极轻量）
 * - sections 过滤：只返回指定章节
 * - propFilter：只返回指定的 Props 属性（避免返回 50 个属性）
 * - 大文档自动隐藏代码块（配合 get_code_block 工具）
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
