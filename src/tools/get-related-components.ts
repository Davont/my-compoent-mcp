/**
 * get_related_components 工具
 *
 * 查询组件间的关联关系，帮助 AI 做组件选型和组合决策
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  readComponentDoc,
  parseFrontmatter,
  extractSection,
  getComponentList
} from '../utils/doc-reader.js';

/** Related 条目 */
interface RelatedEntry {
  component: string;
  description: string;
}

/**
 * 工具定义
 */
export const getRelatedComponentsTool: Tool = {
  name: 'get_related_components',
  description: '查询组件间的关联关系。传入组件名，返回与之相关的组件列表及关联说明（如何搭配使用、何时用替代组件）。用于组件选型和组合决策。',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Input、Modal。支持别名。',
      },
    },
    required: ['componentName'],
  },
};

/**
 * 从 Related 章节内容解析出关联条目
 */
function parseRelatedEntries(relatedContent: string): RelatedEntry[] {
  const entries: RelatedEntry[] = [];
  const lines = relatedContent.split('\n');

  for (const line of lines) {
    // 匹配 - `ComponentName`：描述 或 - `ComponentName`: 描述
    const match = line.match(/^-\s+`([^`]+)`[：:]\s*(.+)/);
    if (match) {
      entries.push({
        component: match[1],
        description: match[2].trim(),
      });
    }
  }

  return entries;
}

/**
 * 格式化输出
 */
function formatOutput(componentName: string, entries: RelatedEntry[]): string {
  const lines: string[] = [];

  lines.push(`# ${componentName} 关联组件\n`);

  if (entries.length === 0) {
    lines.push('该组件暂无关联信息。');
    return lines.join('\n');
  }

  for (const entry of entries) {
    lines.push(`- **${entry.component}**：${entry.description}`);
  }

  return lines.join('\n');
}

/**
 * 工具处理器
 */
export async function handleGetRelatedComponents(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const componentName = args?.componentName as string;

  if (!componentName) {
    return {
      content: [{ type: 'text', text: '请提供组件名称' }],
      isError: true,
    };
  }

  try {
    const content = readComponentDoc(componentName);

    if (!content) {
      const allComponents = getComponentList();
      const names = allComponents.map(c => c.name).join(', ');
      return {
        content: [{ type: 'text', text: `未找到组件 "${componentName}" 的文档。\n\n可用组件：${names}` }],
        isError: true,
      };
    }

    const { body } = parseFrontmatter(content);
    const relatedContent = extractSection(body, 'Related');

    if (!relatedContent) {
      return {
        content: [{ type: 'text', text: `组件 "${componentName}" 暂无 Related 章节。` }],
      };
    }

    const entries = parseRelatedEntries(relatedContent);
    const output = formatOutput(componentName, entries);

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `查询关联组件失败: ${errorMessage}` }],
      isError: true,
    };
  }
}
