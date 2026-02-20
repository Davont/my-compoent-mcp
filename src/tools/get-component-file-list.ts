/**
 * get_component_file_list 工具
 *
 * 获取 my-design 组件的所有源码文件路径列表
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { resolvePackageRoot, listComponentFiles, listTopLevelDirectories } from '../utils/source-code-reader.js';

/**
 * 工具定义
 */
export const getComponentFileListTool: Tool = {
  name: 'get_component_file_list',
  description: `获取 my-design 组件的所有源码文件路径列表。

返回组件在 @my-design/react 中的所有文件路径。

路径格式示例：
- @my-design/react/Button/index.tsx
- @my-design/react/Button/Button.tsx
- @my-design/react/Button/style/index.scss

使用场景：
1. 先调用此工具获取组件文件列表
2. 再使用 get_file_code 获取感兴趣的文件代码
3. 如需查看具体函数实现，使用 get_function_code`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、DatePicker、Modal 等（大小写不敏感）',
      },
      packageName: {
        type: 'string',
        description: 'npm 包名，默认为 "@my-design/react"',
      },
    },
    required: ['componentName'],
  },
};

/**
 * 工具处理器
 */
export async function handleGetComponentFileList(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const componentName = args?.componentName as string | undefined;
  const packageName = args?.packageName as string | undefined;

  if (!componentName) {
    return {
      content: [
        {
          type: 'text',
          text: '错误：请提供组件名称 (componentName)',
        },
      ],
      isError: true,
    };
  }

  try {
    const packageRoot = resolvePackageRoot(packageName);
    const { files, packageName: pkgName } = listComponentFiles(packageRoot, componentName);

    if (files.length === 0) {
      const availableDirs = listTopLevelDirectories(packageRoot);
      const suggestions = availableDirs.length > 0
        ? `\n\n可用的组件目录：\n${availableDirs.map(d => `  - ${d}`).join('\n')}`
        : '';

      return {
        content: [
          {
            type: 'text',
            text: `未找到组件 "${componentName}" 的文件。${suggestions}`,
          },
        ],
        isError: true,
      };
    }

    const stats = {
      ts: files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts')).length,
      tsx: files.filter(f => f.endsWith('.tsx')).length,
      js: files.filter(f => f.endsWith('.js')).length,
      jsx: files.filter(f => f.endsWith('.jsx')).length,
      scss: files.filter(f => f.endsWith('.scss')).length,
      css: files.filter(f => f.endsWith('.css')).length,
      other: files.filter(f => !f.match(/\.(tsx?|jsx?|d\.ts|scss|css)$/)).length,
    };

    const statsLines: string[] = [];
    if (stats.ts > 0) statsLines.push(`  .ts:   ${stats.ts}`);
    if (stats.tsx > 0) statsLines.push(`  .tsx:  ${stats.tsx}`);
    if (stats.js > 0) statsLines.push(`  .js:   ${stats.js}`);
    if (stats.jsx > 0) statsLines.push(`  .jsx:  ${stats.jsx}`);
    if (stats.scss > 0) statsLines.push(`  .scss: ${stats.scss}`);
    if (stats.css > 0) statsLines.push(`  .css:  ${stats.css}`);
    if (stats.other > 0) statsLines.push(`  其他:  ${stats.other}`);

    const output = [
      `组件: ${componentName}`,
      `包名: ${pkgName}`,
      `总文件数: ${files.length}`,
      ``,
      `文件类型统计:`,
      ...statsLines,
      ``,
      `===== 文件列表 =====`,
      ``,
      ...files,
      ``,
      `提示: 使用 get_file_code 工具传入上述路径获取文件代码`,
    ];

    return {
      content: [
        {
          type: 'text',
          text: output.join('\n'),
        },
      ],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `获取组件文件列表失败: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
