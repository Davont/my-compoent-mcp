/**
 * Octo 分享口令 → 设计稿 ZIP 下载 & 解压
 *
 * 从 Octo 平台的「传送口令」API 下载预生成的设计稿 ZIP 包，
 * 解压后返回 Vue 文件内容，供 fetch_design_data 保存到 .octo/ 目录。
 *
 * 原始逻辑来自 getDSL.mjs，此处用 TypeScript 重写并修复：
 * - 类型安全
 * - 解压到 os.tmpdir()（不污染源码目录）
 * - 统一抛 Error（不返回 undefined）
 * - 移除未使用的 node-fetch 依赖
 */

import * as https from 'node:https';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { promises as fsp } from 'node:fs';
import AdmZip from 'adm-zip';

const TRANSFER_ORIGIN = 'https://xxxx.com';
const TRANSFER_API_PATH = '/xxx/getTransferFile';

const SAFE_NAME_RE = /^[\w.-]+$/;
const DEFAULT_TIMEOUT = 30_000;

// ======================== Types ========================

interface TransferApiResponse {
  info?: string;
  baseUrl?: string;
  fileList?: Array<{ path?: string; name?: string }>;
}

export interface TransferFile {
  name: string;
  content: string;
}

export interface TransferDownloadResult {
  files: TransferFile[];
  zipName: string;
}

export interface TransferOptions {
  timeout?: number;
}

// ======================== Public API ========================

/**
 * 从分享口令字符串中提取设计稿 ID。
 * 口令格式：`##53085E4C##`，提取中间的 ID 部分。
 */
export function decodeSharePassword(str: string): string | undefined {
  const parts = str.split('##');
  return parts.length >= 2 && parts[1] ? parts[1] : undefined;
}

/**
 * 通过设计稿 code 下载 ZIP 包、解压、读取 index-px.vue 内容。
 * @returns Vue 文件内容 + 原始文件名
 * @throws 网络错误、解压错误、文件缺失
 */
export async function downloadTransferZip(
  code: string,
  options?: TransferOptions,
): Promise<TransferDownloadResult> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const url = `${TRANSFER_ORIGIN}${TRANSFER_API_PATH}?code=${encodeURIComponent(code)}`;

  const apiData = await httpsGetJson<TransferApiResponse>(url, timeout);

  const { info, baseUrl, fileList } = apiData;
  const parsedInfo = info ? safeJsonParse<{ action?: string }>(info) : undefined;
  const action = parsedInfo?.action;

  if (!baseUrl || action !== 'developerPreview_exportData') {
    throw new Error(
      `分享口令无效或非开发者预览导出（action=${action ?? 'undefined'}）`,
    );
  }

  const firstFile = fileList?.[0];
  if (!firstFile?.path || !firstFile?.name) {
    throw new Error('API 返回的 fileList 为空或缺少 path/name 字段');
  }

  const safeName = firstFile.name.replace(/[^\w.-]/g, '_');
  if (!SAFE_NAME_RE.test(safeName)) {
    throw new Error(`远端文件名清洗后仍不合法: "${firstFile.name}"`);
  }

  const fileUrl = `${baseUrl}${code}/${firstFile.path}`;
  const zipBuffer = await httpsGetBuffer(fileUrl, timeout);

  const workDir = join(tmpdir(), `octo-transfer-${code}-${Date.now()}`);
  await fsp.mkdir(workDir, { recursive: true });

  const zipPath = join(workDir, `${safeName}.zip`);
  const extractDir = join(workDir, safeName);

  await fsp.writeFile(zipPath, zipBuffer);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractDir, true);

  const files = await readExtractedFiles(extractDir);
  if (files.length === 0) {
    throw new Error(`解压成功但目录为空（解压目录: ${extractDir}）`);
  }

  cleanupAsync(workDir);

  return { files, zipName: firstFile.name };
}

// ======================== Internal helpers ========================

function httpsGetJson<T>(url: string, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const req = https
      .get(url, { rejectUnauthorized: false }, (res) => {
        let data = '';
        res.on('data', (chunk: string) => (data += chunk));
        res.on('end', () => {
          try {
            resolve(JSON.parse(data) as T);
          } catch {
            reject(new Error(`API 响应不是有效 JSON: ${data.slice(0, 200)}`));
          }
        });
      })
      .on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error(`请求超时（${timeout}ms）`));
    });
  });
}

function httpsGetBuffer(url: string, timeout: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const req = https
      .get(url, { rejectUnauthorized: false }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
    req.setTimeout(timeout, () => {
      req.destroy(new Error(`请求超时（${timeout}ms）`));
    });
  });
}

function safeJsonParse<T>(str: string): T | undefined {
  try {
    return JSON.parse(str) as T;
  } catch {
    return undefined;
  }
}

async function readExtractedFiles(dir: string, base = ''): Promise<TransferFile[]> {
  const entries = await fsp.readdir(dir, { withFileTypes: true });
  const results: TransferFile[] = [];
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relName = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...await readExtractedFiles(fullPath, relName));
    } else if (entry.isFile()) {
      const content = await fsp.readFile(fullPath, 'utf-8');
      results.push({ name: entry.name, content });
    }
  }
  return results;
}

/** 后台删除临时目录，不阻塞返回 */
function cleanupAsync(dir: string): void {
  fsp.rm(dir, { recursive: true, force: true }).catch(() => {});
}
