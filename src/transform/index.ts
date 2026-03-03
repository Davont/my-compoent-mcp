/**
 * 设计稿 JSON 转换函数
 *
 * 将 .octo/ 目录下的设计稿原始 JSON 转换为简化 DSL 或 HTML。
 * 当前为占位实现，用户应将此文件替换为真实的转换逻辑。
 *
 * 接口约定（替换时必须保持）：
 *   export function transform(json: unknown, mode: TransformMode): TransformResult
 */

export type TransformMode = 'dsl' | 'html';

export interface TransformResult {
  mode: TransformMode;
  content: string;
  /** 设计稿中识别出的 my-design 组件名列表，如 ["Button", "Input", "Modal"] */
  recommendedComponents?: string[];
}

/**
 * 测试专用：覆盖 transform 的返回值，设为 null 恢复默认行为。
 * 仅供测试使用，非测试环境调用会抛出异常。
 */
let _testOverride: TransformResult | null = null;
export function _setTransformOverride(result: TransformResult | null): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('_setTransformOverride is only available in test environments');
  }
  _testOverride = result;
}

/**
 * 将设计稿原始 JSON 转换为简化 DSL 或 HTML
 *
 * @param json  - 从 .octo/*.json 读取的原始设计稿数据
 * @param mode  - 输出格式：'dsl'（简化节点树）或 'html'（完整 HTML 结构）
 * @returns     转换结果，包含 mode 和 content
 */
export function transform(json: unknown, mode: TransformMode): TransformResult {
  if (_testOverride !== null) return _testOverride;
  // TODO: 替换为真实转换逻辑
  if (mode === 'html') {
    return {
      mode: 'html',
      content: `<!-- HTML from design DSL -->\n<div data-design-root>\n${JSON.stringify(json, null, 2)}\n</div>`,
      recommendedComponents: [],
    };
  }
  return {
    mode: 'dsl',
    content: JSON.stringify(json, null, 2),
    recommendedComponents: [],
  };
}
