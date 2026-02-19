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
import { 
  readComponentDoc, 
  extractSection,
  parseExamples,
  getComponentList 
} from '../utils/doc-reader.js';

/**
 * 工具定义
 */
export const componentExamplesTool: Tool = {
  name: 'component_examples',
  description: '获取 my-design 组件的代码示例。不传 exampleName 时返回示例目录（名称+描述，不含代码）；传 exampleName 时返回指定示例的完整代码。建议先获取目录，再按需获取具体示例。',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Input、Table。支持别名。',
      },
      exampleName: {
        type: 'string',
        description: '示例名称（如"基础用法"、"加载状态"）。不传则返回示例目录列表（不含代码），根据目录决定获取哪个示例。',
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
  const exampleName = args?.exampleName as string | undefined;
  
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
    const examplesSection = extractSection(content, 'Examples');
    
    if (!examplesSection) {
      return {
        content: [
          {
            type: 'text',
            text: `组件 "${componentName}" 暂无示例代码。`,
          },
        ],
      };
    }
    
    // 解析示例列表
    const examples = parseExamples(examplesSection);
    
    if (examples.length === 0) {
      // 如果没有 ### 子标题，说明示例没有分组，直接返回整个 Examples 内容
      return {
        content: [
          {
            type: 'text',
            text: `# ${componentName} 代码示例\n\n${examplesSection}`,
          },
        ],
      };
    }
    
    // 不传 exampleName → 返回示例目录（轻量，不含代码）
    if (!exampleName) {
      const lines: string[] = [];
      lines.push(`# ${componentName} 代码示例目录\n`);
      lines.push(`共 ${examples.length} 个示例：\n`);
      
      examples.forEach((ex, i) => {
        lines.push(`${i + 1}. **${ex.name}** — ${ex.description}`);
      });
      
      lines.push('');
      lines.push(`> 提示：使用 component_examples 并传入 exampleName（如 "${examples[0].name}"）获取具体示例代码。`);
      
      return {
        content: [
          {
            type: 'text',
            text: lines.join('\n'),
          },
        ],
      };
    }
    
    // 传了 exampleName → 返回指定示例
    const lowerName = exampleName.toLowerCase();
    const target = examples.find(ex => 
      ex.name.toLowerCase() === lowerName ||
      ex.name.toLowerCase().includes(lowerName)
    );
    
    if (!target) {
      const availableNames = examples.map(ex => ex.name).join('、');
      return {
        content: [
          {
            type: 'text',
            text: `未找到示例 "${exampleName}"。\n\n可用示例：${availableNames}`,
          },
        ],
        isError: true,
      };
    }
    
    const output = `# ${componentName} 示例：${target.name}\n\n${target.content}`;
    
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
