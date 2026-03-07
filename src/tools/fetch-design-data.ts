/**
 * fetch_design_data 工具
 *
 * 从 Octo 平台 API 下载设计稿 JSON 到本地 .octo/ 目录。
 * 下载完成后配合 design_to_code 工具完成设计稿转代码。
 *
 * 使用方式：
 * - 传 fileKey：从 Octo API 拉取指定设计稿
 * - 不传 fileKey 但传 list: true：列出 .octo/ 下已有文件
 *
 * 性能考虑：
 * - 设计稿 JSON 一般不超过 100KB，直接全量拉取
 * - 响应写入本地后只返回元信息（大小、节点数），不返回内容本身
 * - 可配置超时，默认 30s
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, mkdirSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, resolve, basename, sep } from 'path';
import {
  ENV_OCTO_DIR,
  ENV_OCTO_API_BASE,
  ENV_OCTO_TOKEN,
  FETCH_DESIGN_TIMEOUT,
} from '../config.js';

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

function listLocalFiles(octoDir: string): string[] {
  if (!existsSync(octoDir)) return [];
  const entries = readdirSync(octoDir, { withFileTypes: true });
  return entries
    .filter(e => e.isFile() && e.name.endsWith('.json'))
    .map(e => basename(e.name, '.json'))
    .filter(name => SAFE_FILENAME_RE.test(name))
    .sort();
}

function formatLocalFileList(octoDir: string, files: string[]): string {
  const lines: string[] = [];
  lines.push('# .octo/ 本地设计稿文件\n');
  if (files.length === 0) {
    lines.push('当前无本地文件。使用 `fetch_design_data` 传入 `fileKey` 从 Octo 下载。');
    return lines.join('\n');
  }
  lines.push(`共 ${files.length} 个文件：\n`);
  for (const f of files) {
    const filePath = join(octoDir, `${f}.json`);
    try {
      const stat = statSync(filePath);
      lines.push(`- \`${f}\` (${formatBytes(stat.size)})`);
    } catch {
      lines.push(`- \`${f}\``);
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
    '从 Octo 平台下载设计稿 JSON 数据到本地 .octo/ 目录，供 design_to_code 工具使用。\n\n' +
    '使用流程：\n' +
    '1. 调用本工具下载设计稿：`fetch_design_data({ fileKey: "xxx" })`\n' +
    '2. 调用 `design_to_code({ file: "xxx" })` 转换为代码\n\n' +
    '不传 fileKey 时列出本地已有文件。\n\n' +
    '⚠️ 需要配置环境变量：\n' +
    '- OCTO_API_BASE：Octo API 地址\n' +
    '- OCTO_TOKEN：Octo 认证 Token',
  inputSchema: {
    type: 'object',
    properties: {
      fileKey: {
        type: 'string',
        description:
          'Octo 设计稿 ID。不传时列出本地 .octo/ 已有文件。',
      },
      nodeId: {
        type: 'string',
        description:
          '指定节点 ID（如 "33:943"），只下载该节点子树。不传则下载整个设计稿。',
      },
      saveName: {
        type: 'string',
        description:
          '保存的文件名（不含 .json 后缀）。默认使用 fileKey 值。只允许字母、数字、连字符、下划线。',
      },
      timeout: {
        type: 'number',
        description: `请求超时时间（毫秒），默认 ${FETCH_DESIGN_TIMEOUT}ms。设计稿一般不超过 100KB，正常几秒内完成。`,
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
  const fileKey = typeof args?.fileKey === 'string' ? args.fileKey.trim() : undefined;
  const nodeId = typeof args?.nodeId === 'string' ? args.nodeId.trim() : undefined;
  const rawSaveName = typeof args?.saveName === 'string' ? args.saveName.trim() : undefined;
  const timeout = typeof args?.timeout === 'number' && args.timeout > 0
    ? args.timeout
    : FETCH_DESIGN_TIMEOUT;
  const overwrite = args?.overwrite !== false;

  const octoDir = getOctoDir();

  // 不传 fileKey：列出本地文件
  if (!fileKey) {
    const files = listLocalFiles(octoDir);
    return {
      content: [{ type: 'text', text: formatLocalFileList(octoDir, files) }],
    };
  }

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
          `  ${ENV_OCTO_TOKEN}=your-token`,
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

  // 路径安全校验
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
