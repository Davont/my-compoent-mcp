/**
 * design_to_code 工具
 *
 * 读取项目根目录 .octo/ 下的设计稿 JSON 文件，调用 transform 函数转换为
 * 简化 DSL 或 HTML，供 AI 结合 get_context_bundle 工具生成符合
 * my-design 规范的页面代码。
 *
 * 两种使用方式：
 * - 不传 file：列出 .octo/ 下所有可用的设计稿文件名
 * - 传 file：读取并转换指定设计稿，返回 DSL 或 HTML 内容
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, resolve, basename, sep } from 'path';
import { transform, TransformMode } from '../transform/index.js';
import { handleGetContextBundle } from './get-context-bundle.js';
import { ENV_OCTO_DIR } from '../config.js';

// 只允许文件名中出现字母、数字、连字符、下划线，防止路径穿越
const SAFE_FILENAME_RE = /^[\w-]+$/;

/**
 * 获取 .octo/ 目录的绝对路径
 * 优先读取环境变量 OCTO_DIR，回退到 process.cwd()/.octo
 */
function getOctoDir(): string {
  const envDir = process.env[ENV_OCTO_DIR];
  if (envDir) return envDir;
  return join(process.cwd(), '.octo');
}

/**
 * 列出 .octo/ 下所有可读取的 .json 文件（不含扩展名）
 * 只返回满足 SAFE_FILENAME_RE 的文件名，确保"列出的都能读"
 */
function listOctoFiles(octoDir: string): string[] {
  const entries = readdirSync(octoDir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.json'))
    .map(e => basename(e.name, '.json'))
    .filter(name => SAFE_FILENAME_RE.test(name))
    .sort();
}

/**
 * 格式化文件列表输出
 */
function formatFileList(files: string[]): string {
  const lines: string[] = [];
  lines.push('# .octo/ 可用设计稿文件\n');
  lines.push(`共 ${files.length} 个文件：\n`);
  for (const f of files) {
    lines.push(`- \`${f}\``);
  }
  lines.push('');
  lines.push('> 使用 `design_to_code` 并传入 `file` 参数来读取并转换指定设计稿。');
  lines.push('> 示例：`design_to_code({ file: "' + (files[0] ?? 'home') + '", outputMode: "dsl" })`');
  return lines.join('\n');
}

/**
 * 格式化转换结果输出
 */
function formatTransformOutput(
  fileName: string,
  outputMode: TransformMode,
  content: string,
  componentBundle?: string | null
): string {
  const lines: string[] = [];
  const modeLabel = outputMode === 'html' ? 'HTML' : '简化 DSL';
  lines.push(`# 设计稿数据已就绪（${modeLabel} 模式）\n`);
  lines.push(`文件：${fileName}.json`);
  lines.push(`输出格式：${outputMode}\n`);

  if (outputMode === 'html') {
    lines.push('## 设计稿 HTML\n');
    lines.push('```html');
    lines.push(content);
    lines.push('```');
  } else {
    lines.push('## 设计稿 DSL\n');
    lines.push('```json');
    lines.push(content);
    lines.push('```');
    lines.push('');
    lines.push('> DSL 字段：id=顺序编号, type=节点类型, w/h=宽高, text=文本内容, name=组件名');
    lines.push('> layout: direction/align/justify/gap/ml/mt/mr/mb/pl/pt/pr/pb');
    lines.push('> styles: bg/border/radius/shadow/color/size/weight/leading');
    lines.push('> INSTANCE 节点对应 my-design 组件');
  }

  if (componentBundle) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(componentBundle);
    lines.push('');
    lines.push('---');
    lines.push('> 以上是生成代码所需的全部上下文，请直接基于设计稿数据和组件规范生成代码。');
  } else {
    lines.push('');
    lines.push('---');
    lines.push('> 下一步：调用 `get_context_bundle` 获取相关组件上下文，结合以上设计稿数据生成符合 my-design 规范的代码。');
  }

  return lines.join('\n');
}

// ============ 工具定义 ============

export const designToCodeTool: Tool = {
  name: 'design_to_code',
  description:
    '将 Octo 设计稿转换为精简 DSL 或语义化 HTML，自动推断 flex 布局和 CSS 样式，识别 my-design 组件并联动返回 Props 规范。\n\n' +
    '- 不传 file：列出 .octo/ 下所有可用文件名\n' +
    '- 传 file：转换指定设计稿，返回结构化数据 + 组件规范（如有匹配）\n\n' +
    '推荐流程：design_to_code → 获取 DSL + 组件规范 → 生成 React 代码 → 如需补充调用 get_context_bundle',
  inputSchema: {
    type: 'object',
    properties: {
      file: {
        type: 'string',
        description:
          '设计稿文件名（不含 .json 扩展名），如 "index"、"home"、"detail"。' +
          '省略时列出 .octo/ 下所有可用文件。通常使用 "index"。',
      },
      outputMode: {
        type: 'string',
        enum: ['dsl', 'html'],
        description:
          '输出格式。dsl: 精简 JSON（推荐，token 少，结构清晰）；html: 语义化 HTML（带内联样式）。默认 dsl。',
      },
    },
  },
};

// ============ 工具处理器 ============

export async function handleDesignToCode(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const file = typeof args?.file === 'string' ? args.file.trim() : undefined;
  const rawMode = typeof args?.outputMode === 'string' ? args.outputMode : 'dsl';
  const outputMode: TransformMode = rawMode === 'html' ? 'html' : 'dsl';

  const octoDir = getOctoDir();

  // .octo/ 目录不存在
  if (!existsSync(octoDir)) {
    return {
      content: [{
        type: 'text',
        text: `未找到 .octo/ 目录（查找路径：${octoDir}）。\n请在项目根目录创建 .octo/ 目录并放入设计稿 JSON 文件。`,
      }],
      isError: true,
    };
  }

  // 不传 file：列出所有可用文件
  if (!file) {
    try {
      const files = listOctoFiles(octoDir);
      if (files.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `.octo/ 目录为空，未找到任何 .json 文件。\n请将设计稿 JSON 文件放入 ${octoDir}/ 目录。`,
          }],
          isError: true,
        };
      }
      return {
        content: [{ type: 'text', text: formatFileList(files) }],
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `读取 .octo/ 目录失败: ${msg}` }],
        isError: true,
      };
    }
  }

  // 文件名安全校验：只允许字母、数字、连字符、下划线
  if (!SAFE_FILENAME_RE.test(file)) {
    return {
      content: [{
        type: 'text',
        text: `文件名 "${file}" 包含非法字符。只允许使用字母、数字、连字符（-）和下划线（_）。`,
      }],
      isError: true,
    };
  }

  // 路径安全校验：确保解析后的路径在 .octo/ 目录内（用 path.sep 兼容 Windows）
  const targetPath = resolve(octoDir, `${file}.json`);
  const resolvedOctoDir = resolve(octoDir);
  if (!targetPath.startsWith(resolvedOctoDir + sep) && targetPath !== resolvedOctoDir) {
    return {
      content: [{ type: 'text', text: `路径安全检查失败: ${file}` }],
      isError: true,
    };
  }

  // 文件不存在：列出可用文件
  if (!existsSync(targetPath)) {
    try {
      const available = listOctoFiles(octoDir);
      const availableStr = available.length > 0 ? available.map(f => `"${f}"`).join(', ') : '（无）';
      return {
        content: [{
          type: 'text',
          text: `未找到设计稿文件 "${file}.json"。\n可用文件：${availableStr}`,
        }],
        isError: true,
      };
    } catch {
      return {
        content: [{ type: 'text', text: `未找到设计稿文件 "${file}.json"。` }],
        isError: true,
      };
    }
  }

  // 读取并解析 JSON
  let json: unknown;
  try {
    const raw = readFileSync(targetPath, 'utf-8');
    json = JSON.parse(raw);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `读取或解析 ${file}.json 失败: ${msg}` }],
      isError: true,
    };
  }

  // 调用 transform 函数
  let result;
  try {
    result = transform(json, outputMode);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `transform 函数执行失败: ${msg}` }],
      isError: true,
    };
  }

  // 内置联动：如果 transform 返回了推荐组件，自动获取组件规范
  let componentBundle: string | null = null;
  const recommended = result.recommendedComponents;
  if (recommended && recommended.length > 0) {
    try {
      const bundleResult = await handleGetContextBundle({
        components: recommended,
        depth: 'summary',
      });
      if (!bundleResult.isError) {
        const firstContent = bundleResult.content[0];
        if (firstContent?.type === 'text') {
          componentBundle = firstContent.text;
        }
      }
    } catch {
      // 错误隔离：组件规范获取失败不影响设计稿内容返回
    }
  }

  const output = formatTransformOutput(file, result.mode, result.content, componentBundle);
  return {
    content: [{ type: 'text', text: output }],
  };
}
