/**
 * 设计稿 JSON → 精简 DSL / HTML 转换
 *
 * 通过 octo/core.js 布局引擎将 Figma 导出 JSON 转换为带 flex 布局 + CSS 样式的
 * LayoutNode 树，再根据 outputMode 输出精简 DSL（token 友好）或语义化 HTML。
 *
 * DSL 模式使用 core.js 内置的 compressDSL 做字段压缩（简化 ID、缩写 key、颜色转 hex、
 * 去单位、省略默认值），直接产出 AI 友好的精简 JSON。
 *
 * 接口约定：
 *   export function transform(json: unknown, mode: TransformMode): TransformResult
 */

import { processDesign, compressDSL, toJsonString } from '../octo/core.js';
import type { LayoutNode, CompressOptions } from '../octo/core.js';
import { getComponentList, type ComponentIndexEntry } from '../utils/doc-reader.js';

// ======================== 类型 ========================

export type TransformMode = 'dsl' | 'html';

export interface TransformResult {
  mode: TransformMode;
  content: string;
  /** 设计稿中识别出的 my-design 组件名列表，如 ["Button", "Input", "Modal"] */
  recommendedComponents?: string[];
}

// ======================== 测试钩子 ========================

let _testOverride: TransformResult | null = null;
export function _setTransformOverride(result: TransformResult | null): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('_setTransformOverride is only available in test environments');
  }
  _testOverride = result;
}

// ======================== 压缩配置 ========================

const DSL_COMPRESS_OPTIONS: CompressOptions = {
  simplifyId: true,
  removeCoordinates: true,
  keepAllName: true,
  omitDefaults: true,
  convertColors: true,
  removeUnits: true,
};

// ======================== 主函数 ========================

export function transform(json: unknown, mode: TransformMode): TransformResult {
  if (_testOverride !== null) return _testOverride;

  let tree: LayoutNode | null = null;
  try {
    const result = processDesign(json);
    tree = result?.tree ?? null;
  } catch (err) {
    console.warn('[design_to_code] processDesign failed, falling back to raw JSON:', err instanceof Error ? err.message : err);
  }

  if (!tree) {
    return fallbackTransform(json, mode);
  }

  const recommendedComponents = extractRecommendedComponents(tree);

  if (mode === 'html') {
    return {
      mode: 'html',
      content: treeToHtml(tree),
      recommendedComponents,
    };
  }

  const compressed = compressDSL(tree, DSL_COMPRESS_OPTIONS);
  return {
    mode: 'dsl',
    content: toJsonString(compressed),
    recommendedComponents,
  };
}

// ======================== 降级（引擎失败时） ========================

function fallbackTransform(json: unknown, mode: TransformMode): TransformResult {
  if (mode === 'html') {
    return {
      mode: 'html',
      content: `<!-- design data (raw) -->\n<div data-design-root>\n${JSON.stringify(json, null, 2)}\n</div>`,
      recommendedComponents: [],
    };
  }
  return {
    mode: 'dsl',
    content: JSON.stringify(json, null, 2),
    recommendedComponents: [],
  };
}

// ======================== HTML 转换 ========================

const LEAF_TYPES = new Set([
  'TEXT', 'IMAGE', 'VECTOR', 'RECTANGLE', 'ELLIPSE',
  'LINE', 'POLYGON', 'STAR', 'ICON',
]);

function treeToHtml(tree: LayoutNode): string {
  const lines: string[] = [];
  renderNode(tree, lines, 0);
  return lines.join('\n');
}

function renderNode(node: LayoutNode, lines: string[], depth: number): void {
  const indent = '  '.repeat(depth);
  const tag = getHtmlTag(node);
  const attrs: string[] = [];

  if (node.name) attrs.push(`data-name="${escapeAttr(node.name)}"`);

  const style = nodeToInlineStyle(node);
  if (style) attrs.push(`style="${escapeStyleAttr(style)}"`);


  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (node.type === 'TEXT') {
    const text = node.characters ?? node.name ?? '';
    lines.push(`${indent}<${tag}${attrStr}>${escapeHtml(text)}</${tag}>`);
    return;
  }

  if (node.imageRole || node.type === 'IMAGE') {
    lines.push(`${indent}<img${attrStr} />`);
    return;
  }

  if (node.type === 'ICON') {
    lines.push(`${indent}<i${attrStr}></i>`);
    return;
  }

  if (LEAF_TYPES.has(node.type) || !node.children?.length) {
    lines.push(`${indent}<${tag}${attrStr}></${tag}>`);
    return;
  }

  lines.push(`${indent}<${tag}${attrStr}>`);
  for (const child of node.children!) {
    renderNode(child, lines, depth + 1);
  }
  lines.push(`${indent}</${tag}>`);
}

function getHtmlTag(node: LayoutNode): string {
  if (node.type === 'TEXT') return 'span';
  if (node.type === 'IMAGE' || node.imageRole) return 'img';
  if (node.type === 'ICON') return 'i';
  return 'div';
}

function nodeToInlineStyle(node: LayoutNode): string {
  const parts: string[] = [];

  if (node.width != null) parts.push(`width:${node.width}px`);
  if (node.height != null) parts.push(`height:${node.height}px`);


  const l = node.layout;
  if (l) {
    if (l.display === 'flex' || l.flexDirection) {
      parts.push('display:flex');
      if (l.flexDirection) parts.push(`flex-direction:${l.flexDirection}`);
      if (l.alignItems) parts.push(`align-items:${l.alignItems}`);
      if (l.justifyContent) parts.push(`justify-content:${l.justifyContent}`);
      if (l.gap != null) parts.push(`gap:${l.gap}px`);
    }
    if (l.paddingTop != null || l.paddingRight != null || l.paddingBottom != null || l.paddingLeft != null) {
      parts.push(`padding:${l.paddingTop ?? 0}px ${l.paddingRight ?? 0}px ${l.paddingBottom ?? 0}px ${l.paddingLeft ?? 0}px`);
    }
  }

  const s = node.styles;
  if (s) {
    if (s.background) parts.push(`background:${s.background}`);
    if (s.border) parts.push(`border:${s.border}`);
    if (s.borderRadius) parts.push(`border-radius:${s.borderRadius}`);
    if (s.boxShadow) parts.push(`box-shadow:${s.boxShadow}`);
    if (s.opacity != null && s.opacity !== 1) parts.push(`opacity:${s.opacity}`);
    if (s.color) parts.push(`color:${s.color}`);
    if (s.fontFamily) parts.push(`font-family:${s.fontFamily}`);
    if (s.fontSize) parts.push(`font-size:${s.fontSize}`);
    if (s.fontWeight != null) parts.push(`font-weight:${s.fontWeight}`);

    if (s.lineHeight) parts.push(`line-height:${s.lineHeight}`);
    if (s.letterSpacing) parts.push(`letter-spacing:${s.letterSpacing}`);
    if (s.textAlign) parts.push(`text-align:${s.textAlign}`);
    if (s.textDecoration && s.textDecoration !== 'none') parts.push(`text-decoration:${s.textDecoration}`);
  }

  return parts.join(';');
}

// ======================== 组件识别 ========================

/**
 * 从 LayoutNode 树中识别可能对应 my-design 组件的节点。
 *
 * 策略：
 * 1. 收集所有 INSTANCE / COMPONENT 节点的 name 及其分词
 * 2. 与 doc/index.json 中已有组件的 name、aliases、keywords 做匹配
 */
function extractRecommendedComponents(tree: LayoutNode): string[] {
  let knownComponents: ComponentIndexEntry[];
  try {
    knownComponents = getComponentList();
  } catch (err) {
    console.warn('[design_to_code] getComponentList failed, skipping component recognition:', err instanceof Error ? err.message : err);
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

// ======================== 工具函数 ========================

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** style 属性专用转义：不转 & 以免破坏 CSS 值（如 url(data:...)），只转 " 和尖括号 */
function escapeStyleAttr(style: string): string {
  return style.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
