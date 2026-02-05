/**
 * theme_tokens 工具
 * 
 * 获取 my-design 的 Design Token 和主题信息
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { readTokens, readThemes, TokenDefinition } from '../utils/doc-reader.js';

/**
 * 工具定义
 */
export const themeTokensTool: Tool = {
  name: 'theme_tokens',
  description: '获取 my-design 的 Design Token（设计令牌）和主题信息。包括颜色、间距、圆角、字体等 token 定义，以及不同主题（light/dark）下的值差异。生成代码时应优先使用 token（CSS 变量），避免硬编码颜色、间距等值。',
  inputSchema: {
    type: 'object',
    properties: {
      type: {
        type: 'string',
        description: 'Token 类型过滤。可选值：color（颜色）、spacing（间距）、radius（圆角）、font（字体）、shadow（阴影）、all（全部）。默认返回全部。',
      },
      theme: {
        type: 'string',
        description: '主题名称。可选值：light、dark。如果指定，则返回该主题下的 token 值。',
      },
    },
    required: [],
  },
};

/**
 * 格式化 Token 列表
 */
function formatTokenList(tokens: TokenDefinition[], type?: string): string {
  let filteredTokens = tokens;
  
  if (type && type !== 'all') {
    filteredTokens = tokens.filter(t => t.type.toLowerCase() === type.toLowerCase());
  }
  
  if (filteredTokens.length === 0) {
    return type ? `未找到类型为 "${type}" 的 token` : '未找到 token';
  }
  
  // 按类型分组
  const grouped = filteredTokens.reduce((acc, t) => {
    if (!acc[t.type]) {
      acc[t.type] = [];
    }
    acc[t.type].push(t);
    return acc;
  }, {} as Record<string, TokenDefinition[]>);
  
  const lines: string[] = [];
  lines.push(`# my-design Design Tokens\n`);
  lines.push(`共 ${filteredTokens.length} 个 token\n`);
  lines.push('> 生成代码时，请使用 CSS 变量（如 `var(--md-color-primary)`），避免硬编码值。\n');
  
  for (const [tokenType, typeTokens] of Object.entries(grouped)) {
    lines.push(`## ${tokenType}（${typeTokens.length} 个）\n`);
    lines.push('| Token | 默认值 | 说明 |');
    lines.push('|-------|--------|------|');
    
    for (const t of typeTokens) {
      lines.push(`| \`${t.name}\` | \`${t.default}\` | ${t.description} |`);
    }
    
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * 格式化主题信息
 */
function formatThemeInfo(themeName: string, themeTokens: Record<string, string>): string {
  const lines: string[] = [];
  lines.push(`# ${themeName} 主题 Token 值\n`);
  lines.push('| Token | 值 |');
  lines.push('|-------|-----|');
  
  for (const [name, value] of Object.entries(themeTokens)) {
    lines.push(`| \`${name}\` | \`${value}\` |`);
  }
  
  return lines.join('\n');
}

/**
 * 工具处理器
 */
export async function handleThemeTokens(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const type = args?.type as string | undefined;
  const theme = args?.theme as string | undefined;
  
  try {
    // 如果指定了主题，返回主题信息
    if (theme) {
      const themesData = readThemes();
      const themeInfo = themesData.themes.find(t => t.name.toLowerCase() === theme.toLowerCase());
      
      if (!themeInfo) {
        const availableThemes = themesData.themes.map(t => t.name).join(', ');
        return {
          content: [
            {
              type: 'text',
              text: `未找到主题 "${theme}"。可用主题：${availableThemes}`,
            },
          ],
          isError: true,
        };
      }
      
      const output = formatThemeInfo(themeInfo.name, themeInfo.tokens);
      
      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    }
    
    // 返回 token 列表
    const tokensData = readTokens();
    const output = formatTokenList(tokensData.tokens, type);
    
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
          text: `获取 token 信息失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
