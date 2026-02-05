/**
 * component_list 工具
 * 
 * 获取 my-design 组件库的组件列表
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getComponentList, ComponentIndexEntry } from '../utils/doc-reader.js';

/**
 * 工具定义
 */
export const componentListTool: Tool = {
  name: 'component_list',
  description: '获取 my-design 组件库的组件列表。返回所有可用组件及其分类、状态等元信息。',
  inputSchema: {
    type: 'object',
    properties: {
      category: {
        type: 'string',
        description: '按分类过滤组件。可选值：form（表单）、data（数据展示）、feedback（反馈）、layout（布局）、navigation（导航）、general（通用）',
      },
      status: {
        type: 'string',
        description: '按状态过滤组件。可选值：stable（稳定）、beta（测试）、deprecated（已弃用）',
      },
    },
    required: [],
  },
};

/**
 * 格式化组件列表输出
 */
function formatComponentList(components: ComponentIndexEntry[]): string {
  if (components.length === 0) {
    return '未找到符合条件的组件';
  }
  
  // 按分类分组
  const grouped = components.reduce((acc, c) => {
    if (!acc[c.category]) {
      acc[c.category] = [];
    }
    acc[c.category].push(c);
    return acc;
  }, {} as Record<string, ComponentIndexEntry[]>);
  
  const lines: string[] = [];
  lines.push(`my-design 组件列表（共 ${components.length} 个组件）\n`);
  
  for (const [category, comps] of Object.entries(grouped)) {
    lines.push(`## ${category}（${comps.length} 个）\n`);
    
    for (const c of comps) {
      const status = c.status !== 'stable' ? ` [${c.status}]` : '';
      const aliases = c.aliases?.length ? ` (别名: ${c.aliases.join(', ')})` : '';
      lines.push(`- **${c.name}**${status}${aliases}`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * 工具处理器
 */
export async function handleComponentList(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const category = args?.category as string | undefined;
  const status = args?.status as string | undefined;
  
  try {
    let components = getComponentList();
    
    // 按分类过滤
    if (category) {
      components = components.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }
    
    // 按状态过滤
    if (status) {
      components = components.filter(c => c.status === status);
    }
    
    const output = formatComponentList(components);
    
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
          text: `获取组件列表失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
