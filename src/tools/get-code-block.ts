/**
 * get_code_block 工具
 * 
 * 获取组件文档中被隐藏的代码块
 * 
 * 当组件文档较长（超过阈值）时，component_details 会将代码块替换为编号占位符。
 * 此工具用于按编号读取被隐藏的代码块，实现"定点读取"，避免一次性返回大量代码。
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { 
  readComponentDoc, 
  extractCodeBlocks,
  getComponentList 
} from '../utils/doc-reader.js';

/**
 * 工具定义
 */
export const getCodeBlockTool: Tool = {
  name: 'get_code_block',
  description: '获取组件文档中被隐藏的代码块。当组件文档较长时，代码块会被替换为编号占位符（如 [代码块 #1 已隐藏]），使用此工具按编号获取具体代码。',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Input、Table。',
      },
      codeBlockIndex: {
        type: 'number',
        description: '代码块编号（从 1 开始），对应占位符中的编号。',
      },
    },
    required: ['componentName', 'codeBlockIndex'],
  },
};

/**
 * 工具处理器
 */
export async function handleGetCodeBlock(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const componentName = args?.componentName as string;
  const codeBlockIndex = args?.codeBlockIndex as number;
  
  if (!componentName) {
    return {
      content: [{ type: 'text', text: '请提供组件名称' }],
      isError: true,
    };
  }
  
  if (!codeBlockIndex || codeBlockIndex < 1) {
    return {
      content: [{ type: 'text', text: '请提供有效的代码块编号（从 1 开始）' }],
      isError: true,
    };
  }
  
  try {
    const content = readComponentDoc(componentName);
    
    if (!content) {
      const allComponents = getComponentList();
      const componentNames = allComponents.map(c => c.name).join(', ');
      
      return {
        content: [{
          type: 'text',
          text: `未找到组件 "${componentName}" 的文档。\n\n可用组件：${componentNames}`,
        }],
        isError: true,
      };
    }
    
    // 提取所有代码块
    const codeBlocks = extractCodeBlocks(content);
    
    if (codeBlocks.length === 0) {
      return {
        content: [{
          type: 'text',
          text: `组件 "${componentName}" 文档中没有代码块。`,
        }],
        isError: true,
      };
    }
    
    if (codeBlockIndex > codeBlocks.length) {
      return {
        content: [{
          type: 'text',
          text: `代码块编号 ${codeBlockIndex} 超出范围。组件 "${componentName}" 共有 ${codeBlocks.length} 个代码块（编号 1-${codeBlocks.length}）。`,
        }],
        isError: true,
      };
    }
    
    const targetBlock = codeBlocks[codeBlockIndex - 1];
    
    return {
      content: [{
        type: 'text',
        text: `${componentName} 代码块 #${codeBlockIndex}（共 ${codeBlocks.length} 个）:\n\n${targetBlock}`,
      }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{
        type: 'text',
        text: `获取代码块失败: ${errorMessage}`,
      }],
      isError: true,
    };
  }
}
