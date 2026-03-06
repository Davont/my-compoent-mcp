/**
 * design_to_code 工具
 *
 * 读取项目根目录 .octo/ 下的设计稿 JSON 文件，调用 transform 函数转换为
 * 简化 DSL 或 React 脚手架（CSS + JSX），供 AI 结合 get_context_bundle
 * 工具生成符合组件库规范的页面代码。
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
import { ENV_OCTO_DIR, DEFAULT_OUTPUT_MODE } from '../config.js';

// 只允许文件名中出现字母、数字、连字符、下划线，防止路径穿越
const SAFE_FILENAME_RE = /^[\w-]+$/;

/**
 * 获取 .octo/ 目录的绝对路径
 * 优先级：环境变量 OCTO_DIR > process.cwd()/.octo
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

interface FormatOptions {
  fileName: string;
  outputMode: TransformMode;
  content: string;
  css?: string;
  jsx?: string;
  componentBundle?: string | null;
  recommendedComponents?: string[];
}

/**
 * 格式化转换结果输出
 */
function formatTransformOutput(opts: FormatOptions): string {
  const { fileName, outputMode, content, css, jsx, componentBundle, recommendedComponents } = opts;
  const lines: string[] = [];
  const modeLabel = outputMode === 'html' ? 'React 脚手架' : '简化 DSL';
  lines.push(`# 设计稿数据已就绪（${modeLabel} 模式）\n`);
  lines.push(`文件：${fileName}.json`);
  lines.push(`输出格式：${outputMode}\n`);

  if (outputMode === 'html' && css && jsx) {
    lines.push('## 文件 1：styles.css\n');
    lines.push('```css');
    lines.push(css);
    lines.push('```\n');
    lines.push('## 文件 2：Page.tsx\n');
    lines.push('```tsx');
    lines.push("import React from 'react';");
    lines.push("import './styles.css';\n");
    lines.push('export default function Page() {');
    lines.push('  return (');
    lines.push(`    ${jsx}`);
    lines.push('  );');
    lines.push('}');
    lines.push('```\n');
    lines.push('> ⚠️ **必须严格按顺序完成以下全部步骤：**');
    lines.push('> 1. **先复制**：将以上 styles.css 和 Page.tsx 的代码**逐字原样**写入项目文件，禁止修改任何内容');
    lines.push('> 2. **再改造**：只改 `n-` 开头的类名（参考 `data-name` 语义化），`s-` 开头的共享类和布局类（flex-row-start 等）禁止修改。删除所有 `data-name`。不要改样式值');
  } else if (outputMode === 'html') {
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
    lines.push('> INSTANCE 节点对应组件库组件');
  }

  lines.push('');
  lines.push('---');
  lines.push('## 组件识别结果\n');
  if (recommendedComponents && recommendedComponents.length > 0) {
    lines.push(`识别到的组件库组件：${recommendedComponents.map(c => `\`${c}\``).join('、')}`);
    lines.push('');
    lines.push('⚠️ **只有以上列出的组件才能从组件库导入。** 其他 name（如 StatusBar、TitleBar 等）是设计稿图层名，不是组件库组件，必须用普通 HTML/CSS（div、span 等）实现。');
  } else {
    lines.push('未识别到组件库组件。');
    lines.push('');
    lines.push('⚠️ **不要从组件库导入任何组件。** name 字段是设计稿图层名，不是组件库组件名。全部使用普通 HTML/CSS 实现。');
  }

  if (componentBundle) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(componentBundle);
    lines.push('');
    lines.push('---');
    lines.push('> 以上是生成代码所需的全部上下文，请直接基于设计稿数据和组件规范生成代码。');
  } else if (recommendedComponents && recommendedComponents.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('> 下一步：调用 `get_context_bundle` 获取以上识别到的组件的详细规范。');
  }

  return lines.join('\n');
}

// ============ 工具定义 ============

export const designToCodeTool: Tool = {
  name: 'design_to_code',
  description:
    '【设计稿转代码的唯一入口】当用户提到 .octo、index.json、设计稿、Figma、Octo，或要求"转化/转换/生成 前端页面代码"时，必须首先调用本工具。' +
    '无需先调用 get_context_bundle 或 component_search，本工具已内置组件识别和规范获取。\n\n' +
    '⚠️ 禁止用 read_file 直接读取 .octo/ 下的 JSON 文件（文件极大，会浪费 token）。直接调用本工具即可，工具内部自动读取、解析、转换。\n\n' +
    '将 .octo/ 目录下的设计稿 JSON 转换为精简 DSL 或 React 脚手架（CSS + JSX），自动推断 flex 布局和 CSS 样式，识别组件库组件并联动返回 Props 规范。\n\n' +
    '- 不传 file：列出 .octo/ 下所有可用文件名\n' +
    '- 传 file + outputMode：转换指定设计稿，返回结构化数据 + 组件规范（如有匹配）\n\n' +
    '⚠️ 调用本工具后，必须完成以下全部步骤才算任务完成，缺少任何一步都不算完成：\n\n' +
    '第一步（复制写入）：将返回的 styles.css 和 Page.tsx 逐字原样写入项目文件，禁止修改任何内容。\n\n' +
    '第二步（语义化改造）：在已写入的文件上修改：\n' +
    '  a. 只改 n- 开头的独立类名（如 n-33-946、n-rel-33-945、n-split-33-xxx）：参考对应元素的 data-name 属性理解其含义，替换为语义化名称（如 task-goal、title-bar）。styles.css 中的选择器同步修改，样式值保持不变\n' +
    '  b. s- 开头的共享类名（如 s-729846、s-02dea1）是多个元素共用的，禁止修改、禁止拆分、禁止重命名\n' +
    '  c. layout-node、flex-row-start、flex-col-center、btn、text、icon、vector 等布局类禁止修改\n' +
    '  d. 删除所有 data-name 属性\n\n' +
    '只有第一步和第二步全部完成，才能结束任务。不要替换组件库组件，不要添加交互事件，不要修改任何 CSS 样式值。',
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
          `输出格式。html: React 脚手架（CSS 文件 + JSX 组件，可直接复制使用）；dsl: 精简 JSON（token 少）。默认 ${DEFAULT_OUTPUT_MODE}。`,
      },
    },
  },
};

// ============ 工具处理器 ============

export async function handleDesignToCode(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const file = typeof args?.file === 'string' ? args.file.trim() : undefined;
  const rawMode = typeof args?.outputMode === 'string' ? args.outputMode : DEFAULT_OUTPUT_MODE;
  const outputMode: TransformMode = rawMode === 'dsl' ? 'dsl' : 'html';

  const octoDir = getOctoDir();

  // .octo/ 目录不存在
  if (!existsSync(octoDir)) {
    return {
      content: [{
        type: 'text',
        text: `未找到 .octo/ 目录（查找路径：${octoDir}）。\n` +
          `请设置环境变量 OCTO_DIR 指向 .octo 目录的绝对路径，例如：OCTO_DIR=/path/to/project/.octo`,
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
          text: `未找到设计稿文件 "${file}.json"（查找路径：${octoDir}）。\n可用文件：${availableStr}`,
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

  const output = formatTransformOutput({
    fileName: file,
    outputMode: result.mode,
    content: result.content,
    css: result.css,
    jsx: result.jsx,
    componentBundle,
    recommendedComponents: recommended,
  });
  return {
    content: [{ type: 'text', text: output }],
  };
}
