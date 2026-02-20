/**
 * get_file_code 工具
 *
 * 根据文件路径获取代码内容
 * ts/tsx/js/jsx 文件默认过滤函数体，可通过参数获取完整代码
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { resolvePackageRoot, readSourceFile } from '../utils/source-code-reader.js';
import { removeFunctionBodies } from '../utils/remove-function-body.js';

/**
 * 解析文件路径
 * 输入: @my-design/react/Button/index.tsx
 * 输出: { packageName: '@my-design/react', relativePath: 'Button/index.tsx' }
 */
function parseFilePath(fullPath: string): { packageName: string; relativePath: string } | null {
  const match = fullPath.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
  if (!match) {
    return null;
  }
  return {
    packageName: match[1],
    relativePath: match[2],
  };
}

/**
 * 判断是否为脚本文件（ts/tsx/js/jsx）
 */
function isScriptFile(filePath: string): boolean {
  return /\.(tsx?|jsx?)$/.test(filePath);
}

/** 代码行数阈值，超过此行数才会过滤函数体 */
const LINE_THRESHOLD = 500;

/**
 * 工具定义
 */
export const getFileCodeTool: Tool = {
  name: 'get_file_code',
  description: `获取组件文件的代码内容。

输入文件路径（从 get_component_file_list 工具获取），返回文件代码。

默认行为：
- .ts/.tsx/.js/.jsx 文件且行数 >= ${LINE_THRESHOLD}：函数体被替换为 "{ ... }"，只显示代码结构
- .ts/.tsx/.js/.jsx 文件且行数 < ${LINE_THRESHOLD}：显示完整代码
- 其他文件（.scss 等）：显示完整内容

可通过 fullCode 参数强制获取完整代码（包含函数体）。

路径格式示例：
- @my-design/react/Button/index.tsx
- @my-design/react/Button/Button.tsx
- @my-design/react/DatePicker/style/index.scss`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      filePath: {
        type: 'string',
        description: '文件完整路径，如 @my-design/react/Button/index.tsx',
      },
      fullCode: {
        type: 'boolean',
        description: '是否获取完整代码（包含函数体），默认为 false',
      },
    },
    required: ['filePath'],
  },
};

/**
 * 工具处理器
 */
export async function handleGetFileCode(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const filePath = args?.filePath as string | undefined;
  const fullCode = (args?.fullCode as boolean | undefined) || false;

  if (!filePath) {
    return {
      content: [
        {
          type: 'text',
          text: '错误：请提供文件路径 (filePath)',
        },
      ],
      isError: true,
    };
  }

  const parsed = parseFilePath(filePath);
  if (!parsed) {
    return {
      content: [
        {
          type: 'text',
          text: `错误：无效的文件路径格式。路径应为 @scope/package/path 格式。\n\n提供的路径: ${filePath}\n\n正确示例: @my-design/react/Button/index.tsx`,
        },
      ],
      isError: true,
    };
  }

  let packageRoot: string;
  try {
    packageRoot = resolvePackageRoot(parsed.packageName);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `无法找到包 "${parsed.packageName}": ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }

  let content: string;
  try {
    content = readSourceFile(packageRoot, parsed.relativePath);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `读取文件失败: ${errorMessage}\n\n文件路径: ${filePath}`,
        },
      ],
      isError: true,
    };
  }

  const lineCount = content.split('\n').length;

  let outputContent = content;
  let processInfo = '';

  const shouldFilterFunctionBodies = isScriptFile(filePath) && !fullCode && lineCount >= LINE_THRESHOLD;

  if (shouldFilterFunctionBodies) {
    outputContent = removeFunctionBodies(content, filePath);
    processInfo = '（代码较长，函数体已替换为 "{ ... }"，可使用 fullCode=true 获取完整代码，或使用 get_function_code 工具读取具体函数实现）';
  }

  const output = [
    `文件: ${filePath}`,
    `行数: ${lineCount}`,
    `大小: ${content.length} 字符`,
    processInfo ? `处理: ${processInfo}` : '',
    '',
    '='.repeat(60),
    '',
    outputContent,
  ].filter(Boolean);

  return {
    content: [
      {
        type: 'text',
        text: output.join('\n'),
      },
    ],
  };
}
