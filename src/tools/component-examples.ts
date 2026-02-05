/**
 * component_examples 工具
 * 
 * 获取 my-design 组件的代码示例
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { 
  readComponentDoc, 
  extractSection,
  getComponentList 
} from '../utils/doc-reader.js';

/**
 * 工具定义
 */
export const componentExamplesTool: Tool = {
  name: 'component_examples',
  description: '获取 my-design 组件的代码示例。返回可直接复制使用的示例代码，覆盖组件的常见使用场景（基础用法、加载状态、禁用状态、组合使用等）。',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Input、Table。支持别名。',
      },
    },
    required: ['componentName'],
  },
};

/**
 * 工具处理器
 */
export async function handleComponentExamples(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const componentName = args?.componentName as string;
  
  if (!componentName) {
    return {
      content: [
        {
          type: 'text',
          text: '请提供组件名称',
        },
      ],
      isError: true,
    };
  }
  
  try {
    const content = readComponentDoc(componentName);
    
    if (!content) {
      const allComponents = getComponentList();
      const componentNames = allComponents.map(c => c.name).join(', ');
      
      return {
        content: [
          {
            type: 'text',
            text: `未找到组件 "${componentName}" 的文档。\n\n可用组件：${componentNames}`,
          },
        ],
        isError: true,
      };
    }
    
    // 提取 Examples 章节
    const examples = extractSection(content, 'Examples');
    
    if (!examples) {
      return {
        content: [
          {
            type: 'text',
            text: `组件 "${componentName}" 暂无示例代码。`,
          },
        ],
      };
    }
    
    const output = `# ${componentName} 代码示例\n\n${examples}`;
    
    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `获取组件示例失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
