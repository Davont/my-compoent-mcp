/**
 * get_function_code 工具
 *
 * 根据文件路径和函数名获取完整函数实现
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { resolvePackageRoot, readSourceFile } from '../utils/source-code-reader.js';
import { extractFunction, getFunctionNames } from '../utils/remove-function-body.js';

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
 * 工具定义
 */
export const getFunctionCodeTool: Tool = {
  name: 'get_function_code',
  description: `获取组件文件中指定函数的完整实现。

输入文件路径和函数名，返回函数的完整代码（包含函数体）。

支持的函数类型：
- 普通函数声明: function foo() {}
- 箭头函数: const foo = () => {}
- 类方法: class Foo { bar() {} }
- getter/setter: get foo() {} / set foo() {}

路径格式示例：
- @my-design/react/Button/index.tsx
- @my-design/react/Table/Table.tsx`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      filePath: {
        type: 'string',
        description: '文件完整路径，如 @my-design/react/Table/Table.tsx',
      },
      functionName: {
        type: 'string',
        description: '函数名称，如 render、handleClick 等',
      },
    },
    required: ['filePath', 'functionName'],
  },
};

/**
 * 工具处理器
 */
export async function handleGetFunctionCode(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const filePath = args?.filePath as string | undefined;
  const functionName = args?.functionName as string | undefined;

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

  if (!functionName) {
    return {
      content: [
        {
          type: 'text',
          text: '错误：请提供函数名称 (functionName)',
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
          text: `错误：无效的文件路径格式。路径应为 @scope/package/path 格式。\n\n提供的路径: ${filePath}\n\n示例: @my-design/react/Button/index.tsx`,
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
          text: `解析包路径失败: ${errorMessage}`,
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

  const functionCode = extractFunction(content, functionName, filePath);

  if (!functionCode) {
    const allFunctions = getFunctionNames(content, filePath);

    return {
      content: [
        {
          type: 'text',
          text: [
            `未找到函数 "${functionName}"`,
            '',
            `文件: ${filePath}`,
            '',
            `文件中可用的函数/方法 (共 ${allFunctions.length} 个):`,
            ...allFunctions.map(name => `  - ${name}`),
          ].join('\n'),
        },
      ],
      isError: true,
    };
  }

  const output = [
    `文件: ${filePath}`,
    `函数: ${functionName}`,
    '',
    '='.repeat(60),
    '',
    functionCode,
  ];

  return {
    content: [
      {
        type: 'text',
        text: output.join('\n'),
      },
    ],
  };
}
