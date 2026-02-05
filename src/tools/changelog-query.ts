/**
 * changelog_query 工具
 * 
 * 查询 my-design 组件库的变更日志和迁移指南
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { readChangelog } from '../utils/doc-reader.js';

/** 每页行数 */
const PAGE_SIZE = 100;

/**
 * 工具定义
 */
export const changelogQueryTool: Tool = {
  name: 'changelog_query',
  description: '查询 my-design 组件库的变更日志（Changelog）和迁移指南。用于：1) 了解版本更新内容；2) 查找 Breaking Changes 和迁移方法；3) 排查版本升级问题。支持按版本号过滤和分页。',
  inputSchema: {
    type: 'object',
    properties: {
      version: {
        type: 'string',
        description: '指定版本号（如 "2.0.0"）或版本范围（如 ">=1.5.0"）。如不指定，返回最新的变更记录。',
      },
      page: {
        type: 'number',
        description: '页码（从 1 开始）。changelog 较长时需要分页获取。默认为 1。',
      },
      keyword: {
        type: 'string',
        description: '关键词搜索。用于在 changelog 中搜索特定内容（如组件名、功能名）。',
      },
    },
    required: [],
  },
};

/**
 * 分页处理
 */
function paginateContent(content: string, page: number): {
  content: string;
  totalPages: number;
  currentPage: number;
  totalLines: number;
} {
  const lines = content.split('\n');
  const totalLines = lines.length;
  const totalPages = Math.ceil(totalLines / PAGE_SIZE);

  const startIndex = (page - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, totalLines);

  const pageLines = lines.slice(startIndex, endIndex);

  return {
    content: pageLines.join('\n'),
    totalPages,
    currentPage: page,
    totalLines,
  };
}

/**
 * 按版本号提取内容
 */
function extractByVersion(content: string, version: string): string | null {
  // 匹配 ## x.x.x 格式的版本标题
  const versionRegex = new RegExp(`## ${version.replace(/\./g, '\\.')}[\\s\\S]*?(?=\\n## |$)`, 'i');
  const match = content.match(versionRegex);

  return match ? match[0] : null;
}

/**
 * 按关键词搜索
 */
function searchByKeyword(content: string, keyword: string): string {
  const lines = content.split('\n');
  const results: string[] = [];
  let currentSection = '';

  for (const line of lines) {
    // 记录当前版本章节
    if (line.startsWith('## ')) {
      currentSection = line;
    }

    // 如果行包含关键词，添加到结果
    if (line.toLowerCase().includes(keyword.toLowerCase())) {
      if (results.length === 0 || !results.includes(currentSection)) {
        results.push(currentSection);
      }
      results.push(line);
    }
  }

  if (results.length === 0) {
    return `未找到包含 "${keyword}" 的内容`;
  }

  return results.join('\n');
}

/**
 * 工具处理器
 */
export async function handleChangelogQuery(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const version = args?.version as string | undefined;
  const page = (args?.page as number) || 1;
  const keyword = args?.keyword as string | undefined;

  try {
    const changelog = readChangelog();

    if (!changelog) {
      return {
        content: [
          {
            type: 'text',
            text: 'Changelog 文件不存在或为空',
          },
        ],
        isError: true,
      };
    }

    let output: string;

    // 按版本号过滤
    if (version) {
      const versionContent = extractByVersion(changelog, version);

      if (!versionContent) {
        return {
          content: [
            {
              type: 'text',
              text: `未找到版本 "${version}" 的变更记录`,
            },
          ],
          isError: true,
        };
      }

      output = `# Changelog - 版本 ${version}\n\n${versionContent}`;
    }
    // 按关键词搜索
    else if (keyword) {
      const searchResult = searchByKeyword(changelog, keyword);
      output = `# Changelog 搜索结果 - "${keyword}"\n\n${searchResult}`;
    }
    // 分页返回
    else {
      const paginated = paginateContent(changelog, page);

      if (page < 1 || page > paginated.totalPages) {
        return {
          content: [
            {
              type: 'text',
              text: `页码 ${page} 超出范围。Changelog 共 ${paginated.totalPages} 页（每页 ${PAGE_SIZE} 行）。`,
            },
          ],
          isError: true,
        };
      }

      const pageInfo = `[第 ${paginated.currentPage}/${paginated.totalPages} 页 | 共 ${paginated.totalLines} 行]`;
      const navHint = [];
      if (page > 1) navHint.push(`上一页: page=${page - 1}`);
      if (page < paginated.totalPages) navHint.push(`下一页: page=${page + 1}`);

      output = `# my-design Changelog\n\n${pageInfo}\n${navHint.length > 0 ? `[提示: ${navHint.join(', ')}]\n` : ''}\n${paginated.content}`;
    }

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
          text: `查询 Changelog 失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
