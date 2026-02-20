/**
 * 组件源码读取工具
 *
 * 从本地 node_modules 中读取 @my-design/react 组件源码
 * 用于源码查看、文件列表获取等场景
 */

import { readFileSync, existsSync, readdirSync, realpathSync, openSync, readSync, closeSync } from 'fs';
import { join, resolve, sep, dirname } from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const DEFAULT_PACKAGE_NAME = '@my-design/react';
const ENV_PACKAGE_ROOT = 'MY_DESIGN_PACKAGE_ROOT';

const EXCLUDE_PATH_SEGMENTS = [
  '/node_modules/',
  '/dist/',
  '/lib/',
  '/es/',
  '/cjs/',
  '/__test__/',
  '/__tests__/',
  '/_story/',
  '/_stories/',
  '/.git/',
];

const EXCLUDE_TOP_LEVEL_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'lib',
  'es',
  'cjs',
]);

/**
 * 组件目录的候选父路径（相对于包根目录）
 * 按优先级排列，找到第一个匹配即停止
 */
const COMPONENT_DIR_CANDIDATES = [
  '',                // 顶层: {root}/Button/
  'components',      // {root}/components/Button/
  'src',             // {root}/src/Button/
  'src/components',  // {root}/src/components/Button/
];

const MAX_DEPTH = 10;
const BINARY_CHECK_BYTES = 8192;

const require = createRequire(import.meta.url);
const currentModuleDir = dirname(fileURLToPath(import.meta.url));

function findProjectRoot(startDir: string): string | null {
  let cursor = startDir;

  while (true) {
    if (existsSync(join(cursor, 'package.json'))) {
      return cursor;
    }

    const parent = dirname(cursor);
    if (parent === cursor) {
      return null;
    }

    cursor = parent;
  }
}

function resolveFromNode(packageName: string): string | null {
  const resolveBases = [process.cwd(), currentModuleDir];

  for (const base of resolveBases) {
    try {
      const packageJsonPath = require.resolve(`${packageName}/package.json`, {
        paths: [base],
      });
      return dirname(realpathSync(packageJsonPath));
    } catch {
      continue;
    }
  }

  return null;
}

function shouldExcludePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  for (const segment of EXCLUDE_PATH_SEGMENTS) {
    if (normalized.includes(segment)) {
      return true;
    }
  }
  return false;
}

// @my-design/react -> scoped; some-package -> unscoped
function extractPackageName(packageRoot: string): string {
  const parts = packageRoot.replace(/\\/g, '/').split('/');
  if (parts.length >= 2 && parts[parts.length - 2].startsWith('@')) {
    return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
  }
  return parts[parts.length - 1];
}

function listFilesRecursive(dir: string, depth: number): string[] {
  if (depth > MAX_DEPTH) {
    return [];
  }

  const results: string[] = [];
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!shouldExcludePath(fullPath + '/')) {
        results.push(...listFilesRecursive(fullPath, depth + 1));
      }
    } else if (entry.isFile()) {
      if (!shouldExcludePath(fullPath)) {
        results.push(fullPath);
      }
    }
  }

  return results;
}

/**
 * 解析组件库包的根目录路径
 *
 * 优先级：
 * 1. 环境变量 MY_DESIGN_PACKAGE_ROOT（如果设置且目录存在）
 * 2. process.cwd()/node_modules/{packageName}
 *
 * @param packageName - 包名，默认 @my-design/react
 * @returns 包的真实根目录路径（已解析 symlink）
 */
export function resolvePackageRoot(packageName: string = DEFAULT_PACKAGE_NAME): string {
  const envRoot = process.env[ENV_PACKAGE_ROOT];
  if (envRoot && existsSync(envRoot)) {
    return realpathSync(envRoot);
  }

  const nodeResolved = resolveFromNode(packageName);
  if (nodeResolved) {
    return nodeResolved;
  }

  const projectRoot = findProjectRoot(currentModuleDir);
  const fallbackCandidates = [
    join(process.cwd(), 'node_modules', packageName),
    ...(projectRoot
      ? [
          join(projectRoot, 'node_modules', packageName),
        ]
      : []),
  ];

  for (const candidate of fallbackCandidates) {
    if (existsSync(candidate)) {
      return realpathSync(candidate);
    }
  }

  const triedPaths = fallbackCandidates.join(', ');
  throw new Error(
    `Package "${packageName}" not found. Tried: ${triedPaths}. Set ${ENV_PACKAGE_ROOT} to override package root.`
  );
}

/**
 * 列出指定组件的所有源码文件
 *
 * 在 packageRoot 中查找与 componentName 匹配的顶层目录（大小写不敏感），
 * 递归列出该目录下所有文件，排除构建产物和测试目录。
 *
 * @param packageRoot - 包根目录的绝对路径
 * @param componentName - 组件名称（如 Button、DatePicker，大小写不敏感）
 * @returns 文件路径列表和包名
 */
export function listComponentFiles(
  packageRoot: string,
  componentName: string
): { files: string[]; packageName: string } {
  const packageName = extractPackageName(packageRoot);
  const normalizedName = componentName.toLowerCase();

  for (const candidate of COMPONENT_DIR_CANDIDATES) {
    const searchDir = candidate ? join(packageRoot, candidate) : packageRoot;

    let entries;
    try {
      entries = readdirSync(searchDir, { withFileTypes: true });
    } catch {
      continue;
    }

    let matchedDir: string | null = null;
    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.toLowerCase() === normalizedName) {
        matchedDir = entry.name;
        break;
      }
    }

    if (!matchedDir) continue;

    const componentDir = join(searchDir, matchedDir);
    const absoluteFiles = listFilesRecursive(componentDir, 1);

    const files = absoluteFiles.map(absPath => {
      const relativePath = absPath.slice(packageRoot.length + 1).replace(/\\/g, '/');
      return `${packageName}/${relativePath}`;
    });

    return { files, packageName };
  }

  return { files: [], packageName };
}

/**
 * 读取指定源码文件的内容
 *
 * 包含路径遍历保护和二进制文件检测。
 *
 * @param packageRoot - 包根目录的绝对路径
 * @param relativePath - 相对于包根目录的文件路径
 * @returns 文件的文本内容
 */
export function readSourceFile(packageRoot: string, relativePath: string): string {
  const realRoot = realpathSync(packageRoot);
  const absPath = resolve(realRoot, relativePath);

  // 路径遍历保护：确保解析后的路径在包根目录内
  if (!absPath.startsWith(realRoot + sep) && absPath !== realRoot) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }

  if (!existsSync(absPath)) {
    throw new Error(`File not found: ${relativePath}`);
  }

  // 二进制文件检测：读取前 8192 字节检查是否包含 null byte
  const fd = openSync(absPath, 'r');
  try {
    const buffer = Buffer.alloc(BINARY_CHECK_BYTES);
    const bytesRead = readSync(fd, buffer, 0, BINARY_CHECK_BYTES, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0x00) {
        throw new Error(`Binary file detected: ${relativePath}`);
      }
    }
  } finally {
    closeSync(fd);
  }

  return readFileSync(absPath, 'utf-8');
}

/**
 * 列出包根目录下的所有顶层目录
 *
 * 排除 node_modules、.git、dist、lib、es、cjs 等非源码目录。
 * 可用于组件未找到时提供建议列表。
 *
 * @param packageRoot - 包根目录的绝对路径
 * @returns 排序后的目录名数组
 */
export function listTopLevelDirectories(packageRoot: string): string[] {
  for (const candidate of COMPONENT_DIR_CANDIDATES) {
    const searchDir = candidate ? join(packageRoot, candidate) : packageRoot;

    let entries;
    try {
      entries = readdirSync(searchDir, { withFileTypes: true });
    } catch {
      continue;
    }

    const dirs: string[] = [];
    for (const entry of entries) {
      if (entry.isDirectory() && !EXCLUDE_TOP_LEVEL_DIRS.has(entry.name)) {
        dirs.push(entry.name);
      }
    }

    if (candidate === '' && dirs.length <= 3) continue;

    return dirs.sort();
  }

  let entries;
  try {
    entries = readdirSync(packageRoot, { withFileTypes: true });
  } catch {
    throw new Error(`包根目录不可读: ${packageRoot}`);
  }

  const dirs: string[] = [];
  for (const entry of entries) {
    if (entry.isDirectory() && !EXCLUDE_TOP_LEVEL_DIRS.has(entry.name)) {
      dirs.push(entry.name);
    }
  }
  return dirs.sort();
}
