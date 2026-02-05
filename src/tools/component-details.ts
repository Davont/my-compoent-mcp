/**
 * component_details 工具
 * 
 * 获取 my-design 组件的详细文档（Props、Behavior、核心规则等）
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { 
  readComponentDoc, 
  parseFrontmatter, 
  extractSection,
  getComponentList 
} from '../utils/doc-reader.js';

/**
 * 工具定义
 */
export const componentDetailsTool: Tool = {
  name: 'component_details',
  description: '获取 my-design 组件的详细文档，包括：Props（属性）、Events（事件）、核心规则（AI 生成代码时必读的约束）、Behavior（交互行为）、When to use（适用场景）、Accessibility（无障碍要求）。这是生成代码前必须调用的工具，用于确认组件 API 和使用约束。',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Input、Table。支持别名（如 Btn）。',
      },
      sections: {
        type: 'array',
        items: { type: 'string' },
        description: '要获取的章节列表。可选值：props、events、rules（核心规则）、behavior、when-to-use、accessibility、all（全部）。默认返回 props + rules。',
      },
    },
    required: ['componentName'],
  },
};

/** 章节映射 */
const SECTION_MAP: Record<string, string> = {
  'props': 'Props',
  'events': 'Events',
  'rules': '核心规则（AI 生成时必读）',
  'behavior': 'Behavior',
  'when-to-use': 'When to use',
  'accessibility': 'Accessibility',
};

/**
 * 格式化组件详情输出
 */
function formatComponentDetails(
  componentName: string,
  frontmatter: Record<string, any> | null,
  sections: Record<string, string | null>
): string {
  const lines: string[] = [];
  
  // 标题和基本信息
  lines.push(`# ${componentName} 组件详情\n`);
  
  if (frontmatter) {
    if (frontmatter.import) {
      lines.push(`**引入方式**: \`${frontmatter.import}\`\n`);
    }
    if (frontmatter.status && frontmatter.status !== 'stable') {
      lines.push(`**状态**: ${frontmatter.status}\n`);
    }
    if (frontmatter.since) {
      lines.push(`**首次发布**: v${frontmatter.since}\n`);
    }
    lines.push('');
  }
  
  // 各章节内容
  for (const [key, content] of Object.entries(sections)) {
    if (content) {
      const sectionTitle = SECTION_MAP[key] || key;
      lines.push(`## ${sectionTitle}\n`);
      lines.push(content);
      lines.push('');
    }
  }
  
  return lines.join('\n');
}

/**
 * 工具处理器
 */
export async function handleComponentDetails(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const componentName = args?.componentName as string;
  const requestedSections = args?.sections as string[] | undefined;
  
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
      // 组件不存在，给出可用组件列表
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
    
    // 解析 frontmatter
    const { frontmatter, body } = parseFrontmatter(content);
    
    // 确定要提取的章节
    let sectionsToExtract: string[];
    if (!requestedSections || requestedSections.length === 0) {
      // 默认返回 props + rules
      sectionsToExtract = ['props', 'rules'];
    } else if (requestedSections.includes('all')) {
      // 返回全部章节
      sectionsToExtract = Object.keys(SECTION_MAP);
    } else {
      sectionsToExtract = requestedSections;
    }
    
    // 提取各章节
    const sections: Record<string, string | null> = {};
    for (const section of sectionsToExtract) {
      const sectionTitle = SECTION_MAP[section];
      if (sectionTitle) {
        sections[section] = extractSection(body, sectionTitle);
      }
    }
    
    const output = formatComponentDetails(componentName, frontmatter, sections);
    
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
          text: `获取组件详情失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
