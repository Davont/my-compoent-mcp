/**
 * fetch_design_data 工具
 *
 * 从 Octo 平台下载设计稿到本地 .octo/ 目录，支持两种数据源：
 * - fileKey 模式：通过 getDSL 下载设计稿
 * - shareCode 模式：通过分享口令下载 ZIP 并原样解压到 .octo/（无需 Token）
 *
 * 下载完成后配合 design_to_code 工具完成设计稿转代码。
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, mkdirSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';
import {
  ENV_OCTO_DIR,
  FETCH_DESIGN_TIMEOUT,
} from '../config.js';
import { decodeSharePassword, extractTransferZipToDir } from '../utils/octo-transfer.js';
import { OctoFileInfo, listOctoFiles } from '../utils/octo-files.js';
import { getDSL } from '../utils/get-dsl.js';

const SAFE_FILENAME_RE = /^[\w-]+$/;

function getOctoDir(): string {
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

function formatLocalFileList(octoDir: string, files: OctoFileInfo[]): string {
  const lines: string[] = [];
  lines.push('# .octo/ 本地设计稿文件\n');
  if (files.length === 0) {
    lines.push('当前无本地文件。使用 `fetch_design_data({ input: "..." })` 传入分享口令或 fileKey 下载。');
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
  lines.push('> 使用 `design_to_code({ file: "文件名" })` 转换为代码。');
  return lines.join('\n');
}

// ============ 工具定义 ============

export const fetchDesignDataTool: Tool = {
  name: 'fetch_design_data',
  description:
    '从 Octo 平台下载设计稿到本地 .octo/ 目录，供 design_to_code 工具使用。\n\n' +
    '传入 input 参数即可，工具自动识别类型：\n' +
    '- 包含 ## 的字符串（如 "##53085E4C##"）→ 分享口令模式，下载 ZIP 并原样解压到 .octo/，无需配置 Token\n' +
    '- 其他字符串（如 "9E5B01GS_546"）→ fileKey 模式，通过 getDSL 下载设计稿\n\n' +
    '使用流程：\n' +
    '1. 调用本工具下载设计稿：`fetch_design_data({ input: "##53085E4C##" })`\n' +
    '2. 调用 `design_to_code({ file: "xxx" })` 转换为代码\n\n' +
    '不传 input 时列出本地已有文件。',
  inputSchema: {
    type: 'object',
    properties: {
      input: {
        type: 'string',
        description:
          '设计稿标识，自动识别类型：包含 ## 视为分享口令（如 "##53085E4C##"），否则视为 fileKey（如 "9E5B01GS_546"）。不传则列出本地已有文件。',
      },
      saveName: {
        type: 'string',
        description:
          '保存的文件名（不含扩展名）。默认自动从 input 推导。只允许字母、数字、连字符、下划线。',
      },
      timeout: {
        type: 'number',
        description: `请求超时时间（毫秒），默认 ${FETCH_DESIGN_TIMEOUT}ms。`,
      },
      overwrite: {
        type: 'boolean',
        description: '本地已有同名文件时是否覆盖，默认 true。',
      },
    },
  },
};

// ============ 工具处理器 ============

export async function handleFetchDesignData(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const rawInput = typeof args?.input === 'string' ? args.input.trim() : undefined;
  const rawSaveName = typeof args?.saveName === 'string' ? args.saveName.trim() : undefined;
  const timeout = typeof args?.timeout === 'number' && args.timeout > 0
    ? args.timeout
    : FETCH_DESIGN_TIMEOUT;
  const overwrite = args?.overwrite !== false;

  const octoDir = getOctoDir();

  // 未传 input：列出本地文件
  if (!rawInput) {
    const files = listOctoFiles(octoDir);
    return {
      content: [{ type: 'text', text: formatLocalFileList(octoDir, files) }],
    };
  }

  // 自动识别：包含 ## → 分享口令模式，否则 → fileKey 模式
  const shareCodeId = decodeSharePassword(rawInput);
  const isShareMode = shareCodeId !== undefined;

  // ============ shareCode 模式 ============
  if (isShareMode) {
    const code = shareCodeId;

    if (rawSaveName && !SAFE_FILENAME_RE.test(rawSaveName)) {
      return {
        content: [{
          type: 'text',
          text: `文件名 "${rawSaveName}" 包含非法字符。只允许字母、数字、连字符（-）和下划线（_）。`,
        }],
        isError: true,
      };
    }

    if (!existsSync(octoDir)) {
      mkdirSync(octoDir, { recursive: true });
    }

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
      return {
        content: [{ type: 'text', text: `分享口令下载失败: ${msg}` }],
        isError: true,
      };
    }

    if (savedFiles.length === 0 && skippedFiles.length > 0 && !overwrite) {
      return {
        content: [{
          type: 'text',
          text: '压缩包已下载，但所有目标文件已存在且 overwrite=false，未写入新文件。',
        }],
      };
    }

    const rootOctoFiles = listOctoFiles(octoDir);
    const previewFiles = savedFiles.slice(0, 12);

    const lines: string[] = [];
    lines.push('# 设计稿下载完成（分享口令模式）\n');
    lines.push(`| 项目 | 值 |`);
    lines.push(`|------|------|`);
    lines.push(`| 来源 | 分享口令 ${code} |`);
    lines.push(`| 原始压缩包 | ${zipName} |`);
    lines.push(`| 新写入文件 | ${savedFiles.length} |`);
    lines.push(`| 已跳过文件 | ${skippedFiles.length} |`);

    if (rawSaveName) {
      lines.push('');
      lines.push(`> 提示：shareCode 模式会按压缩包原始路径解压，\`saveName\` 参数在该模式下不重命名文件。`);
    }

    if (previewFiles.length > 0) {
      lines.push('');
      lines.push('写入文件（最多显示 12 条）：');
      for (const file of previewFiles) {
        lines.push(`- \`${file}\``);
      }
      if (savedFiles.length > previewFiles.length) {
        lines.push(`- ... 共 ${savedFiles.length} 个`);
      }
    }

    lines.push('');
    if (rootOctoFiles.length > 0) {
      lines.push(`> 下一步：调用 \`design_to_code({ file: "${rootOctoFiles[0].name}" })\` 转换为代码。`);
    } else {
      lines.push('> 已解压到 .octo/，当前根目录未检测到可直接转换的 .json/.vue 文件。');
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  }

  // ============ fileKey 模式（通过 getDSL 下载） ============

  const fileKey = rawInput;

  const saveName = rawSaveName || fileKey.replace(/[^\w-]/g, '_');
  if (!SAFE_FILENAME_RE.test(saveName)) {
    return {
      content: [{
        type: 'text',
        text: `文件名 "${saveName}" 包含非法字符。只允许字母、数字、连字符（-）和下划线（_）。`,
      }],
      isError: true,
    };
  }

  const targetPath = resolve(octoDir, `${saveName}.json`);
  const resolvedOctoDir = resolve(octoDir);
  if (!targetPath.startsWith(resolvedOctoDir + sep) && targetPath !== resolvedOctoDir) {
    return {
      content: [{ type: 'text', text: `路径安全检查失败: ${saveName}` }],
      isError: true,
    };
  }

  if (!overwrite && existsSync(targetPath)) {
    return {
      content: [{
        type: 'text',
        text:
          `文件 "${saveName}.json" 已存在。传入 overwrite: true 可覆盖，` +
          `或使用不同的 saveName。\n\n` +
          `直接使用已有文件：\`design_to_code({ file: "${saveName}" })\``,
      }],
    };
  }

  if (!existsSync(octoDir)) {
    mkdirSync(octoDir, { recursive: true });
  }

  let text: string;
  try {
    text = await getDSL({ code: fileKey, filePath: targetPath });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `设计稿下载失败: ${msg}` }],
      isError: true,
    };
  }

  const fileSize = formatBytes(Buffer.byteLength(text, 'utf-8'));

  const lines: string[] = [];
  lines.push('# 设计稿下载完成\n');
  lines.push(`| 项目 | 值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 文件 | \`${saveName}.json\` |`);
  lines.push(`| 大小 | ${fileSize} |`);
  lines.push('');
  lines.push(`> 下一步：调用 \`design_to_code({ file: "${saveName}" })\` 转换为代码。`);

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}
