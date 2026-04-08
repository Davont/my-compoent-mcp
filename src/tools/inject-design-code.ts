/**
 * inject_design_code 工具
 *
 * 下载鸿蒙设计稿 ZIP 包，将代码和图片资源注入到鸿蒙空项目中。
 *
 * ZIP 包结构（由设计工具生成）：
 *   index.ets          → entry/src/main/ets/pages/Index.ets（覆盖）
 *   assets/*.png|jpg…  → entry/src/main/resources/base/media/（追加）
 *
 * 安全策略：先下载、先验证（是否鸿蒙 ZIP、是否空项目），通过后才写入。
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { resolve, basename } from 'node:path';
import { promises as fsp } from 'node:fs';
import AdmZip from 'adm-zip';
import { httpsGetBuffer, isPathInside, pathExists } from '../utils/octo-transfer.js';

/** 鸿蒙项目中的目标目录 */
const PAGES_REL = 'entry/src/main/ets/pages';
const MEDIA_REL = 'entry/src/main/resources/base/media';

/** 允许的图片扩展名 */
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.bmp']);

const DEFAULT_TIMEOUT = 30_000;

// ============ 工具定义 ============

export const injectDesignCodeTool: Tool = {
  name: 'inject_design_code',
  description:
    '将鸿蒙设计稿 ZIP 包注入到鸿蒙空项目中。\n\n' +
    'ZIP 包由设计工具生成，包含 index.ets（页面代码）和 assets/（图片资源）。\n' +
    '工具自动将 index.ets 覆盖到 pages/Index.ets，将 assets 中的图片复制到 media/ 目录。\n\n' +
    '仅对空项目生效（pages/ 下只有一个 Index.ets），存量项目会被拒绝。\n' +
    '如果 ZIP 不包含 .ets 文件，说明不是鸿蒙设计包，工具会跳过。',
  inputSchema: {
    type: 'object',
    properties: {
      zipUrl: {
        type: 'string',
        description: 'ZIP 包的下载地址（HTTPS）',
      },
      projectRoot: {
        type: 'string',
        description: '鸿蒙项目根目录的绝对路径',
      },
    },
    required: ['zipUrl', 'projectRoot'],
  },
};

// ============ 工具处理器 ============

export async function handleInjectDesignCode(
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const zipUrl = typeof args?.zipUrl === 'string' ? args.zipUrl.trim() : '';
  const projectRoot = typeof args?.projectRoot === 'string' ? args.projectRoot.trim() : '';

  if (!zipUrl) return fail('缺少必填参数 zipUrl');
  if (!projectRoot) return fail('缺少必填参数 projectRoot');

  // ===== 1. 下载 ZIP =====
  let zip: AdmZip;
  try {
    const buf = await httpsGetBuffer(zipUrl, DEFAULT_TIMEOUT);
    zip = new AdmZip(buf);
  } catch (e) {
    return fail(`ZIP 下载或解析失败: ${errMsg(e)}`);
  }

  const entries = zip.getEntries();

  // ===== 2. 检测是否鸿蒙 ZIP（根目录或一层包裹下有 .ets 文件） =====
  const { indexEntry, basePrefix, assetEntries } = parseHarmonyZip(entries);

  if (!indexEntry) {
    return fail('ZIP 包中未找到 index.ets，不是鸿蒙设计包');
  }

  // ===== 3. 校验 assets 文件类型 =====
  for (const entry of assetEntries) {
    const ext = extOf(entry.entryName);
    if (!IMAGE_EXTS.has(ext)) {
      return fail(`assets 中包含非图片文件: ${entry.entryName}（只允许 ${[...IMAGE_EXTS].join(', ')}）`);
    }
  }

  // ===== 4. 校验目标项目 =====
  const pagesDir = resolve(projectRoot, PAGES_REL);
  if (!(await pathExists(pagesDir))) {
    return fail(`不是有效的鸿蒙项目，找不到 ${PAGES_REL} 目录`);
  }

  // ===== 5. 空项目检测 =====
  const existing = (await fsp.readdir(pagesDir)).filter(f => f.endsWith('.ets'));
  const isNew = existing.length <= 1 && (existing.length === 0 || existing[0] === 'Index.ets');

  if (!isNew) {
    return ok({
      success: false,
      isNewProject: false,
      written: [],
      skipped: [],
      message: '检测到存量项目（pages 目录下有多个文件），已中止操作，未做任何修改',
    });
  }

  // ===== 6. 写入文件 =====
  const resolvedRoot = resolve(projectRoot);
  const written: string[] = [];

  // 6a. index.ets → pages/Index.ets
  const indexDest = resolve(projectRoot, PAGES_REL, 'Index.ets');
  if (!isPathInside(indexDest, resolvedRoot)) {
    return fail('路径安全检查失败: Index.ets');
  }
  await fsp.writeFile(indexDest, indexEntry.getData());
  written.push(`${PAGES_REL}/Index.ets`);

  // 6b. assets/* → media/
  if (assetEntries.length > 0) {
    const mediaDir = resolve(projectRoot, MEDIA_REL);
    await fsp.mkdir(mediaDir, { recursive: true });

    for (const entry of assetEntries) {
      const fileName = basename(normalizePath(entry.entryName));
      const dest = resolve(mediaDir, fileName);
      if (!isPathInside(dest, resolvedRoot)) continue;

      const buf = entry.getData();
      if (buf && buf.length > 0) {
        await fsp.writeFile(dest, buf);
        written.push(`${MEDIA_REL}/${fileName}`);
      }
    }
  }

  // ===== 7. 返回结果 =====
  return ok({
    success: true,
    isNewProject: true,
    written,
    skipped: [],
    message: `代码注入完成，共写入 ${written.length} 个文件`,
  });
}

// ============ 内部工具函数 ============

interface HarmonyZipInfo {
  indexEntry: AdmZip.IZipEntry | null;
  basePrefix: string;
  assetEntries: AdmZip.IZipEntry[];
}

/**
 * 解析 ZIP 内容，识别鸿蒙设计包结构。
 * 兼容两种情况：根目录平铺 / 一层包裹文件夹。
 */
function parseHarmonyZip(entries: AdmZip.IZipEntry[]): HarmonyZipInfo {
  const nil: HarmonyZipInfo = { indexEntry: null, basePrefix: '', assetEntries: [] };

  // 在根目录或一层包裹下找 index.ets
  let indexEntry: AdmZip.IZipEntry | null = null;
  let basePrefix = '';

  for (const e of entries) {
    if (e.isDirectory) continue;
    const p = normalizePath(e.entryName);
    const parts = p.split('/').filter(Boolean);
    const fileName = parts[parts.length - 1];

    if (fileName === 'index.ets' && parts.length <= 2) {
      indexEntry = e;
      basePrefix = parts.length > 1 ? parts[0] + '/' : '';
      break;
    }
  }

  if (!indexEntry) return nil;

  // 收集 assets/ 下的文件
  const assetsPrefix = basePrefix + 'assets/';
  const assetEntries = entries.filter(e => {
    if (e.isDirectory) return false;
    return normalizePath(e.entryName).startsWith(assetsPrefix);
  });

  return { indexEntry, basePrefix, assetEntries };
}

/** 统一路径分隔符 */
function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/** 提取小写扩展名 */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

/** 错误信息提取 */
function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** 构造失败响应 */
function fail(msg: string): CallToolResult {
  return { content: [{ type: 'text', text: msg }], isError: true };
}

/** 构造成功响应（JSON 格式） */
function ok(data: Record<string, unknown>): CallToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}
