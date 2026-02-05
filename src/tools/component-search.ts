/**
 * component_search 工具
 * 
 * 搜索 my-design 组件库的组件
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { searchComponents, ComponentIndexEntry } from '../utils/doc-reader.js';

/**
 * 工具定义
 */
export const componentSearchTool: Tool = {
  name: 'component_search',
  description: '搜索 my-design 组件库的组件。支持按组件名、别名、关键词、分类进行模糊搜索。适用于：1) 不确定组件名称时进行探索；2) 根据需求找到合适的组件；3) 查找相关组件。',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索关键词。可以是组件名、别名、关键词或分类名。例如："按钮"、"表单"、"primary"、"loading"',
      },
    },
    required: ['query'],
  },
};

/**
 * 格式化搜索结果
 */
function formatSearchResults(components: ComponentIndexEntry[], query: string): string {
  if (components.length === 0) {
    return `未找到与 "${query}" 相关的组件。\n\n建议：\n- 尝试使用英文组件名（如 Button、Input）\n- 尝试使用更通用的关键词（如 form、data）\n- 使用 component_list 工具查看所有可用组件`;
  }
  
  const lines: string[] = [];
  lines.push(`搜索 "${query}" 找到 ${components.length} 个组件：\n`);
  
  for (const c of components) {
    const status = c.status !== 'stable' ? ` [${c.status}]` : '';
    const aliases = c.aliases?.length ? `\n  别名: ${c.aliases.join(', ')}` : '';
    const keywords = c.keywords?.length ? `\n  关键词: ${c.keywords.join(', ')}` : '';
    
    lines.push(`### ${c.name}${status}`);
    lines.push(`- 分类: ${c.category}${aliases}${keywords}`);
    lines.push(`- 使用 \`component_details\` 获取详细 API`);
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * 工具处理器
 */
export async function handleComponentSearch(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const query = args?.query as string;
  
  if (!query) {
    return {
      content: [
        {
          type: 'text',
          text: '请提供搜索关键词',
        },
      ],
      isError: true,
    };
  }
  
  try {
    const components = searchComponents(query);
    const output = formatSearchResults(components, query);
    
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
          text: `搜索组件失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
