/**
 * 对外统一入口
 *
 * 负责将设计稿一次性转换为 HTML/CSS 或 AI DSL 字符串。
 */
/**
 * 将设计稿转换为下游可直接消费的代码结果。
 */
export declare function designToCode(json: any, options: {
	mode: "html" | "dsl";
}): {
	html?: string;
	css?: string;
	dsl?: string;
};

export {};
