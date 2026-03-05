/**
 * 直接对 JSON 运行完整检查
 */
export declare function checkDesign(json: any, options?: CheckDesignOptions): CheckResult;
/**
 * 压缩整棵 LayoutNode 树为 AI 友好的格式
 * @param node 根节点
 * @param options 压缩配置
 * @returns 压缩后的节点树
 */
export declare function compressDSL(node: LayoutNode, options?: CompressOptions): CompressedNode;
/**
 * 将诊断结果格式化为可读文本，便于 CLI / 日志输出
 */
export declare function formatDiagnostics(issues: LayoutIssue[]): string;
/**
 * 计算压缩统计信息
 */
export declare function getCompressionStats(original: LayoutNode, compressed: CompressedNode, minify?: boolean): CompressionStats;
/**
 * 一站式处理设计稿
 *
 * 完整流程：预处理 → 扁平化 → 聚类 → 切割 → 布局 → 样式
 *
 * @param json 原始 Figma JSON 数据
 * @param options 配置选项
 * @returns 处理结果，包含最终树和各阶段中间结果
 *
 * @example
 * ```ts
 * const result = processDesign(figmaJson, {
 *   flattenMode: 'smart',
 *   clusterAlgorithm: 'dbscan',
 *   generateStyles: true,
 * });
 * console.log(result.tree);
 * ```
 */
export declare function processDesign(json: any, options?: ProcessDesignOptions): ProcessDesignResult;
export declare function renderAbsolutePage(node: LayoutNode, options?: RenderPageOptions): string;
/**
 * 渲染 Flex 布局页面（兼容旧 API）
 */
export declare function renderLayoutPage(node: LayoutNode, options?: RenderPageOptions): string;
/**
 * 渲染 Flex 布局页面，同时返回 CSS
 * 用于预览和 CSS 标签页同源显示
 */
export declare function renderLayoutPageWithCss(node: LayoutNode, options?: RenderPageOptions): LayoutRenderResult;
/**
 * 输出压缩后的 JSON 字符串
 */
export declare function toJsonString(node: CompressedNode, minify?: boolean): string;
export interface CheckDesignOptions {
	/** 传入 pipeline 配置，默认开启清洗与排序 */
	pipelineOptions?: PipelineOptions;
	/** 是否在原层级上聚类兄弟节点，默认 true */
	enableGrouping?: boolean;
	/** 是否调用 applyLayout 计算布局，默认 true */
	applyLayout?: boolean;
	/** 传递给 lint 的细粒度阈值配置 */
	checkOptions?: CheckLayoutTreeOptions;
}
export interface CheckLayoutTreeOptions {
	/** 重叠判断的面积占比阈值，默认 0.6 */
	overlapThreshold?: number;
	/** 间距误差容忍，默认 2px */
	gapTolerance?: number;
	/** 背景越界容忍，默认 2px */
	backgroundTolerance?: number;
}
export interface CheckResult {
	tree: LayoutNode | null;
	issues: LayoutIssue[];
}
/**
 * 压缩配置选项
 */
export interface CompressOptions {
	simplifyId?: boolean;
	removeCoordinates?: boolean;
	removeName?: boolean;
	keepImageName?: boolean;
	keepAllName?: boolean;
	omitDefaults?: boolean;
	convertColors?: boolean;
	removeUnits?: boolean;
	minify?: boolean;
}
/**
 * 压缩后的布局属性
 * 省略默认值：display=flex, align=flex-start
 */
export interface CompressedLayout {
	direction?: "row" | "column";
	wrap?: boolean;
	justify?: "center" | "end" | "between" | "around" | "evenly";
	align?: "center" | "end" | "stretch";
	gap?: number;
	pt?: number;
	pr?: number;
	pb?: number;
	pl?: number;
	mt?: number;
	mr?: number;
	mb?: number;
	ml?: number;
}
/**
 * 压缩后的节点结构
 * 保留语义，删除冗余
 */
export interface CompressedNode {
	id: string | number;
	type: string;
	w: number;
	h: number;
	name?: string;
	text?: string;
	role?: "bg" | "img";
	layout?: CompressedLayout;
	styles?: CompressedStyles;
	children?: CompressedNode[];
}
/**
 * 压缩后的样式属性
 * 颜色用 hex，数值去掉单位
 */
export interface CompressedStyles {
	bg?: string;
	border?: string;
	radius?: number | string;
	shadow?: string;
	opacity?: number;
	color?: string;
	font?: string;
	size?: number;
	weight?: number;
	leading?: number;
	spacing?: number;
	textAlign?: "center" | "right";
}
/**
 * 压缩统计信息
 */
export interface CompressionStats {
	original: {
		size: number;
		sizeKB: string;
		nodeCount: number;
		estimatedTokens: number;
	};
	compressed: {
		size: number;
		sizeKB: string;
		estimatedTokens: number;
	};
	savings: {
		bytes: number;
		percent: string;
		tokens: number;
	};
}
export interface LayoutIssue {
	id: string;
	type: LayoutIssueType | string;
	severity: IssueSeverity;
	nodeId: string;
	nodeName: string;
	message: string;
	suggestion?: string;
	relatedNodeIds?: string[];
	metrics?: Record<string, number>;
}
export interface LayoutNode {
	id: string;
	name: string;
	type: string;
	x: number;
	y: number;
	width: number;
	height: number;
	area: number;
	depth: number;
	zIndex: number;
	renderOrder: number;
	mergedLayerId?: string;
	mergedLayerType?: string;
	collapsedParentId?: string;
	collapsedParentType?: string;
	collapsedParentName?: string;
	collapsedChildId?: string;
	collapsedChildType?: string;
	collapsedChildName?: string;
	collapsedSiblingId?: string;
	collapsedSiblingType?: string;
	extractedBackgroundId?: string;
	extractedBackgroundType?: string;
	children?: LayoutNode[];
	isPageRoot?: boolean;
	visible?: boolean;
	fontName?: any;
	fontSize?: number;
	lineHeight?: any;
	characters?: string;
	dashPattern?: number[];
	itemSpacing?: number;
	rotation?: number;
	effects?: any[];
	pluginData?: any;
	fills?: any[];
	strokes?: any[];
	cornerRadius?: number;
	borderRadius?: any;
	strokeWeight?: number;
	strokeTopWeight?: number;
	strokeBottomWeight?: number;
	strokeLeftWeight?: number;
	strokeRightWeight?: number;
	primaryAxisAlignItems?: string;
	counterAxisAlignItems?: string;
	componentName?: string;
	nodeType?: string;
	originalLayoutMode?: string;
	style?: any;
	componentInfo?: any;
	mask?: boolean;
	frameMaskDisabled?: boolean;
	textData?: any;
	blendMode?: string;
	className?: string;
	transform?: any;
	transformOrigin?: any;
	staticInfo?: any;
	blobPath?: string;
	opacity?: number;
	classSelf?: string;
	classPrefix?: string;
	bgSourceNodeId?: string;
	styleData?: any;
	imageRole?: "background" | "content";
	styles?: {
		background?: string;
		border?: string;
		borderRadius?: string;
		boxShadow?: string;
		opacity?: number;
		color?: string;
		fontFamily?: string;
		fontSize?: string;
		fontWeight?: number;
		lineHeight?: string;
		letterSpacing?: string;
		textAlign?: string;
		textDecoration?: string;
	};
	layout?: {
		display?: "flex";
		flexDirection?: "row" | "column";
		flexWrap?: "nowrap" | "wrap";
		justifyContent?: "flex-start" | "center" | "flex-end" | "space-between" | "space-around" | "space-evenly";
		alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
		gap?: number;
		paddingTop?: number;
		paddingRight?: number;
		paddingBottom?: number;
		paddingLeft?: number;
		marginTop?: number;
		marginRight?: number;
		marginBottom?: number;
		marginLeft?: number;
	};
}
export interface LayoutRenderResult {
	/** 完整 HTML 页面 */
	html: string;
	/** 节点样式 CSS（不含基础工具类） */
	css: string;
	/** 完整 CSS（基础工具类 + 节点样式） */
	fullCss: string;
}
/**
 * Pipeline 配置选项（平铺结构）
 */
export interface PipelineOptions {
	/** 移除隐藏节点，默认 true */
	removeHidden?: boolean;
	/** 移除透明节点，默认 true */
	removeTransparent?: boolean;
	/** 移除零尺寸节点，默认 true */
	removeZeroSize?: boolean;
	/** 移除溢出祖先容器可见区域的节点，默认 true */
	removeOverflow?: boolean;
	/** 移除被同级高层节点完全遮挡的节点，默认 true */
	removeOccluded?: boolean;
	/** 自动按位置排序子节点，默认 true；false 则保持 Figma 原始图层顺序 */
	autoSort?: boolean;
	/** 启用聚类分组（VIRTUAL_GROUP），默认 false */
	enableGrouping?: boolean;
}
/**
 * 处理设计稿的配置选项
 */
export interface ProcessDesignOptions {
	removeHidden?: boolean;
	removeTransparent?: boolean;
	removeZeroSize?: boolean;
	removeOverflow?: boolean;
	removeOccluded?: boolean;
	autoSort?: boolean;
	flattenMode?: "full" | "smart" | "preserve-groups";
	clusterAlgorithm?: "row-based" | "dbscan";
	dbscanEps?: number | "auto";
	gapThresholdX?: number;
	gapThresholdY?: number;
	minClusterSize?: number;
	generateStyles?: boolean;
}
/**
 * 处理结果
 */
export interface ProcessDesignResult {
	/** 最终处理后的树 */
	tree: LayoutNode | null;
	/** 各阶段中间结果 */
	stages: {
		/** 预处理后 */
		preprocessed: LayoutNode | null;
		/** 扁平化后 */
		flattened: LayoutNode | null;
		/** 聚类后 */
		clustered: LayoutNode | null;
		/** 切割后 */
		split: LayoutNode | null;
	};
	/** 统计信息 */
	stats: {
		removedHidden: number;
		removedTransparent: number;
		removedZeroSize: number;
		removedOverflow: number;
		removedOccluded: number;
		remainingNodes: number;
	};
}
export interface RenderOptions {
	scale?: number;
	rootClassName?: string;
	includeLabels?: boolean;
	classMode?: "tailwind" | "semantic";
	/** 使用类名而非内联样式 */
	useClassName?: boolean;
	/** 类名映射（节点ID → 类名） */
	classNameMap?: Map<string, string>;
	/** 调试模式：输出 is-container/is-leaf/type-xxx 等调试类名，默认 false */
	debugMode?: boolean;
	/** 启用样式去重：相同样式合并为共享类，默认 false */
	enableDedup?: boolean;
	/** 启用语义化标签推断：根据 type 和 name 使用合适的 HTML 标签，默认 true */
	semanticTags?: boolean;
}
export interface RenderPageOptions extends RenderOptions {
	title?: string;
	/** 是否包含内联 <style> 标签（用于预览） */
	includeStyles?: boolean;
	/** 外部 CSS 链接 */
	cssLink?: string;
}
// ============ HTML 渲染 ============

export function renderLayoutToHtml(node: LayoutNode, options?: RenderOptions): string;
export function renderAbsoluteToHtml(node: LayoutNode, options?: RenderOptions): string;
export function renderHtmlWithClasses(node: LayoutNode, options: { classNameMap: Map<string, string[]>; sharedClasses: Map<string, Record<string, string>>; includeLabels?: boolean }): string;

export type IssueSeverity = "info" | "warning" | "error";
export type LayoutIssueType = "BACKGROUND_OUT_OF_BOUNDS" | "SIBLING_OVERLAP" | "INCONSISTENT_SPACING" | "UNIFIED_GAP_SUGGESTED" | "FULL_COVER_LAYER" | "DEVICE_FRAME_PARALLEL_CONTENT" | "CHILD_OVERFLOW" | "MISSING_GROUP" | "MERGE_SUGGESTION" | "SAME_GEOMETRY_SIBLINGS";

export {};
