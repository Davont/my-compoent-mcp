/**
 * get_design_data — Octo MCP 唯一工具
 *
 * 一站式处理设计稿：下载（可选） → 转换 → 输出到本地文件。
 *
 * 使用方式：
 * 1. 传入 input（shareCode / fileKey）：下载 + 转换，结果写入 .octo/
 * 2. 传入 file（本地已有文件名）：直接转换
 * 3. 不传参数：列出 .octo/ 下可用文件
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'fs';
import { isAbsolute, join, resolve, sep } from 'path';
import {
  processDesign,
  compressDSL,
  toJsonString,
  renderLayoutPageWithCss,
} from '../../octo/core.js';
import type { LayoutNode, CompressOptions } from '../../octo/core.js';
import { decodeSharePassword, extractTransferZipToDir } from '../../utils/octo-transfer.js';
import { listOctoFiles, type OctoFileInfo } from '../../utils/octo-files.js';
import {
  ENV_OCTO_DIR,
  ENV_OCTO_API_BASE,
  ENV_OCTO_TOKEN,
  FETCH_TIMEOUT,
  DEFAULT_OUTPUT_MODE,
  type OutputMode,
} from '../config.js';

const SAFE_FILENAME_RE = /^[\w-]+$/;

// ======================== 辅助函数 ========================

function getOctoDir(argDir?: string): string {
  if (argDir) return join(argDir, '.octo');
  const envDir = process.env[ENV_OCTO_DIR];
  if (envDir) return envDir;
  return join(process.cwd(), '.octo');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function countNodes(obj: unknown): number {
  if (!obj || typeof obj !== 'object') return 0;
  let count = 1;
  const record = obj as Record<string, unknown>;
  if (Array.isArray(record.children)) {
    for (const child of record.children) count += countNodes(child);
  }
  return count;
}

function ensureOctoDir(octoDir: string): void {
  if (!existsSync(octoDir)) mkdirSync(octoDir, { recursive: true });
}

function validateFileName(name: string): string | null {
  if (!SAFE_FILENAME_RE.test(name)) {
    return `文件名 "${name}" 包含非法字符。只允许字母、数字、连字符（-）和下划线（_）。`;
  }
  return null;
}

function checkPathSafety(octoDir: string, fileName: string): string | null {
  const targetPath = resolve(octoDir, fileName);
  const resolvedOctoDir = resolve(octoDir);
  if (!targetPath.startsWith(resolvedOctoDir + sep) && targetPath !== resolvedOctoDir) {
    return `路径安全检查失败: ${fileName}`;
  }
  return null;
}

function syncOctoDirToSettings(projectRoot: string): void {
  const codemateDir = join(projectRoot, '.codemate');
  if (!existsSync(codemateDir)) return;

  const settingsPath = join(codemateDir, 'mcp', 'mcp_settings.json');
  if (!existsSync(settingsPath)) return;

  let config: Record<string, unknown>;
  try {
    config = JSON.parse(readFileSync(settingsPath, 'utf-8'));
  } catch {
    return;
  }

  const servers = config.mcpServers as Record<string, Record<string, unknown>> | undefined;
  if (!servers || typeof servers !== 'object') return;

  const lowerKeys = Object.keys(servers);
  const serverKey = lowerKeys.find(k => {
    const lk = k.toLowerCase();
    return lk === 'octo-design' || lk === 'octo-mcp' || lk.includes('octo-mcp');
  });
  if (!serverKey) return;

  const env = servers[serverKey]?.env as Record<string, string> | undefined;
  if (!env || typeof env !== 'object') return;

  const expected = join(projectRoot, '.octo');
  const current = env.OCTO_DIR;
  if (current === expected) return;

  env.OCTO_DIR = expected;
  writeFileSync(settingsPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

// ======================== 下载逻辑 ========================

interface FetchResult {
  saveName: string;
  ext: string;
  sourceDesc: string;
  savedFiles: string[];
}

function pickConvertibleFile(files: string[]): string | undefined {
  if (files.length === 0) return undefined;
  if (files.includes('index.json')) return 'index.json';
  if (files.includes('index-px.vue')) return 'index-px.vue';
  const firstJson = files.find(f => f.endsWith('.json'));
  if (firstJson) return firstJson;
  return files.find(f => f.endsWith('.vue'));
}

async function fetchByShareCode(
  code: string,
  octoDir: string,
  saveName: string,
  timeout: number,
  overwrite: boolean,
): Promise<CallToolResult | FetchResult> {
  let zipName: string;
  let savedFiles: string[];
  let skippedFiles: string[];
  try {
    const result = await extractTransferZipToDir(code, octoDir, { timeout, overwrite });
    zipName = result.zipName;
    savedFiles = result.savedFiles;
    skippedFiles = result.skippedFiles;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `分享口令下载失败: ${msg}` }], isError: true };
  }

  const pickFrom = savedFiles.length > 0 ? savedFiles : skippedFiles;
  const rootConvertibleFiles = pickFrom
    .filter(f => !f.includes('/'))
    .filter(f => f.endsWith('.json') || f.endsWith('.vue'));
  const chosen = pickConvertibleFile(rootConvertibleFiles);

  if (!chosen) {
    const stateText = savedFiles.length > 0
      ? '已完成解压'
      : '压缩包已下载，但未写入新文件';
    const overwriteText = !overwrite && skippedFiles.length > 0
      ? '（overwrite=false，已有文件被跳过）'
      : '';
    return {
      content: [{
        type: 'text',
        text:
          `${stateText}${overwriteText}，但未发现根目录可直接转换的 .json/.vue 文件。\n` +
          `来源: 分享口令 ${code}（原始压缩包: ${zipName}）`,
      }],
    };
  }

  const ext: '.json' | '.vue' = chosen.endsWith('.json') ? '.json' : '.vue';
  const derivedName = chosen.slice(0, -ext.length);

  return {
    saveName: derivedName || saveName,
    ext,
    sourceDesc: `分享口令 ${code}（原始压缩包: ${zipName}）`,
    savedFiles,
  };
}

async function fetchByFileKey(
  fileKey: string,
  octoDir: string,
  saveName: string,
  nodeId: string | undefined,
  timeout: number,
  overwrite: boolean,
): Promise<CallToolResult | FetchResult> {
  const apiBase = process.env[ENV_OCTO_API_BASE];
  const token = process.env[ENV_OCTO_TOKEN];

  if (!apiBase || !token) {
    return {
      content: [{
        type: 'text',
        text: `fileKey 模式需要配置环境变量：\n  ${ENV_OCTO_API_BASE}=https://...\n  ${ENV_OCTO_TOKEN}=your-token\n\n或使用分享口令模式（包含 ## 的字符串），无需配置。`,
      }],
      isError: true,
    };
  }

  const targetPath = resolve(octoDir, `${saveName}.json`);

  if (!overwrite && existsSync(targetPath)) {
    return {
      content: [{ type: 'text', text: `文件 "${saveName}.json" 已存在，跳过下载。设置 overwrite: true 可覆盖。` }],
    };
  }

  let url = `${apiBase.replace(/\/+$/, '')}/designs/${encodeURIComponent(fileKey)}`;
  if (nodeId) url += `?nodeId=${encodeURIComponent(nodeId)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      return {
        content: [{ type: 'text', text: `Octo API 返回 ${res.status}${body ? `: ${body.slice(0, 200)}` : ''}` }],
        isError: true,
      };
    }

    const text = await res.text();
    const json = JSON.parse(text);

    ensureOctoDir(octoDir);
    writeFileSync(targetPath, JSON.stringify(json), 'utf-8');

    return { saveName, ext: '.json', sourceDesc: `fileKey ${fileKey}${nodeId ? ` (node: ${nodeId})` : ''}`, savedFiles: [`${saveName}.json`] };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { content: [{ type: 'text', text: `请求超时（${timeout}ms）。尝试增大 timeout 或使用 nodeId 缩小范围。` }], isError: true };
    }
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Octo API 请求失败: ${msg}` }], isError: true };
  } finally {
    clearTimeout(timer);
  }
}

// ======================== 转换逻辑 ========================

const DSL_COMPRESS_OPTIONS: CompressOptions = {
  simplifyId: true,
  removeCoordinates: true,
  keepAllName: true,
  omitDefaults: true,
  convertColors: true,
  removeUnits: true,
};

interface TransformOutput {
  ok: true;
  outputMode: OutputMode;
  files: Array<{ name: string; size: string }>;
}

function isTransformOutput(v: TransformOutput | CallToolResult): v is TransformOutput {
  return 'ok' in v && (v as TransformOutput).ok === true;
}

function transformAndSave(
  json: unknown,
  saveName: string,
  octoDir: string,
  outputMode: OutputMode,
): TransformOutput | CallToolResult {
  const _log = console.log;
  const _warn = console.warn;
  try {
    console.log = () => {};
    console.warn = () => {};

    const result = processDesign(json);
    const tree: LayoutNode | null = result?.tree ?? null;

    if (!tree) {
      return {
        content: [{ type: 'text', text: 'processDesign 未能生成布局树，设计数据可能格式不正确。' }],
        isError: true,
      };
    }

    const files: Array<{ name: string; size: string }> = [];

    if (outputMode === 'dsl') {
      const compressed = compressDSL(tree, DSL_COMPRESS_OPTIONS);
      const dslContent = toJsonString(compressed);
      const outPath = join(octoDir, `${saveName}.dsl.json`);
      writeFileSync(outPath, dslContent, 'utf-8');
      files.push({ name: `${saveName}.dsl.json`, size: formatBytes(Buffer.byteLength(dslContent, 'utf-8')) });
    } else if (outputMode === 'html') {
      const pageResult = renderLayoutPageWithCss(tree, {
        classMode: 'tailwind',
        semanticTags: true,
        enableDedup: true,
        includeNodeId: false,
        includeNodeName: true,
      });

      const css = pageResult.fullCss.replace(/body\s*\{[^}]*\}\n?/g, '').trim();
      const html = pageResult.html;

      const cssPath = join(octoDir, `${saveName}.css`);
      const htmlPath = join(octoDir, `${saveName}.html`);
      writeFileSync(cssPath, css, 'utf-8');
      writeFileSync(htmlPath, html, 'utf-8');
      files.push({ name: `${saveName}.css`, size: formatBytes(Buffer.byteLength(css, 'utf-8')) });
      files.push({ name: `${saveName}.html`, size: formatBytes(Buffer.byteLength(html, 'utf-8')) });
    } else {
      // vue 模式
      const pageResult = renderLayoutPageWithCss(tree, {
        classMode: 'tailwind',
        semanticTags: true,
        enableDedup: true,
        includeNodeId: false,
        includeNodeName: true,
      });

      const template = extractVueTemplate(pageResult.html);
      const css = pageResult.fullCss.replace(/body\s*\{[^}]*\}\n?/g, '').trim();
      const vue = [
        '<template>',
        template,
        '</template>',
        '',
        '<script setup lang="ts">',
        '</script>',
        '',
        '<style scoped>',
        css,
        '</style>',
      ].join('\n');

      const vuePath = join(octoDir, `${saveName}.output.vue`);
      writeFileSync(vuePath, vue, 'utf-8');
      files.push({ name: `${saveName}.output.vue`, size: formatBytes(Buffer.byteLength(vue, 'utf-8')) });
    }

    return { ok: true, outputMode, files };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `转换失败: ${msg}` }], isError: true };
  } finally {
    console.log = _log;
    console.warn = _warn;
  }
}

function extractVueTemplate(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return `  ${html}`;

  let body = bodyMatch[1].replace(/<script[\s\S]*?<\/script>/gi, '').trim();

  const containerMatch = body.match(
    /^<div\s+id="layout-container"\s+class="([^"]*)">([\s\S]*)<\/div>$/,
  );
  if (containerMatch) {
    body = `<div class="${containerMatch[1]}">${containerMatch[2]}</div>`;
  }

  return formatHtml(body, 1);
}

function formatHtml(html: string, initialDepth: number): string {
  const tokens = html.match(/<[^>]+>|[^<]+/g);
  if (!tokens) return html;

  const lines: string[] = [];
  let depth = initialDepth;
  const INDENT = '  ';
  const SELF_CLOSING = /\/\s*>$/;
  const CLOSING_TAG = /^<\//;
  const VOID_ELEMENTS = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    if (!trimmed.startsWith('<')) {
      lines.push(INDENT.repeat(depth) + trimmed);
      continue;
    }
    if (CLOSING_TAG.test(trimmed)) {
      depth = Math.max(0, depth - 1);
      lines.push(INDENT.repeat(depth) + trimmed);
    } else if (SELF_CLOSING.test(trimmed) || VOID_ELEMENTS.test(trimmed)) {
      lines.push(INDENT.repeat(depth) + trimmed);
    } else {
      lines.push(INDENT.repeat(depth) + trimmed);
      depth++;
    }
  }

  return lines.join('\n');
}

// ======================== 输出格式化 ========================

function formatFileList(octoDir: string, files: OctoFileInfo[]): string {
  const lines: string[] = [];
  lines.push('# .octo/ 本地设计稿文件\n');
  if (files.length === 0) {
    lines.push('当前无本地文件。');
    lines.push('');
    lines.push('使用方式：`get_design_data({ input: "##分享口令##" })` 或 `get_design_data({ input: "fileKey" })`');
    return lines.join('\n');
  }
  lines.push(`共 ${files.length} 个文件：\n`);
  for (const f of files) {
    const filePath = join(octoDir, `${f.name}${f.ext}`);
    const tag = f.ext === '.vue' ? ' [预生成 Vue]' : '';
    try {
      const stat = statSync(filePath);
      lines.push(`- \`${f.name}\` (${formatBytes(stat.size)})${tag}`);
    } catch {
      lines.push(`- \`${f.name}\`${tag}`);
    }
  }
  lines.push('');
  lines.push('> 使用 `get_design_data({ file: "文件名" })` 转换指定文件。');
  return lines.join('\n');
}

function formatResult(opts: {
  saveName: string;
  sourceDesc?: string;
  transformOutput: TransformOutput;
}): string {
  const { saveName, sourceDesc, transformOutput } = opts;
  const lines: string[] = [];

  lines.push('# 设计稿处理完成\n');
  lines.push('| 项目 | 值 |');
  lines.push('|------|------|');
  lines.push(`| 源文件 | \`${saveName}\` |`);
  if (sourceDesc) lines.push(`| 来源 | ${sourceDesc} |`);
  lines.push(`| 输出模式 | ${transformOutput.outputMode} |`);
  lines.push('');

  lines.push('## 输出文件\n');
  for (const f of transformOutput.files) {
    lines.push(`- \`${f.name}\` (${f.size})`);
  }
  lines.push('');
  lines.push('> 文件已写入 .octo/ 目录，可直接使用。');

  return lines.join('\n');
}

// ======================== 工具定义 ========================

export const getDesignDataTool: Tool = {
  name: 'get_design_data',
  description:
    '一站式处理设计稿：下载设计数据并转换为 DSL / HTML / Vue，结果保存到本地 .octo/ 目录。\n\n' +
    '三种使用方式：\n' +
    '1. 传入 input（分享口令或 fileKey）：自动下载 + 转换，结果写入 .octo/\n' +
    '2. 传入 file（本地已有文件名）：直接转换本地文件\n' +
    '3. 不传参数：列出 .octo/ 下所有可用文件\n\n' +
    'input 自动识别类型：\n' +
    '- 包含 ## 的字符串（如 "##53085E4C##"）→ 分享口令模式\n' +
    '- 其他字符串 → fileKey 模式（需配置 OCTO_API_BASE 和 OCTO_TOKEN 环境变量）',
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description:
          '设计稿标识。包含 ## 视为分享口令（如 "##53085E4C##"），否则视为 fileKey。与 file 二选一。',
      },
      file: {
        type: 'string',
        description:
          '本地已有的设计稿文件名（不含扩展名），直接转换。与 input 二选一。',
      },
      outputMode: {
        type: 'string',
        enum: ['dsl', 'html', 'vue'],
        description:
          `输出格式。dsl: 精简 JSON；html: HTML + CSS；vue: Vue SFC。默认 ${DEFAULT_OUTPUT_MODE}。`,
      },
      nodeId: {
        type: 'string',
        description: '指定节点 ID（如 "33:943"），只下载该节点子树。仅 fileKey 模式生效。',
      },
      saveName: {
        type: 'string',
        description: '保存的文件名（不含扩展名）。默认自动从 input/file 推导。',
      },
      timeout: {
        type: 'number',
        description: `下载超时时间（毫秒），默认 ${FETCH_TIMEOUT}ms。`,
      },
      overwrite: {
        type: 'boolean',
        description: '本地已有同名文件时是否覆盖，默认 true。',
      },
      projectRoot: {
        type: 'string',
        description:
          '项目根目录的绝对路径（如 "/home/user/my-project"），设计稿文件将存放在该目录下的 .octo/ 子目录中。必须是绝对路径。',
      },
    },
  },
};

// ======================== 工具处理器 ========================

export async function handleGetDesignData(
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const rawInput = typeof args?.input === 'string' ? args.input.trim() : undefined;
  const rawFile = typeof args?.file === 'string' ? args.file.trim() : undefined;
  const rawMode = typeof args?.outputMode === 'string' ? args.outputMode : DEFAULT_OUTPUT_MODE;
  const outputMode: OutputMode = rawMode === 'dsl' ? 'dsl' : rawMode === 'vue' ? 'vue' : 'html';
  const nodeId = typeof args?.nodeId === 'string' ? args.nodeId.trim() : undefined;
  const rawSaveName = typeof args?.saveName === 'string' ? args.saveName.trim() : undefined;
  const timeout = typeof args?.timeout === 'number' && args.timeout > 0 ? args.timeout : FETCH_TIMEOUT;
  const overwrite = args?.overwrite !== false;
  const rawProjectRoot = typeof args?.projectRoot === 'string' ? args.projectRoot.trim() : undefined;

  if (rawProjectRoot && !isAbsolute(rawProjectRoot)) {
    return {
      content: [{ type: 'text', text: `projectRoot 必须是绝对路径，当前传入: "${rawProjectRoot}"` }],
      isError: true,
    };
  }

  const octoDir = getOctoDir(rawProjectRoot);

  // 无参数：列出本地文件
  if (!rawInput && !rawFile) {
    const files = listOctoFiles(octoDir);
    return { content: [{ type: 'text', text: formatFileList(octoDir, files) }] };
  }

  // input 和 file 互斥
  if (rawInput && rawFile) {
    return {
      content: [{ type: 'text', text: 'input 和 file 不能同时传入，请二选一。' }],
      isError: true,
    };
  }

  // ============ file 模式：直接转换本地文件 ============
  if (rawFile) {
    const nameErr = validateFileName(rawFile);
    if (nameErr) return { content: [{ type: 'text', text: nameErr }], isError: true };

    const pathErr = checkPathSafety(octoDir, `${rawFile}.json`);
    if (pathErr) return { content: [{ type: 'text', text: pathErr }], isError: true };

    const jsonPath = resolve(octoDir, `${rawFile}.json`);
    const vuePath = resolve(octoDir, `${rawFile}.vue`);
    const hasJson = existsSync(jsonPath);
    const hasVue = existsSync(vuePath);

    if (!hasJson && !hasVue) {
      const available = listOctoFiles(octoDir);
      const availableStr = available.length > 0
        ? available.map(f => `"${f.name}"${f.ext === '.vue' ? ' [Vue]' : ''}`).join(', ')
        : '（无）';
      return {
        content: [{ type: 'text', text: `未找到文件 "${rawFile}"。可用文件：${availableStr}` }],
        isError: true,
      };
    }

    // .vue 文件已经是最终产物，直接告知用户
    if (hasVue && !hasJson) {
      const vueContent = readFileSync(vuePath, 'utf-8');
      const outName = rawSaveName || rawFile;
      const outNameErr = validateFileName(outName);
      if (outNameErr) return { content: [{ type: 'text', text: outNameErr }], isError: true };
      const outPathErr = checkPathSafety(octoDir, `${outName}.output.vue`);
      if (outPathErr) return { content: [{ type: 'text', text: outPathErr }], isError: true };
      const outPath = join(octoDir, `${outName}.output.vue`);
      writeFileSync(outPath, vueContent, 'utf-8');
      if (rawProjectRoot) syncOctoDirToSettings(rawProjectRoot);
      return {
        content: [{
          type: 'text',
          text: `文件 "${rawFile}.vue" 是预生成的 Vue 代码，已复制到 \`${outName}.output.vue\`。`,
        }],
      };
    }

    // .json 文件：走转换
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return { content: [{ type: 'text', text: `读取 ${rawFile}.json 失败: ${msg}` }], isError: true };
    }

    const saveName = rawSaveName || rawFile;
    if (rawSaveName) {
      const saveNameErr = validateFileName(saveName);
      if (saveNameErr) return { content: [{ type: 'text', text: saveNameErr }], isError: true };
      const savePathErr = checkPathSafety(octoDir, `${saveName}.json`);
      if (savePathErr) return { content: [{ type: 'text', text: savePathErr }], isError: true };
    }
    const transformResult = transformAndSave(json, saveName, octoDir, outputMode);
    if (!isTransformOutput(transformResult)) return transformResult;

    if (rawProjectRoot) syncOctoDirToSettings(rawProjectRoot);
    return {
      content: [{ type: 'text', text: formatResult({ saveName, transformOutput: transformResult }) }],
    };
  }

  // ============ input 模式：下载 + 转换 ============
  const input = rawInput!;
  const shareCodeId = decodeSharePassword(input);
  const isShareMode = shareCodeId !== undefined;

  const saveName = rawSaveName || (isShareMode
    ? shareCodeId!.replace(/[^\w-]/g, '_')
    : input.replace(/[^\w-]/g, '_'));

  const nameErr = validateFileName(saveName);
  if (nameErr) return { content: [{ type: 'text', text: nameErr }], isError: true };

  const pathErr = checkPathSafety(octoDir, `${saveName}.json`);
  if (pathErr) return { content: [{ type: 'text', text: pathErr }], isError: true };

  // 步骤 1：下载
  let fetchResult: CallToolResult | FetchResult;
  if (isShareMode) {
    fetchResult = await fetchByShareCode(shareCodeId!, octoDir, saveName, timeout, overwrite);
  } else {
    fetchResult = await fetchByFileKey(input, octoDir, saveName, nodeId, timeout, overwrite);
  }

  // 下载失败或被跳过（已存在且不覆盖），直接返回
  if ('content' in fetchResult) {
    return fetchResult;
  }

  // shareCode 下载的是预生成文件，不需要转换，直接返回下载结果
  if (isShareMode) {
    const lines: string[] = [];
    lines.push('# 设计稿下载完成（分享口令模式）\n');
    lines.push(`| 项目 | 值 |`);
    lines.push(`|------|------|`);
    lines.push(`| 来源 | ${fetchResult.sourceDesc} |`);
    lines.push(`| 文件数 | ${fetchResult.savedFiles.length} |`);
    lines.push('');
    lines.push('保存到 .octo/ 的文件：');
    for (const f of fetchResult.savedFiles) {
      lines.push(`- \`${f}\``);
    }
    lines.push('');
    lines.push('> 任务完成。文件已就绪，无需进一步操作。');
    if (rawProjectRoot) syncOctoDirToSettings(rawProjectRoot);
    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  }

  // .json 文件：走 core.js 转换
  const jsonPath = resolve(octoDir, `${fetchResult.saveName}.json`);
  let json: unknown;
  try {
    json = JSON.parse(readFileSync(jsonPath, 'utf-8'));
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `读取下载文件失败: ${msg}` }], isError: true };
  }

  const transformResult = transformAndSave(json, fetchResult.saveName, octoDir, outputMode);
  if (!isTransformOutput(transformResult)) return transformResult;

  if (rawProjectRoot) syncOctoDirToSettings(rawProjectRoot);
  return {
    content: [{
      type: 'text',
      text: formatResult({
        saveName: fetchResult.saveName,
        sourceDesc: fetchResult.sourceDesc,
        transformOutput: transformResult,
      }),
    }],
  };
}
