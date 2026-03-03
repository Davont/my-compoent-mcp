/**
 * source_inspect 工具
 *
 * 合并 get_component_file_list / get_file_code / get_function_code 三个工具。
 * 通过 mode 参数切换能力，对 AI 只暴露一次调用。
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  resolvePackageRoot,
  listComponentFiles,
  readSourceFile,
  listTopLevelDirectories,
} from '../utils/source-code-reader.js';
import {
  removeFunctionBodies,
  extractFunction,
  getFunctionNames,
} from '../utils/remove-function-body.js';
import { PACKAGE_NAME } from '../config.js';

/** 代码行数阈值，超过此行数才会过滤函数体 */
const LINE_THRESHOLD = 500;

/**
 * 解析 @scope/pkg/path 格式的文件路径
 */
function parseFilePath(fullPath: string): { packageName: string; relativePath: string } | null {
  const match = fullPath.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
  if (!match) return null;
  return { packageName: match[1], relativePath: match[2] };
}

function isScriptFile(filePath: string): boolean {
  return /\.(tsx?|jsx?)$/.test(filePath);
}

// ============ 工具定义 ============

export const sourceInspectTool: Tool = {
  name: 'source_inspect',
  description:
    `查看 ${PACKAGE_NAME} 组件的源码。支持三种模式：\n` +
    '- list_files：列出组件的所有源码文件路径\n' +
    '- get_file：读取指定文件内容（大文件默认隐藏函数体，fullCode=true 显示完整代码）\n' +
    '- get_function：获取指定函数的完整实现\n\n' +
    '典型用法：先 list_files 找到文件 → get_file 看结构 → get_function 看具体实现。',
  inputSchema: {
    type: 'object' as const,
    properties: {
      mode: {
        type: 'string',
        description: '操作模式：list_files | get_file | get_function',
      },
      componentName: {
        type: 'string',
        description: '组件名称，如 Button、Modal（list_files 模式必填）',
      },
      filePath: {
        type: 'string',
        description: `文件完整路径，如 ${PACKAGE_NAME}/Button/index.tsx（get_file / get_function 模式必填）`,
      },
      functionName: {
        type: 'string',
        description: '函数名称，如 render、handleClick（get_function 模式必填）',
      },
      fullCode: {
        type: 'boolean',
        description: '是否显示完整代码（含函数体），仅 get_file 模式生效，默认 false',
      },
      packageName: {
        type: 'string',
        description: `包名，默认 ${PACKAGE_NAME}`,
      },
    },
    required: ['mode'],
  },
};

// ============ 各 mode 处理函数 ============

async function handleListFiles(args: Record<string, unknown>): Promise<CallToolResult> {
  const componentName = args?.componentName as string | undefined;
  const packageName = args?.packageName as string | undefined;

  if (!componentName) {
    return {
      content: [{ type: 'text', text: 'list_files 模式需要提供 componentName' }],
      isError: true,
    };
  }

  const packageRoot = resolvePackageRoot(packageName);
  const { files, packageName: pkgName } = listComponentFiles(packageRoot, componentName);

  if (files.length === 0) {
    const availableDirs = listTopLevelDirectories(packageRoot);
    const suggestions = availableDirs.length > 0
      ? `\n\n可用的组件目录：\n${availableDirs.map(d => `  - ${d}`).join('\n')}`
      : '';
    return {
      content: [{ type: 'text', text: `未找到组件 "${componentName}" 的文件。${suggestions}` }],
      isError: true,
    };
  }

  const stats = {
    ts:    files.filter(f => f.endsWith('.ts') && !f.endsWith('.d.ts')).length,
    tsx:   files.filter(f => f.endsWith('.tsx')).length,
    js:    files.filter(f => f.endsWith('.js')).length,
    jsx:   files.filter(f => f.endsWith('.jsx')).length,
    scss:  files.filter(f => f.endsWith('.scss')).length,
    css:   files.filter(f => f.endsWith('.css')).length,
    other: files.filter(f => !f.match(/\.(tsx?|jsx?|d\.ts|scss|css)$/)).length,
  };

  const statsLines: string[] = [];
  if (stats.ts   > 0) statsLines.push(`  .ts:   ${stats.ts}`);
  if (stats.tsx  > 0) statsLines.push(`  .tsx:  ${stats.tsx}`);
  if (stats.js   > 0) statsLines.push(`  .js:   ${stats.js}`);
  if (stats.jsx  > 0) statsLines.push(`  .jsx:  ${stats.jsx}`);
  if (stats.scss > 0) statsLines.push(`  .scss: ${stats.scss}`);
  if (stats.css  > 0) statsLines.push(`  .css:  ${stats.css}`);
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
    `提示: 使用 source_inspect(mode="get_file") 传入上述路径获取文件代码`,
  ];

  return { content: [{ type: 'text', text: output.join('\n') }] };
}

async function handleGetFile(args: Record<string, unknown>): Promise<CallToolResult> {
  const filePath = args?.filePath as string | undefined;
  const fullCode = (args?.fullCode as boolean | undefined) || false;

  if (!filePath) {
    return {
      content: [{ type: 'text', text: 'get_file 模式需要提供 filePath' }],
      isError: true,
    };
  }

  const parsed = parseFilePath(filePath);
  if (!parsed) {
    return {
      content: [{
        type: 'text',
        text: `无效的文件路径格式，应为 @scope/package/path。\n提供的路径: ${filePath}\n示例: ${PACKAGE_NAME}/Button/index.tsx`,
      }],
      isError: true,
    };
  }

  let packageRoot: string;
  try {
    packageRoot = resolvePackageRoot(parsed.packageName);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `无法找到包 "${parsed.packageName}": ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }

  let content: string;
  try {
    content = readSourceFile(packageRoot, parsed.relativePath);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `读取文件失败: ${error instanceof Error ? error.message : String(error)}\n文件: ${filePath}` }],
      isError: true,
    };
  }

  const lineCount = content.split('\n').length;
  const shouldFilter = isScriptFile(filePath) && !fullCode && lineCount >= LINE_THRESHOLD;

  let outputContent = content;
  let processInfo = '';
  if (shouldFilter) {
    outputContent = removeFunctionBodies(content, filePath);
    processInfo = `（代码较长，函数体已替换为 "{ ... }"，可用 fullCode=true 获取完整代码，或用 get_function 模式读取具体函数）`;
  }

  const output = [
    `文件: ${filePath}`,
    `行数: ${lineCount}`,
    processInfo ? `处理: ${processInfo}` : '',
    '',
    '='.repeat(60),
    '',
    outputContent,
  ].filter(Boolean);

  return { content: [{ type: 'text', text: output.join('\n') }] };
}

async function handleGetFunction(args: Record<string, unknown>): Promise<CallToolResult> {
  const filePath = args?.filePath as string | undefined;
  const functionName = args?.functionName as string | undefined;

  if (!filePath) {
    return {
      content: [{ type: 'text', text: 'get_function 模式需要提供 filePath' }],
      isError: true,
    };
  }
  if (!functionName) {
    return {
      content: [{ type: 'text', text: 'get_function 模式需要提供 functionName' }],
      isError: true,
    };
  }

  const parsed = parseFilePath(filePath);
  if (!parsed) {
    return {
      content: [{
        type: 'text',
        text: `无效的文件路径格式，应为 @scope/package/path。\n提供的路径: ${filePath}`,
      }],
      isError: true,
    };
  }

  let packageRoot: string;
  try {
    packageRoot = resolvePackageRoot(parsed.packageName);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `无法找到包 "${parsed.packageName}": ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }

  let content: string;
  try {
    content = readSourceFile(packageRoot, parsed.relativePath);
  } catch (error) {
    return {
      content: [{ type: 'text', text: `读取文件失败: ${error instanceof Error ? error.message : String(error)}\n文件: ${filePath}` }],
      isError: true,
    };
  }

  const functionCode = extractFunction(content, functionName, filePath);
  if (!functionCode) {
    const allFunctions = getFunctionNames(content, filePath);
    return {
      content: [{
        type: 'text',
        text: [
          `未找到函数 "${functionName}"`,
          `文件: ${filePath}`,
          ``,
          `文件中可用的函数/方法（共 ${allFunctions.length} 个）:`,
          ...allFunctions.map(n => `  - ${n}`),
        ].join('\n'),
      }],
      isError: true,
    };
  }

  return {
    content: [{
      type: 'text',
      text: [`文件: ${filePath}`, `函数: ${functionName}`, '', '='.repeat(60), '', functionCode].join('\n'),
    }],
  };
}

// ============ 工具处理器 ============

export async function handleSourceInspect(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const mode = (args?.mode as string) ?? '';

  try {
    switch (mode) {
      case 'list_files':
        return handleListFiles(args);
      case 'get_file':
        return handleGetFile(args);
      case 'get_function':
        return handleGetFunction(args);
      default:
        return {
          content: [{
            type: 'text',
            text: `未知 mode "${mode}"。可用值：list_files | get_file | get_function`,
          }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [{ type: 'text', text: `source_inspect 失败: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
