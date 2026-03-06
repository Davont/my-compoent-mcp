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

import { processDesign, compressDSL, toJsonString, renderLayoutPageWithCss } from '../octo/core.js';
import type { LayoutNode, CompressOptions } from '../octo/core.js';
import { getComponentList, type ComponentIndexEntry } from '../utils/doc-reader.js';

// ======================== 类型 ========================

export type TransformMode = 'dsl' | 'html';

export interface TransformResult {
  mode: TransformMode;
  content: string;
  /** 设计稿中识别出的 my-design 组件名列表，如 ["Button", "Input", "Modal"] */
  recommendedComponents?: string[];
  /** HTML 模式专用：独立 CSS（含 base styles + 组件样式） */
  css?: string;
  /** HTML 模式专用：JSX body（已做 class→className 转换，可直接放入 React 组件 return） */
  jsx?: string;
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
      _warn('[design_to_code] processDesign failed, falling back to raw JSON:', err instanceof Error ? err.message : err);
    }

    if (!tree) {
      return fallbackTransform(json, mode);
    }

    const recommendedComponents = extractRecommendedComponents(tree);

    if (mode === 'html') {
      const pageResult = renderLayoutPageWithCss(tree, {
        classMode: 'tailwind',
        semanticTags: true,
        enableDedup: true,
        includeNodeId: false,
        includeNodeName: true,
      });

      const css = cleanCssForReact(pageResult.fullCss);
      const jsx = htmlBodyToJsx(pageResult.html);

      return {
        mode: 'html',
        content: `/* --- CSS --- */\n${css}\n\n/* --- JSX --- */\n${jsx}`,
        css,
        jsx,
        recommendedComponents,
      };
    }

    const compressed = compressDSL(tree, DSL_COMPRESS_OPTIONS);
    return {
      mode: 'dsl',
      content: toJsonString(compressed),
      recommendedComponents,
    };
  } finally {
    console.log = _log;
    console.warn = _warn;
  }
}

// ======================== HTML → React 转换 ========================

/**
 * 从完整 HTML 页面中提取 body 内的 DOM，转换为 JSX 兼容格式。
 * - class= → className=
 * - 去掉 <div id="layout-container"> 外壳
 */
function htmlBodyToJsx(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return html.replace(/ class=/g, ' className=');

  let body = bodyMatch[1]
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .trim();

  const containerMatch = body.match(
    /^<div\s+id="layout-container"\s+class="([^"]*)">([\s\S]*)<\/div>$/
  );
  if (containerMatch) {
    const rootClasses = containerMatch[1];
    body = `<div className="${rootClasses}">${containerMatch[2]}</div>`;
  }

  return body.replace(/ class=/g, ' className=');
}

/**
 * 清理 CSS：去掉 body 规则（React 项目不需要 body margin/padding）
 */
function cleanCssForReact(fullCss: string): string {
  return fullCss.replace(/body\s*\{[^}]*\}\n?/g, '').trim();
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

