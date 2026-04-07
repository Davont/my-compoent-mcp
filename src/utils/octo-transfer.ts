/**
 * Octo 分享口令 → 设计稿 ZIP 下载 & 解压
 *
 * 从 Octo 平台的「传送口令」API 下载预生成的设计稿 ZIP 包，
 * 可按需读取 index-px.vue，或直接解压到目标目录。
 *
 * 原始逻辑来自 getDSL.mjs，此处用 TypeScript 重写并修复：
 * - 类型安全
 * - 支持直接解压到指定目录
 * - 统一抛 Error（不返回 undefined）
 * - 移除未使用的 node-fetch 依赖
 */

import * as https from 'node:https';
import { basename, dirname, resolve, sep } from 'node:path';
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

export interface TransferDownloadResult {
  vueContent: string;
  fileName: string;
}

export interface TransferOptions {
  timeout?: number;
}

export interface TransferExtractOptions extends TransferOptions {
  overwrite?: boolean;
}

export interface TransferExtractResult {
  zipName: string;
  savedFiles: string[];
  skippedFiles: string[];
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
  const { zip, zipName } = await fetchTransferZipArchive(code, timeout);

  const vueEntry = zip
    .getEntries()
    .find((entry) => !entry.isDirectory && basename(normalizeZipEntryName(entry.entryName)) === 'index-px.vue');

  if (!vueEntry) {
    throw new Error('解压成功但未找到 index-px.vue');
  }

  return { vueContent: vueEntry.getData().toString('utf-8'), fileName: zipName };
}

/**
 * 下载分享口令 ZIP 并直接解压到目标目录。
 * 文件按压缩包内相对路径写入，保持目录结构。
 */
export async function extractTransferZipToDir(
  code: string,
  targetDir: string,
  options?: TransferExtractOptions,
): Promise<TransferExtractResult> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT;
  const overwrite = options?.overwrite !== false;

  const { zip, zipName } = await fetchTransferZipArchive(code, timeout);

  await fsp.mkdir(targetDir, { recursive: true });

  const resolvedTargetDir = resolve(targetDir);
  const savedFiles: string[] = [];
  const skippedFiles: string[] = [];

  for (const entry of zip.getEntries()) {
    const relPath = normalizeZipEntryName(entry.entryName);
    if (!relPath) continue;

    const targetPath = resolve(targetDir, relPath);
    if (!isPathInside(targetPath, resolvedTargetDir)) {
      throw new Error(`ZIP 路径越界: ${entry.entryName}`);
    }

    if (entry.isDirectory) {
      await fsp.mkdir(targetPath, { recursive: true });
      continue;
    }

    if (!overwrite && await pathExists(targetPath)) {
      skippedFiles.push(relPath);
      continue;
    }

    await fsp.mkdir(dirname(targetPath), { recursive: true });
    await fsp.writeFile(targetPath, entry.getData());
    savedFiles.push(relPath);
  }

  if (savedFiles.length === 0 && skippedFiles.length === 0) {
    throw new Error('ZIP 解压后未发现任何可写入文件');
  }

  return { zipName, savedFiles, skippedFiles };
}

// ======================== Internal helpers ========================

function httpsGetJson<T>(url: string, timeout: number): Promise<T> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err: Error) => { if (!settled) { settled = true; reject(err); } };

    let req: ReturnType<typeof https.get>;
    try {
      req = https
        .get(url, { rejectUnauthorized: false }, (res) => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            req.destroy();
            clearTimeout(timer);
            fail(new Error(`HTTP ${res.statusCode ?? 'unknown'}: ${url}`));
            return;
          }
          let data = '';
          res.on('data', (chunk: string) => (data += chunk));
          res.on('end', () => {
            clearTimeout(timer);
            if (settled) return;
            settled = true;
            try {
              resolve(JSON.parse(data) as T);
            } catch {
              reject(new Error(`API 响应不是有效 JSON: ${data.slice(0, 200)}`));
            }
          });
        })
        .on('error', (err) => { clearTimeout(timer); fail(err); });
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const timer = setTimeout(() => {
      req.destroy();
      fail(new Error(`请求总超时（${timeout}ms）`));
    }, timeout);
  });
}

function httpsGetBuffer(url: string, timeout: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const fail = (err: Error) => { if (!settled) { settled = true; reject(err); } };

    let req: ReturnType<typeof https.get>;
    try {
      req = https
        .get(url, { rejectUnauthorized: false }, (res) => {
          if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
            req.destroy();
            clearTimeout(timer);
            fail(new Error(`HTTP ${res.statusCode ?? 'unknown'}: ${url}`));
            return;
          }
          const chunks: Buffer[] = [];
          res.on('data', (chunk: Buffer) => chunks.push(chunk));
          res.on('end', () => {
            clearTimeout(timer);
            if (settled) return;
            settled = true;
            resolve(Buffer.concat(chunks));
          });
        })
        .on('error', (err) => { clearTimeout(timer); fail(err); });
    } catch (err) {
      fail(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    const timer = setTimeout(() => {
      req.destroy();
      fail(new Error(`请求总超时（${timeout}ms）`));
    }, timeout);
  });
}

async function fetchTransferZipArchive(code: string, timeout: number): Promise<{ zip: AdmZip; zipName: string }> {
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
  return { zip: new AdmZip(zipBuffer), zipName: firstFile.name };
}

function safeJsonParse<T>(str: string): T | undefined {
  try {
    return JSON.parse(str) as T;
  } catch {
    return undefined;
  }
}

function normalizeZipEntryName(name: string): string {
  return name.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

function isPathInside(targetPath: string, parentPath: string): boolean {
  return targetPath === parentPath || targetPath.startsWith(parentPath + sep);
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fsp.access(targetPath);
    return true;
  } catch {
    return false;
  }
}
