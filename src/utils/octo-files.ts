/**
 * .octo/ 目录文件列表工具
 *
 * 供 design_to_code 和 fetch_design_data 共用的文件枚举逻辑。
 * 只返回满足安全文件名规则的 .json / .vue 文件。
 */

import { existsSync, readdirSync } from 'fs';
import { basename } from 'path';

const SAFE_FILENAME_RE = /^[\w-]+$/;

export interface OctoFileInfo {
  name: string;
  ext: '.json' | '.vue';
}

/**
 * 列出 octoDir 下所有合法的 .json / .vue 文件。
 * 目录不存在时返回空数组。
 */
export function listOctoFiles(octoDir: string): OctoFileInfo[] {
  if (!existsSync(octoDir)) return [];
  const entries = readdirSync(octoDir, { withFileTypes: true });
  const results: OctoFileInfo[] = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (e.name.endsWith('.json')) {
      const name = basename(e.name, '.json');
      if (SAFE_FILENAME_RE.test(name)) results.push({ name, ext: '.json' });
    } else if (e.name.endsWith('.vue')) {
      const name = basename(e.name, '.vue');
      if (SAFE_FILENAME_RE.test(name)) results.push({ name, ext: '.vue' });
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}
