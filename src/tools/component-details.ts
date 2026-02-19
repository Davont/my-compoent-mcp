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
import { 
  readComponentDoc, 
  parseFrontmatter, 
  extractSection,
  extractDescription,
  extractPropNames,
  filterProps,
  isLargeDocument,
  replaceCodeBlocksWithPlaceholders,
  getComponentList 
} from '../utils/doc-reader.js';

/**
 * 工具定义
 */
export const componentDetailsTool: Tool = {
  name: 'component_details',
  description: '获取 my-design 组件的详细文档。支持三种用法：1) brief=true 只返回组件概述和 Props 名称列表（推荐先调用）；2) 指定 sections 获取特定章节；3) propFilter 只获取指定属性的详情。生成代码前建议先 brief 了解组件，再按需获取详细信息。',
  inputSchema: {
    type: 'object',
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Input、Table。支持别名（如 Btn）。',
      },
      brief: {
        type: 'boolean',
        description: '简要模式。设为 true 只返回组件概述 + 可用章节列表 + Props 名称列表（不含详细表格），适合初步了解组件。默认 false。',
      },
      sections: {
        type: 'array',
        items: { type: 'string' },
        description: '要获取的章节列表。可选值：props、events、rules（核心规则）、behavior、when-to-use、accessibility、all（全部）。默认返回 props + rules。',
      },
      propFilter: {
        type: 'array',
        items: { type: 'string' },
        description: '只返回指定的 Props 属性名。如 ["onClick", "loading"] 只返回这 2 个属性的详情。需要 sections 包含 "props"（或默认）时生效。',
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
 * 生成 brief 模式输出
 */
function formatBriefOutput(
  componentName: string,
  frontmatter: Record<string, any> | null,
  body: string,
): string {
  const lines: string[] = [];
  
  lines.push(`# ${componentName} 组件概述\n`);
  
  // 组件描述
  const desc = extractDescription(body);
  if (desc) {
    lines.push(desc);
    lines.push('');
  }
  
  // 基本信息
  if (frontmatter) {
    const info: string[] = [];
    if (frontmatter.import) info.push(`引入: \`${frontmatter.import}\``);
    if (frontmatter.status) info.push(`状态: ${frontmatter.status}`);
    if (frontmatter.since) info.push(`首次发布: v${frontmatter.since}`);
    if (info.length > 0) {
      lines.push(info.join(' | '));
      lines.push('');
    }
  }
  
  // 可用章节
  const availableSections: string[] = [];
  for (const [key, title] of Object.entries(SECTION_MAP)) {
    if (extractSection(body, title)) {
      availableSections.push(key);
    }
  }
  lines.push(`**可用章节**: ${availableSections.join(', ')}`);
  
  // Props 名称列表
  const propsContent = extractSection(body, 'Props');
  if (propsContent) {
    const propNames = extractPropNames(propsContent);
    if (propNames.length > 0) {
      lines.push(`**Props 列表** (${propNames.length} 个): ${propNames.join(', ')}`);
    }
  }
  
  lines.push('');
  lines.push('> 提示：使用 component_details 并指定 sections 和 propFilter 获取详细信息。');
  
  return lines.join('\n');
}

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
  const brief = args?.brief as boolean | undefined;
  const requestedSections = args?.sections as string[] | undefined;
  const propFilter = args?.propFilter as string[] | undefined;
  
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
    
    // brief 模式：返回极轻量的概述
    if (brief) {
      const output = formatBriefOutput(componentName, frontmatter, body);
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    }
    
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
        let sectionContent = extractSection(body, sectionTitle);
        
        // 如果请求了 props 且有 propFilter，过滤属性
        if (section === 'props' && sectionContent && propFilter && propFilter.length > 0) {
          sectionContent = filterProps(sectionContent, propFilter);
        }
        
        // 大文档的代码块隐藏
        if (sectionContent && isLargeDocument(content)) {
          sectionContent = replaceCodeBlocksWithPlaceholders(sectionContent, componentName);
        }
        
        sections[section] = sectionContent;
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
