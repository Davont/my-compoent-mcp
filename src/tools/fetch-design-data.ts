/**
 * fetch_design_data 工具
 *
 * 从 Octo 平台下载设计稿到本地 .octo/ 目录，支持两种数据源：
 * - fileKey 模式：通过 Octo REST API 拉取原始 Figma JSON（需配置 Token）
 * - shareCode 模式：通过分享口令下载服务端预生成的 Vue 代码（无需 Token）
 *
 * 下载完成后配合 design_to_code 工具完成设计稿转代码。
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { join, resolve, sep } from 'path';
import {
  ENV_OCTO_DIR,
  ENV_OCTO_API_BASE,
  ENV_OCTO_TOKEN,
  FETCH_DESIGN_TIMEOUT,
} from '../config.js';
import { decodeSharePassword, downloadTransferZip } from '../utils/octo-transfer.js';
import { OctoFileInfo, listOctoFiles } from '../utils/octo-files.js';

const SAFE_FILENAME_RE = /^[\w-]+$/;

function getOctoDir(): string {
  const envDir = process.env[ENV_OCTO_DIR];
  if (envDir) return envDir;
  return join(process.cwd(), '.octo');
}

function countNodes(obj: unknown): number {
  if (!obj || typeof obj !== 'object') return 0;
  let count = 1;
  const record = obj as Record<string, unknown>;
  if (Array.isArray(record.children)) {
    for (const child of record.children) {
      count += countNodes(child);
    }
  }
  return count;
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

// ============ Octo API 请求 ============

interface OctoFetchOptions {
  apiBase: string;
  token: string;
  fileKey: string;
  nodeId?: string;
  timeout: number;
}

interface OctoFetchResult {
  json: unknown;
  rawSize: number;
  durationMs: number;
}

async function fetchFromOcto(opts: OctoFetchOptions): Promise<OctoFetchResult> {
  const { apiBase, token, fileKey, nodeId, timeout } = opts;

  let url = `${apiBase.replace(/\/+$/, '')}/designs/${encodeURIComponent(fileKey)}`;
  if (nodeId) {
    url += `?nodeId=${encodeURIComponent(nodeId)}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const startTime = Date.now();

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(
        `Octo API 返回 ${res.status} ${res.statusText}${body ? `: ${body.slice(0, 200)}` : ''}`
      );
    }

    const text = await res.text();
    const durationMs = Date.now() - startTime;
    const json = JSON.parse(text);

    return { json, rawSize: text.length, durationMs };
  } finally {
    clearTimeout(timer);
  }
}

// ============ 工具定义 ============

export const fetchDesignDataTool: Tool = {
  name: 'fetch_design_data',
  description:
    '从 Octo 平台下载设计稿到本地 .octo/ 目录，供 design_to_code 工具使用。\n\n' +
    '传入 input 参数即可，工具自动识别类型：\n' +
    '- 包含 ## 的字符串（如 "##53085E4C##"）→ 分享口令模式，下载预生成 Vue 代码，无需配置 Token\n' +
    '- 其他字符串（如 "abc123"）→ fileKey 模式，下载原始 Figma JSON（需配置 OCTO_API_BASE 和 OCTO_TOKEN）\n\n' +
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
          '设计稿标识，自动识别类型：包含 ## 视为分享口令（如 "##53085E4C##"），否则视为 fileKey。不传则列出本地已有文件。',
      },
      nodeId: {
        type: 'string',
        description:
          '指定节点 ID（如 "33:943"），只下载该节点子树。仅 fileKey 模式生效。',
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
  const nodeId = typeof args?.nodeId === 'string' ? args.nodeId.trim() : undefined;
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

    const saveName = rawSaveName || code.replace(/[^\w-]/g, '_');
    if (!SAFE_FILENAME_RE.test(saveName)) {
      return {
        content: [{
          type: 'text',
          text: `文件名 "${saveName}" 包含非法字符。只允许字母、数字、连字符（-）和下划线（_）。`,
        }],
        isError: true,
      };
    }

    const targetPath = resolve(octoDir, `${saveName}.vue`);
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
            `文件 "${saveName}.vue" 已存在。传入 overwrite: true 可覆盖，` +
            `或使用不同的 saveName。\n\n` +
            `直接使用已有文件：\`design_to_code({ file: "${saveName}" })\``,
        }],
      };
    }

    let vueContent: string;
    let fileName: string;
    try {
      const result = await downloadTransferZip(code, { timeout });
      vueContent = result.vueContent;
      fileName = result.fileName;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `分享口令下载失败: ${msg}` }],
        isError: true,
      };
    }

    if (!existsSync(octoDir)) {
      mkdirSync(octoDir, { recursive: true });
    }

    try {
      writeFileSync(targetPath, vueContent, 'utf-8');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      return {
        content: [{ type: 'text', text: `写入文件失败: ${msg}` }],
        isError: true,
      };
    }

    const fileSize = formatBytes(Buffer.byteLength(vueContent, 'utf-8'));
    const lines: string[] = [];
    lines.push('# 设计稿下载完成（分享口令模式）\n');
    lines.push(`| 项目 | 值 |`);
    lines.push(`|------|------|`);
    lines.push(`| 文件 | \`${saveName}.vue\` |`);
    lines.push(`| 大小 | ${fileSize} |`);
    lines.push(`| 来源 | 分享口令 ${code} |`);
    lines.push(`| 原始文件 | ${fileName} |`);
    lines.push('');
    lines.push(`> 下一步：调用 \`design_to_code({ file: "${saveName}" })\` 转换为代码。`);

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
    };
  }

  // ============ fileKey 模式（原有逻辑） ============

  const fileKey = rawInput;

  // 检查环境变量
  const apiBase = process.env[ENV_OCTO_API_BASE];
  const token = process.env[ENV_OCTO_TOKEN];

  if (!apiBase) {
    return {
      content: [{
        type: 'text',
        text:
          `未配置 Octo API 地址。请设置环境变量：\n` +
          `  ${ENV_OCTO_API_BASE}=https://your-octo-api.example.com/api/v1\n\n` +
          `同时需要设置认证 Token：\n` +
          `  ${ENV_OCTO_TOKEN}=your-token\n\n` +
          `或者使用 shareCode 模式，无需配置环境变量。`,
      }],
      isError: true,
    };
  }

  if (!token) {
    return {
      content: [{
        type: 'text',
        text:
          `未配置 Octo 认证 Token。请设置环境变量：\n` +
          `  ${ENV_OCTO_TOKEN}=your-token`,
      }],
      isError: true,
    };
  }

  // 确定保存文件名
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

  // 路径安全校验：确保解析后的路径在 .octo/ 目录内
  const targetPath = resolve(octoDir, `${saveName}.json`);
  const resolvedOctoDir = resolve(octoDir);
  if (!targetPath.startsWith(resolvedOctoDir + sep) && targetPath !== resolvedOctoDir) {
    return {
      content: [{ type: 'text', text: `路径安全检查失败: ${saveName}` }],
      isError: true,
    };
  }

  // 检查是否已存在
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

  // 从 Octo API 下载
  let result: OctoFetchResult;
  try {
    result = await fetchFromOcto({ apiBase, token, fileKey, nodeId, timeout });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        content: [{
          type: 'text',
          text:
            `请求超时（${timeout}ms）。可能原因：\n` +
            `- Octo API 响应慢\n` +
            `- 设计稿文件过大\n` +
            `- 网络不稳定\n\n` +
            `尝试：\n` +
            `- 增大 timeout 参数\n` +
            `- 使用 nodeId 只下载指定节点`,
        }],
        isError: true,
      };
    }
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Octo API 请求失败: ${msg}` }],
      isError: true,
    };
  }

  // 确保 .octo/ 目录存在
  if (!existsSync(octoDir)) {
    mkdirSync(octoDir, { recursive: true });
  }

  // 写入文件
  try {
    const jsonStr = JSON.stringify(result.json);
    writeFileSync(targetPath, jsonStr, 'utf-8');
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `写入文件失败: ${msg}` }],
      isError: true,
    };
  }

  // 统计信息
  const nodeCount = countNodes(result.json);
  const fileSize = formatBytes(result.rawSize);

  const lines: string[] = [];
  lines.push('# 设计稿下载完成\n');
  lines.push(`| 项目 | 值 |`);
  lines.push(`|------|------|`);
  lines.push(`| 文件 | \`${saveName}.json\` |`);
  lines.push(`| 大小 | ${fileSize} |`);
  lines.push(`| 节点数 | ${nodeCount} |`);
  lines.push(`| 耗时 | ${result.durationMs}ms |`);
  if (nodeId) {
    lines.push(`| 节点筛选 | ${nodeId} |`);
  }
  lines.push('');
  lines.push(`> 下一步：调用 \`design_to_code({ file: "${saveName}" })\` 转换为代码。`);

  return {
    content: [{ type: 'text', text: lines.join('\n') }],
  };
}
