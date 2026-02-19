/**
 * component_examples 工具
 *
 * 获取 my-design 组件的代码示例
 *
 * 控量策略：
 * - 不传 exampleName → 只返回示例目录（名称 + 描述），不含代码
 * - 传 exampleName → 只返回指定示例的完整代码
 * 避免一次性返回所有示例代码，减少 token 消耗
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
