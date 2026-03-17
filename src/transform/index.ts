/**
 * 设计稿 JSON → 精简 DSL / HTML 转换
 *
 * 通过 octo/core.js 的 designToCode 统一入口将 Figma 导出 JSON 转换为
 * 精简 DSL（token 友好）或语义化 HTML + CSS。
 *
 * 接口约定：
 *   export function transform(json: unknown, mode: TransformMode): TransformResult
 */

import { designToCode } from '../octo/core.js';
import { extractRecommendedComponents } from '../utils/component-recognizer.js';

// ======================== 类型 ========================

export type TransformMode = 'dsl' | 'html';

export interface TransformResult {
  mode: TransformMode;
  content: string;
  /** 设计稿中识别出的 MCP 组件名列表，如 ["Button", "Input", "Modal"] */
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

// ======================== 主函数 ========================

export function transform(json: unknown, mode: TransformMode): TransformResult {
  if (_testOverride !== null) return _testOverride;

  const recommendedComponents = extractRecommendedComponents(json);

  const _log = console.log;
  const _warn = console.warn;
  try {
    console.log = () => {};
    console.warn = () => {};

    let result: { html?: string; css?: string; dsl?: string };
    try {
      result = designToCode(json, { mode });
    } catch (err) {
      _warn('[design_to_code] designToCode failed, falling back to raw JSON:', err instanceof Error ? err.message : err);
      return fallbackTransform(json, mode);
    }

    if (mode === 'html') {
      if (!result.html || !result.css) {
        return fallbackTransform(json, mode);
      }

      const css = cleanCssForReact(result.css);
      const jsx = htmlBodyToJsx(result.html);

      return {
        mode: 'html',
        content: `/* --- CSS --- */\n${css}\n\n/* --- JSX --- */\n${jsx}`,
        css,
        jsx,
        recommendedComponents,
      };
    }

    if (!result.dsl) {
      return fallbackTransform(json, mode);
    }

    return {
      mode: 'dsl',
      content: result.dsl,
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
 * - 格式化缩进，方便 AI 阅读
 */
function htmlBodyToJsx(html: string): string {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!bodyMatch) return formatHtml(html.replace(/ class=/g, ' className='));

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

  return formatHtml(body.replace(/ class=/g, ' className='));
}

/**
 * 将压缩的 HTML 字符串格式化为带缩进的多行格式。
 * 纯正则实现，不依赖外部库。
 */
function formatHtml(html: string): string {
  const tokens = html.match(/<[^>]+>|[^<]+/g);
  if (!tokens) return html;

  const lines: string[] = [];
  let depth = 0;
  const INDENT = '  ';
  const SELF_CLOSING = /\/\s*>$/;
  const CLOSING_TAG = /^<\//;
  const VOID_ELEMENTS = /^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)\b/i;

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


