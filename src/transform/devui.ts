/**
 * devUI 模式：设计稿 JSON → Vue SFC 转换
 *
 * core.js 负责 Vue 代码生成（含组件库组件），本模块负责：
 * 1. 调用 core.js 获取 LayoutNode 树
 * 2. 渲染为 Vue template + CSS（临时复用 renderLayoutPageWithCss，后续替换为 core.js Vue API）
 * 3. 生成组件 import 语句
 * 4. 拼装为完整的 Vue SFC
 *
 * 与 HTML 模式隔离，不影响 dsl/html 的现有逻辑。
 */

import { processDesign, renderLayoutPageWithCss } from '../octo/core.js';
import type { LayoutNode } from '../octo/core.js';
import {
  getComponentList,
  readComponentDoc,
  parseFrontmatter,
  type ComponentIndexEntry,
} from '../utils/doc-reader.js';
import { PACKAGE_NAME, DEFAULT_IMPORT_STYLE } from '../config.js';

// ======================== 类型 ========================

export interface DevUITransformResult {
  mode: 'devUI';
  content: string;
  vue: string;
  recommendedComponents: string[];
}

// ======================== 主函数 ========================

export function transformDevUI(json: unknown): DevUITransformResult {
  const _log = console.log;
  const _warn = console.warn;
  try {
    console.log = () => {};
    console.warn = () => {};

    let tree: LayoutNode | null = null;
    try {
      const result = processDesign(json);
      tree = result?.tree ?? null;
    } catch (err) {
      _warn(
        '[devUI] processDesign failed, falling back to raw JSON:',
        err instanceof Error ? err.message : err,
      );
    }

    if (!tree) {
      return fallbackDevUI(json);
    }

    const recommendedComponents = extractRecommendedComponents(tree);
    const imports = generateComponentImports(recommendedComponents);

    const pageResult = renderLayoutPageWithCss(tree, {
      classMode: 'tailwind',
      semanticTags: true,
      enableDedup: true,
      includeNodeId: false,
      includeNodeName: true,
    });

    const template = htmlBodyToVueTemplate(pageResult.html);
    const css = cleanCss(pageResult.fullCss);
    const vue = formatVueSFC(template, css, imports);

    return {
      mode: 'devUI',
      content: vue,
      vue,
      recommendedComponents,
    };
  } finally {
    console.log = _log;
    console.warn = _warn;
  }
}

// ======================== Vue SFC 拼装 ========================

function formatVueSFC(template: string, css: string, imports: string[]): string {
  const lines: string[] = [];

  lines.push('<template>');
  lines.push(template);
  lines.push('</template>');
  lines.push('');
  lines.push('<script setup lang="ts">');
  if (imports.length > 0) {
    for (const imp of imports) {
      lines.push(imp);
    }
  }
  lines.push('</script>');
  lines.push('');
  lines.push('<style scoped>');
  lines.push(css);
  lines.push('</style>');

  return lines.join('\n');
}

// ======================== HTML → Vue template ========================

/**
 * 从完整 HTML 页面中提取 body 内容作为 Vue template。
 * 与 htmlBodyToJsx 的区别：不做 class→className 转换（Vue 使用标准 class）。
 */
function htmlBodyToVueTemplate(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return formatHtml(html);

  let body = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .trim();

  const containerMatch = body.match(
    /^<div\s+id="layout-container"\s+class="([^"]*)">([\s\S]*)<\/div>$/,
  );
  if (containerMatch) {
    const rootClasses = containerMatch[1];
    body = `<div class="${rootClasses}">${containerMatch[2]}</div>`;
  }

  return formatHtml(body);
}

/**
 * 将压缩的 HTML 格式化为带缩进的多行格式（纯正则，不依赖外部库）。
 */
function formatHtml(html: string): string {
  const tokens = html.match(/<[^>]+>|[^<]+/g);
  if (!tokens) return html;

  const lines: string[] = [];
  let depth = 1;
  const INDENT = '  ';
  const SELF_CLOSING = /\/\s*>$/;
  const CLOSING_TAG = /^<\//;
  const VOID_ELEMENTS =
    /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;

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

function cleanCss(fullCss: string): string {
  return fullCss.replace(/body\s*\{[^}]*\}\n?/g, '').trim();
}

// ======================== 组件 import 生成 ========================

/**
 * 根据推荐组件列表，从各组件文档 frontmatter.import 读取 import 语句并合并。
 * 如果文档没有 import 字段，则按 DEFAULT_IMPORT_STYLE 生成。
 */
export function generateComponentImports(componentNames: string[]): string[] {
  if (componentNames.length === 0) return [];

  const namedImportsByModule = new Map<string, Set<string>>();
  const otherImports: string[] = [];
  const seenOther = new Set<string>();

  for (const name of componentNames) {
    const raw = getImportForComponent(name);
    const normalized = raw.endsWith(';') ? raw : `${raw};`;

    const namedMatch = normalized.match(
      /^import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]\s*;?$/,
    );
    if (namedMatch) {
      const members = namedMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const moduleName = namedMatch[2];
      if (!namedImportsByModule.has(moduleName)) {
        namedImportsByModule.set(moduleName, new Set());
      }
      const memberSet = namedImportsByModule.get(moduleName)!;
      for (const m of members) memberSet.add(m);
      continue;
    }

    if (!seenOther.has(normalized)) {
      seenOther.add(normalized);
      otherImports.push(normalized);
    }
  }

  const merged: string[] = [];
  for (const [moduleName, memberSet] of namedImportsByModule.entries()) {
    const members = Array.from(memberSet).sort().join(', ');
    merged.push(`import { ${members} } from '${moduleName}';`);
  }

  return [...merged, ...otherImports];
}

function getImportForComponent(name: string): string {
  try {
    const doc = readComponentDoc(name);
    if (doc) {
      const { frontmatter } = parseFrontmatter(doc);
      if (frontmatter?.import) {
        return frontmatter.import.trim();
      }
    }
  } catch {
    // fallback below
  }

  return DEFAULT_IMPORT_STYLE === 'named'
    ? `import { ${name} } from '${PACKAGE_NAME}'`
    : `import ${name} from '${PACKAGE_NAME}/${name}'`;
}

// ======================== 组件识别 ========================

function extractRecommendedComponents(tree: LayoutNode): string[] {
  let knownComponents: ComponentIndexEntry[];
  try {
    knownComponents = getComponentList();
  } catch {
    return [];
  }
  if (knownComponents.length === 0) return [];

  const nodeTokens = new Set<string>();
  walkTree(tree, (node: LayoutNode) => {
    if (node.type !== 'INSTANCE' && node.type !== 'COMPONENT') return;
    const name = node.name || '';
    nodeTokens.add(name.toLowerCase());
    for (const part of name.split(/[\/=,\s·]+/)) {
      const trimmed = part.trim();
      if (trimmed.length > 1) nodeTokens.add(trimmed.toLowerCase());
    }
  });

  if (nodeTokens.size === 0) return [];

  const matched = new Set<string>();
  for (const comp of knownComponents) {
    const nameLower = comp.name.toLowerCase();
    if (nodeTokens.has(nameLower)) { matched.add(comp.name); continue; }
    if (comp.aliases?.some(a => nodeTokens.has(a.toLowerCase()))) { matched.add(comp.name); continue; }
    if (comp.keywords?.some(k => nodeTokens.has(k.toLowerCase()))) { matched.add(comp.name); continue; }
  }

  return Array.from(matched);
}

function walkTree(node: LayoutNode, cb: (n: LayoutNode) => void): void {
  cb(node);
  if (node.children) {
    for (const child of node.children) walkTree(child, cb);
  }
}

// ======================== 降级 ========================

function fallbackDevUI(json: unknown): DevUITransformResult {
  const raw = JSON.stringify(json, null, 2);
  const vue = [
    '<template>',
    '  <div data-design-root>',
    '    <!-- design data (raw) -->',
    '  </div>',
    '</template>',
    '',
    '<script setup lang="ts">',
    '</script>',
    '',
    '<style scoped>',
    '</style>',
  ].join('\n');

  return {
    mode: 'devUI',
    content: vue,
    vue,
    recommendedComponents: [],
  };
}
