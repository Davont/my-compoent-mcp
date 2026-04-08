/**
 * 鸿蒙设计稿注入工具函数
 *
 * 扫描已解压到 .octo/ 的文件列表，若发现 .ets 文件则判定为鸿蒙设计包，
 * 自动将 index.ets → pages/Index.ets，assets/* → media/。
 *
 * 仅在目标项目为鸿蒙空项目时执行注入，否则跳过或中止。
 */

import { resolve, basename } from 'node:path';
import { promises as fsp } from 'node:fs';
import { pathExists } from './octo-transfer.js';

/** 鸿蒙项目中的目标目录 */
const PAGES_REL = 'entry/src/main/ets/pages';
const MEDIA_REL = 'entry/src/main/resources/base/media';

/** 允许的图片扩展名 */
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.svg', '.webp', '.gif', '.bmp']);

export interface HarmonyInjectResult {
  success: boolean;
  isNewProject: boolean;
  written: string[];
  message: string;
}

/**
 * 尝试将 .octo/ 中已解压的鸿蒙文件注入到项目对应位置。
 *
 * @param octoDir    .octo/ 目录绝对路径（文件已解压在此）
 * @param projectRoot 项目根目录绝对路径
 * @param savedFiles  解压后的相对路径列表（来自 extractTransferZipToDir）
 * @returns 注入结果，若非鸿蒙 ZIP 返回 null
 */
export async function tryInjectHarmonyFiles(
  octoDir: string,
  projectRoot: string,
  savedFiles: string[],
): Promise<HarmonyInjectResult | null> {
  // 1. 是否包含 .ets 文件
  const etsFiles = savedFiles.filter(f => f.endsWith('.ets'));
  if (etsFiles.length === 0) return null;

  // 2. 找 index.ets（兼容根目录或一层包裹）
  const indexFile = etsFiles.find(f => {
    const parts = f.replace(/\\/g, '/').split('/').filter(Boolean);
    return parts[parts.length - 1] === 'index.ets' && parts.length <= 2;
  });
  if (!indexFile) return null;

  // 3. 目标项目是否为鸿蒙项目
  const pagesDir = resolve(projectRoot, PAGES_REL);
  if (!(await pathExists(pagesDir))) return null;

  // 4. 空项目检测
  const existing = (await fsp.readdir(pagesDir)).filter(f => f.endsWith('.ets'));
  const isNew = existing.length <= 1 && (existing.length === 0 || existing[0] === 'Index.ets');

  if (!isNew) {
    return {
      success: false,
      isNewProject: false,
      written: [],
      message: '检测到存量项目（pages 目录下有多个文件），已跳过鸿蒙注入',
    };
  }

  // 5. 注入文件
  const written: string[] = [];

  // 5a. index.ets → pages/Index.ets
  const srcIndex = resolve(octoDir, indexFile);
  const destIndex = resolve(pagesDir, 'Index.ets');
  await fsp.copyFile(srcIndex, destIndex);
  written.push(`${PAGES_REL}/Index.ets`);

  // 5b. assets/* → media/
  const basePrefix = indexFile.includes('/') ? indexFile.split('/')[0] + '/' : '';
  const assetsPrefix = basePrefix + 'assets/';
  const assetFiles = savedFiles.filter(f => {
    if (!f.replace(/\\/g, '/').startsWith(assetsPrefix)) return false;
    const ext = extOf(f);
    return IMAGE_EXTS.has(ext);
  });

  if (assetFiles.length > 0) {
    const mediaDir = resolve(projectRoot, MEDIA_REL);
    await fsp.mkdir(mediaDir, { recursive: true });

    for (const asset of assetFiles) {
      const fileName = basename(asset.replace(/\\/g, '/'));
      const src = resolve(octoDir, asset);
      const dest = resolve(mediaDir, fileName);
      await fsp.copyFile(src, dest);
      written.push(`${MEDIA_REL}/${fileName}`);
    }
  }

  return {
    success: true,
    isNewProject: true,
    written,
    message: `鸿蒙代码注入完成，共写入 ${written.length} 个文件`,
  };
}

/** 提取小写扩展名 */
function extOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}
