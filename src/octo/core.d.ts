/**
 * 自动适配：
 *   - 压缩 DSL（meta + content，大写字段 K/T/B/S/CH 等）→ 展开为全称 DSL → 转换为旧格式
 *   - 全称 DSL（meta + content，小写 key/type/box/style/children 等）→ 转换为旧格式
 *   - 其他（Figma API 风格 JSON）→ 原样返回
 *
 * @param data 输入 JSON
 * @param applyTrustMode 控制 stage3 节点级标注是否被烘焙，默认 true
 */
export declare function autoConvertDsl(data: any, applyTrustMode?: boolean): any;
/**
 * 将全称 DSL 转换为旧格式
 * 多根时自动包裹一个虚拟 page root，保证返回单节点
 *
 * @param dsl 全称 DSL 根
 * @param applyTrustMode 是否消费 stage3 节点级标注，默认 true（无标注则无副作用）
 */
export declare function convertDslToOldFormat(dsl: DslRoot, applyTrustMode?: boolean): any;
/**
 * 将布局引擎的树转换为增强版 YoloResult
 *
 * 遍历树的每个节点，转为 YoloPrediction：
 * - YOLO 已标记的节点保留原始 label/score/scrollable
 * - 引擎补充的节点用 componentName 或 type 作为 label，score=1.0
 * - box 从设计稿坐标反算回图片坐标系
 * - 父子关系从树结构映射
 */
export declare function convertTreeToYoloPredictions(root: LayoutNode, options: ConvertOptions): YoloResult;
/**
 * 将 Figma 原始 JSON 直接渲染为绝对定位 HTML。
 * 不经过任何引擎处理，100% 忠实于原始坐标和层级。
 */
export declare function designToAbsoluteHtml(json: any, options?: AbsoluteRenderOptions): AbsoluteRenderResult;
/**
 * 将设计稿转换为下游可直接消费的代码结果。
 */
export declare function designToCode(json: any, options: {
	mode: "html" | "vue";
}): DesignToCodeResult;
/**
 * 根据布局树自动生成页面说明书（markdown）。
 *
 * @param tree - processDesign 产出的 LayoutNode 根节点
 * @param options - 可选配置
 * @returns markdown 格式的页面说明书
 */
export declare function generatePageBrief(tree: LayoutNode, options?: PageBriefOptions): string;
/** 判断数据是否为全称 DSL 格式 */
export declare function isNewDslFormat(data: any): data is DslRoot;
/**
 * pre-stage3-convert：在 pipeline 入口判断是否将全称 DSL 用 stage3.js 预转换为 stage3 格式
 *
 * 转换成功的输出会带 `meta.stage3_export.generated_stage='stage3'`，
 * 自动衔接现有 trustStage3 嗅探链路，进入 partial 快路径。
 */
/**
 * 判定输入是否能被 `exportStage3RawMock` 安全转换。
 *
 * 实证验证（75 个 mock，零误判 / 零漏网）：
 * - 必须是全称 DSL（`meta.version: string` + `content` 非空数组 + 首节点 `key + box.{x,y,w,h}`）
 * - 不能已经是 stage3（避免重复转换）
 *
 * 函数纯净：无副作用、不修改输入、不抛异常。
 */
export declare function isStage3Convertible(data: unknown): boolean;
/**
 * 一步完成 Figma JSON → ArkTS DSL 转换
 *
 * 自动识别输入格式，经过完整 pipeline 处理后输出 HarmonyOS ArkTS 友好的 DSL 树。
 *
 * @param json - Figma 导出的 JSON 或新 DSL 格式数据
 * @param options - 配置选项（继承 ProcessDesignOptions + ArkTS 压缩选项）
 * @returns ArkTS DSL 树和统计信息
 *
 * @example
 * ```ts
 * import { octoToArkTsDSL } from 'figma-layout-core';
 *
 * // 最简用法：拿到 ArkTS DSL
 * const { dsl } = octoToArkTsDSL(figmaJson);
 *
 * // 直接拿 JSON 字符串
 * const { json } = octoToArkTsDSL(figmaJson, { outputFormat: 'json' });
 * ```
 */
export declare function octoToArkTsDSL(json: any, options?: OctoToArkTsDSLOptions): OctoToArkTsDSLResult;
/**
 * 一步完成 Figma JSON → ArkUI DSL (DslPage) 转换
 *
 * 内部流程：Figma JSON → processDesign → ArkTsNode → DslPage
 *
 * @example
 * ```ts
 * const { dsl } = octoToArkUiDsl(figmaJson, { pageName: '首页' });
 * const { json } = octoToArkUiDsl(figmaJson, { outputFormat: 'json', pretty: true });
 * ```
 */
export declare function octoToArkUiDsl(json: any, options?: OctoToArkUiDslOptions): OctoToArkUiDslResult;
/**
 * 一步完成 Figma JSON → AI DSL 转换
 *
 * 自动识别输入格式（标准 Figma JSON 或新 DSL 格式 K/N/T/B/S/CH），
 * 经过完整 pipeline 处理后输出 AI 友好的 CompressedNode 压缩树。
 *
 * @param json - Figma 导出的 JSON 或新 DSL 格式数据
 * @param options - 配置选项（继承 ProcessDesignOptions 的全部参数）
 * @returns AI DSL 压缩树和统计信息
 *
 * @example
 * ```ts
 * import { octoToDSL } from 'figma-layout-core';
 *
 * // 最简用法：拿到 AI DSL
 * const { dsl } = octoToDSL(figmaJson);
 *
 * // 直接拿 JSON 字符串（喂给 AI）
 * const { json } = octoToDSL(figmaJson, { outputFormat: 'json' });
 * ```
 */
export declare function octoToDSL(json: any, options?: OctoToDSLOptions): OctoToDSLResult;
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
 * const result = processDesign(figmaJson);
 * // 默认：full 扁平化 + styled-only 容器回填
 * console.log(result.tree);
 * ```
 */
export declare function processDesign(json: any, options?: ProcessDesignOptions): ProcessDesignResult;
/**
 * 将 processDesign 产出的布局树直接转为 ArkUI DSL (DslPage)
 *
 * 适用于已经拿到布局树、不想重新跑 processDesign 的场景。
 * 例如同一棵树既生成 yolo-enhanced 又生成 ArkUI DSL。
 *
 * @param tree - processDesign 产出的 LayoutNode 布局树
 * @param options - 页面名称、描述等选项
 * @returns DslPage 对象，传入 null 时返回 null
 */
export declare function renderArkUiDsl(tree: LayoutNode | null, options?: RenderArkUiDslOptions): DslPage | null;
/**
 * 将布局树按顶层区域拆分，每个区域独立渲染为 Vue SFC。
 *
 * 弱 AI 每次只需读一个区域的 50-200 行代码即可完成重构，
 * 无需阅读整页 1700 行。
 *
 * @param tree - processDesign 产出的 LayoutNode 根节点
 * @param vueOptions - 传给 renderVue 的渲染选项（可选）
 * @returns 按区域拆分的 Vue 片段数组
 */
export declare function splitVueByRegion(tree: LayoutNode, vueOptions?: RenderVueOptions): RegionVueSnippet[];
/**
 * 原汁原味绝对定位渲染器
 *
 * 不经过任何引擎处理（无预处理、无扁平化、无容器回填），
 * 直接将 Figma 原始 JSON 递归渲染为 position:absolute 的 HTML。
 * 同时收集所有图片节点 ID。
 */
export interface AbsoluteRenderOptions {
	/** 资源文件后缀名，默认 'svg' */
	assetExt?: string;
	/** 图片占位模式：使用占位 SVG 替代实际路径，默认 true */
	imagePlaceholder?: boolean;
}
export interface AbsoluteRenderResult {
	/** 完整 HTML 页面字符串 */
	html: string;
	/** 所有需要真实图片资源的节点 ID */
	images: string[];
}
/** 结构化 border */
export interface ArkBorder {
	width: number;
	color: string;
	style?: string;
}
/** 文字装饰 */
export interface ArkDecoration {
	type: string;
	color?: string;
}
/** 结构化 shadow */
export interface ArkShadow {
	radius: number;
	color: string;
	offsetX?: number;
	offsetY?: number;
	spread?: number;
	/** 是否为内阴影（inset），对应 ArkTS ShadowType.INNER */
	inset?: boolean;
}
/** ArkTS DSL 压缩配置 */
export interface ArkTsCompressOptions {
	/** 是否保留 meta 信息，默认 true */
	keepMeta?: boolean;
	/** 是否简化 ID 为数字序号，默认 false */
	simplifyId?: boolean;
	/** 是否输出压缩 JSON（无缩进），默认 false */
	minify?: boolean;
}
/**
 * ArkTS DSL 节点
 * 每个节点对应一个 ArkTS 组件，属性可直接映射为链式调用
 */
export interface ArkTsNode {
	/** ArkTS 组件名：Row / Column / Stack / Text / Image / Button / TextInput / Scroll 等 */
	component: string;
	id?: string;
	/** 子元素间距，对应 Row({ space: 12 }) */
	space?: number;
	width?: number | string;
	height?: number | string;
	padding?: Edges;
	margin?: Edges;
	backgroundColor?: string;
	/** CSS 渐变字符串（linear-gradient / radial-gradient），需 AI 转译为 ArkTS 渐变语法 */
	linearGradient?: string;
	borderRadius?: number | FourCorners;
	border?: ArkBorder;
	shadow?: ArkShadow | ArkShadow[];
	opacity?: number;
	zIndex?: number;
	layoutWeight?: number;
	/** 主轴对齐，值为 ArkTS 枚举字符串如 'FlexAlign.Center' */
	justifyContent?: string;
	/** 交叉轴对齐，值取决于容器方向：Row 用 VerticalAlign，Column 用 HorizontalAlign */
	alignItems?: string;
	content?: string;
	fontColor?: string;
	fontSize?: number;
	fontWeight?: number;
	fontFamily?: string;
	lineHeight?: number;
	letterSpacing?: number;
	textAlign?: string;
	decoration?: ArkDecoration;
	maxLines?: number;
	/** 资源路径/名称（来自 blobPath 或 name） */
	src?: string;
	imageFit?: string;
	meta?: {
		octoId?: string;
		octoName?: string;
		octoType?: string;
		componentInfo?: any;
		role?: "bg" | "img";
		rotation?: number;
		x?: number;
		y?: number;
	};
	children?: ArkTsNode[];
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
 * 字段名尽量贴近 CSS 标准，方便 AI 直接映射
 * 省略默认值：display=flex, alignItems=flex-start
 */
export interface CompressedLayout {
	flexDirection?: "row" | "column";
	wrap?: boolean;
	justifyContent?: "center" | "end" | "between" | "around" | "evenly";
	alignItems?: "center" | "end" | "stretch";
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
 * 字段名尽量贴近 CSS 标准，颜色用 hex，数值去掉单位
 */
export interface CompressedStyles {
	bg?: string;
	border?: string;
	borderRadius?: number | string;
	boxShadow?: string;
	opacity?: number;
	color?: string;
	fontFamily?: string;
	fontSize?: number;
	fontWeight?: number;
	lineHeight?: number;
	letterSpacing?: number;
	textAlign?: "center" | "right";
}
export interface ConvertOptions {
	/** 设计稿宽度 */
	pageWidth: number;
	/** 设计稿高度 */
	pageHeight: number;
	/** 原始 YOLO 数据（用于获取 imageWidth/imageHeight） */
	originalYolo: YoloResult;
}
export interface DesignToCodeResult {
	html?: string;
	css?: string;
	vue?: string;
	/** 最终渲染树中所有需要真实图片资源的节点 ID */
	images: string[];
}
/** 边框对象 */
export interface DslBorder {
	position?: string;
	type?: string;
	width: number;
	style: string;
	color?: DslColor;
}
/**
 * 全称 DSL 类型定义
 * 对应设计平台导出的完整字段名格式（如 9.json）
 */
/** 纯色对象 */
export interface DslColor {
	type: string;
	red: number;
	green: number;
	blue: number;
	alpha: number;
}
export interface DslComponentInfo {
	file_key: string;
	file_name?: string;
	component_key?: string;
	component_name?: string;
	component_description?: string;
	symbol_key: string;
	symbol_name: string;
	symbol_description?: string;
	instance_name: string;
	instance_properties?: Array<{
		type: string;
		key: string;
		value: string;
	}>;
}
export interface DslDesignLayout {
	stackMode?: string;
	stackSpacing?: number;
	stackPaddingTop?: number;
	stackPaddingRight?: number;
	stackPaddingBottom?: number;
	stackPaddingLeft?: number;
	stackPrimaryAlignItems?: string;
	stackCounterAlignItems?: string;
	stackWrap?: string;
	stackPrimarySizing?: string;
	stackCounterSizing?: string;
	stackCounterSpacing?: number;
	stackChildPrimarySizing?: string;
	stackChildCounterSizing?: string;
	autoLayoutAbsolutePos?: boolean;
	autoLayoutItemReverseDraw?: boolean;
}
export interface DslExport {
	export_settings?: Array<{
		name: string;
		type: string;
		constraint_type: string;
		constraint_value: number;
	}>;
	vector_merge?: boolean;
	vector_shape?: string;
	design_layout?: string | DslDesignLayout;
	unbind_component?: string;
	icon?: string;
	chart?: string;
	mark?: string;
	/** 上游明确标记的 mask 节点 */
	mask?: boolean;
	/** stage3 信任标注：节点角色（背景层 / 内容层），由上游识别后烘焙到输入 */
	image_role?: "background" | "content";
	/** stage3 信任标注：图片来源（矢量合并 / 多元素合成），命中时等价于 vector_merge */
	image_source?: "vector" | "composite";
	/** stage3 信任标注：背景层识别证据（推理痕迹，仅用于 metrics / debug） */
	background_layer?: {
		score: number;
		contained_node_ids: string[];
		reasons: string[];
	};
	/** stage3 信任标注：上游声明该节点应被某虚拟容器包住，full 模式下据此重建 VIRTUAL_GROUP */
	virtual_container?: {
		kind: "background-container";
		background_node_id: string;
		wrapped_node_ids: string[];
		reason: string;
	};
}
/** 过滤效果对象 */
export interface DslFilter {
	type: string;
	value: string | number;
}
/** 渐变对象 */
export interface DslGradient {
	type: string;
	center_point: [
		number,
		number
	];
	minor_axis_point: [
		number,
		number
	];
	long_axis_point: [
		number,
		number
	];
	gradient_range: DslGradientStop[];
}
/** 渐变色阶 */
export interface DslGradientStop {
	ratio: number;
	color: DslColor;
}
export interface DslInteraction {
	interaction_type: string;
	navigation_type: string;
	target_key: string;
	target_name: string;
	target_frame: string;
}
export interface DslLocalStyle {
	file_key?: string;
	file_name?: string;
	style_key: string;
	style_name: string;
	style_description?: string;
	style_type: string;
	style_value: any;
}
export interface DslNode {
	key: string;
	name?: string;
	content?: string;
	type: string;
	box: {
		x: number;
		y: number;
		width: number;
		height: number;
	};
	style: DslStyle;
	interaction?: DslInteraction;
	component_instance?: DslComponentInfo;
	library_style?: DslLocalStyle[];
	children?: DslNode[];
	extend?: DslExport;
}
/**
 * ArkUI DSL 类型定义
 *
 * 对应 ArkUI-DSL.md 规范，用于描述一个 ArkUI 页面的布局结构、组件类型、样式信息。
 * 由 ArkTsNode 转换而来，作为最终输出格式供 AI 生成 ArkTS 代码。
 */
/** 根对象，一个 JSON = 一个页面 */
export interface DslPage {
	page: PageMeta;
	ui: UiNode;
}
export interface DslRoot {
	meta: {
		version: string;
		id: string;
		name: string;
		description: string;
		created_at: string;
		updated_at: string;
	};
	content: DslNode[];
	assets: any[];
}
/** 阴影对象 */
export interface DslShadow {
	type: string;
	x: number;
	y: number;
	blur: number;
	spread?: number;
	color: DslColor;
}
export interface DslStyle {
	origin_width: number;
	origin_height: number;
	layer_type?: number;
	rotation_angle: number;
	opacity?: number;
	round_corner?: number[];
	border?: DslBorder[];
	shadow?: DslShadow[];
	filter?: DslFilter[];
	background_color?: DslColorOrGradient | Record<string, never>;
	background_image?: string;
	background_position?: string;
	background_repeat?: string;
	background_size?: string;
	font_color?: DslColorOrGradient;
	font_size?: number;
	font_weight?: number;
	font_family?: string;
	line_height?: number;
	text_align_horizontal?: string;
	text_align_vertical?: string;
	text_decoration?: string;
	stroke_color?: DslColor;
	stroke_width?: number;
}
/** 四边值（padding / margin） */
export interface Edges {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
}
/** 四角圆角 */
export interface FourCorners {
	topLeft?: number;
	topRight?: number;
	bottomRight?: number;
	bottomLeft?: number;
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
	imgUrl?: string;
	opacity?: number;
	classSelf?: string;
	classPrefix?: string;
	bgSourceNodeId?: string;
	styleData?: any;
	imageRole?: "background" | "content";
	/** stage2/3 上游标注：图片来源（vector=矢量合并，composite=多元素合成），由 dsl-converter 透传 */
	imageSource?: "vector" | "composite";
	/** stage2/3 上游标注：背景层识别证据（推理痕迹），由 dsl-converter 透传 */
	backgroundLayer?: {
		score: number;
		containedNodeIds: string[];
		reasons: string[];
	};
	shouldBeImage?: boolean;
	/** componentBoundary 识别出的组件角色 */
	componentRole?: "table" | "chart" | "form" | "dialog" | "cardList";
	/** componentRole 命中原因（供调试 / advisory lint 引用） */
	componentRoleReason?: string;
	/** pageSplit 分类出的页面区域（仅 root 的直接子节点会被打标） */
	pageRegion?: "background" | "main" | "overlay" | "drawer" | "footerBar";
	/** pageRegion 命中原因 */
	pageRegionReason?: string;
	styles?: {
		background?: string;
		border?: string;
		borderRadius?: string;
		boxShadow?: string;
		filter?: string;
		backdropFilter?: string;
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
		rowGap?: number;
		columnGap?: number;
		paddingTop?: number;
		paddingRight?: number;
		paddingBottom?: number;
		paddingLeft?: number;
		layoutType?: string;
		positioning?: "absolute" | "relative";
		/** positioning 降级时附带的原因（供调试 / renderer 可选展示） */
		positioningReason?: string;
		top?: number;
		left?: number;
		marginTop?: number;
		marginRight?: number;
		marginBottom?: number;
		marginLeft?: number;
		/** equal-flex：子节点在主轴上等分父容器剩余空间的 flex-grow 系数（1 表示等分） */
		flexGrow?: number;
		/** equal-flex：等分方向；指示 renderer 需要删除的主轴尺寸字段（'row' 删 width、'column' 删 height） */
		flexGrowAxis?: "row" | "column";
	};
}
/** 设计溯源元信息 */
export interface NodeMeta {
	octoId?: string;
	octoName?: string;
	octoType?: string;
	componentInfo?: {
		componentName?: string;
		componentDescription?: string;
	};
	/** 绝对位置边界框 [x, y, x+w, y+h]，用于跨模型节点匹配 */
	bbox?: [
		number,
		number,
		number,
		number
	];
}
/**
 * 统一后的组件属性。
 * 用途：兼容旧的 prop 和新的 instanceProperties 两种结构。
 */
export interface NormalizedComponentProp {
	key: string;
	value: string;
	type?: string;
}
/**
 * octoToArkTsDSL 的配置选项
 */
export interface OctoToArkTsDSLOptions extends ProcessDesignOptions {
	/** 输出格式：'tree' 返回 ArkTsNode 对象，'json' 返回 JSON 字符串，默认 'tree' */
	outputFormat?: "tree" | "json";
	/** JSON 输出时是否美化格式，默认 false（minify） */
	pretty?: boolean;
	/** ArkTS DSL 压缩选项 */
	compress?: ArkTsCompressOptions;
}
/**
 * octoToArkTsDSL 的返回结果
 */
export interface OctoToArkTsDSLResult {
	/** ArkTS DSL 树 */
	dsl: ArkTsNode | null;
	/** JSON 字符串（仅 outputFormat='json' 时有值） */
	json?: string;
	/** 预处理统计 */
	stats: ProcessDesignResult["stats"];
}
/**
 * octoToArkUiDsl 的配置选项
 */
export interface OctoToArkUiDslOptions extends ProcessDesignOptions {
	/** 输出格式：'tree' 返回 DslPage 对象，'json' 返回 JSON 字符串，默认 'tree' */
	outputFormat?: "tree" | "json";
	/** JSON 输出时是否美化格式，默认 false */
	pretty?: boolean;
	/** ArkTS 中间压缩选项 */
	compress?: ArkTsCompressOptions;
	/** 页面名称，默认取根节点名 */
	pageName?: string;
	/** 页面描述 */
	pageDescription?: string;
}
/**
 * octoToArkUiDsl 的返回结果
 */
export interface OctoToArkUiDslResult {
	/** ArkUI DSL 页面树（DslPage 格式） */
	dsl: DslPage | null;
	/** JSON 字符串（仅 outputFormat='json' 时有值） */
	json?: string;
	/** 预处理统计 */
	stats: ProcessDesignResult["stats"];
}
/**
 * octoToDSL 的配置选项
 */
export interface OctoToDSLOptions extends ProcessDesignOptions {
	/** 输出格式：'tree' 返回 CompressedNode 对象，'json' 返回 JSON 字符串，默认 'tree' */
	outputFormat?: "tree" | "json";
	/** JSON 输出时是否美化格式，默认 false（minify） */
	pretty?: boolean;
	/** AI DSL 压缩选项 */
	compress?: CompressOptions;
}
/**
 * octoToDSL 的返回结果
 */
export interface OctoToDSLResult {
	/** AI DSL 压缩树 */
	dsl: CompressedNode | null;
	/** JSON 字符串（仅 outputFormat='json' 时有值） */
	json?: string;
	/** 预处理统计 */
	stats: ProcessDesignResult["stats"];
}
export interface PageBriefOptions {
	/** 每个区域的文本预览最大字符数，默认 80 */
	maxTextPreview?: number;
	/** 最少重复次数才算重复结构，默认 2 */
	minRepeatCount?: number;
	/** 风险点中每类最多展示条数，默认 3 */
	maxRiskPerType?: number;
}
/** 页面基本信息 */
export interface PageMeta {
	name: string;
	description?: string;
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
	/** 容器回填策略（仅 full 模式生效）：全部 / 仅有视觉样式 / 不回填 */
	containerRecoveryMode?: "all" | "styled-only" | "none";
	clusterAlgorithm?: "row-based" | "dbscan";
	dbscanEps?: number | "auto";
	gapThresholdX?: number;
	gapThresholdY?: number;
	minClusterSize?: number;
	generateStyles?: boolean;
	/** 图片占位模式：为 true 时图片用占位 SVG 替代实际路径，默认 false */
	imagePlaceholder?: boolean;
	/** YOLO 模型识别数据（可选），提供时在样式生成后为匹配节点附加语义标签（不改变树结构） */
	yoloData?: YoloResult;
	/**
	 * 是否执行页面区域分类（为根直接子节点打 pageRegion）。
	 *
	 * 默认 **false** —— 新语义字段走 opt-in，避免污染主回归快照。
	 * 开启后会按序执行 `tagComponentBoundaries` → `classifyPageRegions`，
	 * 以完整衔接 `componentRole=dialog → pageRegion=overlay` 语义链。
	 */
	splitPageRegions?: boolean;
	/**
	 * 是否写入 row 方向 large-gap 语义标签（`layoutType='lr'/'lmr'`、`justifyContent` 覆盖等）。
	 * 默认 false（opt-in）。
	 */
	largeGapSemantics?: boolean;
	/**
	 * 是否写入 layout fallback advisory 标签（`positioning='absolute'`、`positioningReason`）。
	 * 默认 false（opt-in）。
	 */
	layoutFallback?: boolean;
	/**
	 * 是否写入 equal-flex 语义（`layoutType='equal-flex'` + 子节点 `flexGrow=1 / flexGrowAxis`）。
	 * 默认 false（opt-in）。
	 */
	equalFlex?: boolean;
	/**
	 * 是否写入 justify-content 语义（flex-end / center 等，并清除主轴 padding）。
	 * 默认 false（opt-in）。
	 */
	justifyContent?: boolean;
	/**
	 * pipeline 入口预转换开关。
	 *
	 * `src/stage3.js` 的 `exportStage3RawMock()` 能把全称 DSL（如 `mocks/new-data/5.json`）
	 * 转成精简的 stage3 格式（节点数平均缩减 48.7%），转换后输入会带 `meta.stage3_export.generated_stage='stage3'`，
	 * 自动衔接下方 `trustStage3` 嗅探链路 → 进 partial 快路径。
	 *
	 * 取值：
	 * - `'auto'`（**默认**）：合格输入（`isStage3Convertible()` 通过）自动转，否则原样进流水线
	 * - `'on'`：跳过 predicate 强制转，不合格或抛错时透传异常
	 * - `'off'`：完全跳过预转换（用于锁定 regression baseline）
	 *
	 * 上报：`stats.timings` 中追加一条 `stage: 'preStage3Convert'` 的 timing，
	 * `metadata.{before, after, reductionPct, lossyFields}` 暴露收益与有损字段。
	 */
	preStage3Convert?: PreStage3ConvertMode;
	/**
	 * stage3 信任模式开关。
	 *
	 * stage3.json 是上游精修流水线产物，已在 `extend.image_role` / `extend.vector_merge` /
	 * `extend.virtual_container` 等字段里写好上游识别结果。本开关控制引擎对这些标注的信任程度。
	 *
	 * 取值：
	 * - `'off'`：完全忽略 stage3 标注，跑全 pipeline（兜底）。
	 * - `'partial'`（**stage3 输入默认**）：消费节点级标注（image_role / image_source / vector_merge），
	 *   并跳过 `detectImageRole` / `extractBackground` 规则与 `removeOccluded` 预处理。
	 * - `'full'`：在 partial 之上额外执行 `materializeVirtualContainers` pass，把
	 *   `extend.virtual_container.wrapped_node_ids` 物化为 `VIRTUAL_GROUP`，绕过聚类启发式。
	 *
	 * 嗅探规则：未显式传值时，若输入 JSON 含 `meta.stage3_export.generated_stage === 'stage3'`，
	 * 自动解析为 `'partial'`；否则解析为 `'off'`。非 stage3 输入完全不受影响。
	 */
	trustStage3?: "off" | "partial" | "full";
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
		/** 容器回填后（仅 full 模式，其他模式等于 flattened） */
		recovered: LayoutNode | null;
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
		removedNegativeCoords: number;
		removedHueBlendMode: number;
		removedOverflow: number;
		removedOccluded: number;
		removedEmptyText: number;
		removedEmptyGroup: number;
		remainingNodes: number;
		/** 按原因分桶的移除统计，与 removedXxx 散落字段一一对应 */
		removedByReason: RemovedByReason;
		/** 各阶段耗时 / 节点数（metrics） */
		timings: StageTiming[];
		/** 从 preprocess 到最终 tree 的总耗时（含 styles） */
		totalElapsedMs: number;
	};
}
/** 单个区域的 Vue 片段 */
export interface RegionVueSnippet {
	/** 区域序号（从 1 开始） */
	index: number;
	/** 区域名称 */
	name: string;
	/** 在完整 Vue 中可搜索的 CSS 锚点 */
	cssAnchor: string;
	/** 该区域的独立 Vue SFC 字符串 */
	vue: string;
}
/**
 * 按原因分桶的移除统计（与散落字段一一对应）
 */
export interface RemovedByReason {
	hidden: number;
	transparent: number;
	zeroSize: number;
	negativeCoords: number;
	hueBlendMode: number;
	overflow: number;
	occluded: number;
	emptyText: number;
	emptyGroup: number;
}
/**
 * renderArkUiDsl 的配置选项
 */
export interface RenderArkUiDslOptions {
	/** 页面名称，默认取根节点名 */
	pageName?: string;
	/** 页面描述 */
	pageDescription?: string;
	/** ArkTS 中间压缩选项 */
	compress?: ArkTsCompressOptions;
}
/**
 * Vue SFC 渲染选项。
 * 用途：控制模板、类名和样式块的输出策略。
 */
export interface RenderVueOptions {
	classMode?: "tailwind" | "semantic";
	enableDedup?: boolean;
	semanticTags?: boolean;
	includeNodeId?: boolean;
	includeNodeName?: boolean;
	rootClassName?: string;
	scoped?: boolean;
	componentAware?: boolean;
	componentRegistry?: VueComponentRegistry;
}
/**
 * 单阶段耗时 / 节点数快照
 * stage 常见值：
 *   preprocess | flatten | containerRecovery | extractBackground
 *   | cluster | split | layout | styles | pageSplit | trustStage3
 */
export interface StageTiming {
	/** 阶段名 */
	stage: string;
	/** 耗时（毫秒） */
	elapsedMs: number;
	/** 阶段产出的节点数；跳过型阶段（未执行）返回 null */
	nodeCount: number | null;
	/**
	 * 阶段相关元数据（可选）。
	 *
	 * `stage === 'trustStage3'` 时使用结构：
	 * `{ mode: 'off'|'partial'|'full', skippedStages: string[],
	 *    materializedContainers?: number, partialMaterialize?: number }`
	 */
	metadata?: Record<string, unknown>;
}
/** 边框 */
export interface UiBorder {
	width: number;
	color: string;
	/** Solid / Dashed / Dotted */
	style?: string;
}
/** 文字装饰 */
export interface UiDecoration {
	/** Underline / LineThrough / Overline */
	type: string;
	color?: string;
}
/** 四边值 */
export interface UiEdges {
	top?: number;
	right?: number;
	bottom?: number;
	left?: number;
}
/** 四角圆角 */
export interface UiFourCorners {
	topLeft?: number;
	topRight?: number;
	bottomRight?: number;
	bottomLeft?: number;
}
/** 递归组件节点 */
export interface UiNode {
	/** 组件类型：Column / Row / Stack / Text / Image / Button 等 */
	componentName: string;
	/** 文本内容（Text / Button 用） */
	content?: string;
	/** 图片路径（Image 用） */
	src?: string;
	/** 组件构造参数（Button type / Toggle isOn 等） */
	props?: Record<string, any>;
	/** 样式属性 */
	styles?: UiStyles;
	/** 子组件列表 */
	children?: UiNode[];
	/** 设计溯源（生成代码时忽略） */
	meta?: NodeMeta;
}
/** 阴影 */
export interface UiShadow {
	radius: number;
	color: string;
	offsetX?: number;
	offsetY?: number;
	spread?: number;
}
/** UiNode 样式，所有视觉/布局属性统一放这里 */
export interface UiStyles {
	width?: number | string;
	height?: number | string;
	layoutWeight?: number;
	backgroundColor?: string;
	linearGradient?: string;
	border?: UiBorder;
	borderRadius?: number | UiFourCorners;
	opacity?: number;
	shadow?: UiShadow | UiShadow[];
	margin?: number | UiEdges;
	padding?: number | UiEdges;
	justifyContent?: string;
	alignItems?: string;
	space?: number;
	fontSize?: number;
	fontColor?: string;
	fontWeight?: number | string;
	fontFamily?: string;
	lineHeight?: number;
	letterSpacing?: number;
	textAlign?: string;
	maxLines?: number;
	/** 文字装饰（下划线/删除线） */
	decoration?: UiDecoration;
	objectFit?: string;
	backgroundImage?: string;
	/** 背景图填充模式：Cover / Contain / Auto */
	backgroundImageSize?: string;
}
export interface VueComponentPropRule {
	to?: string;
	type?: "auto" | "string" | "boolean" | "number";
	omit?: boolean;
	transform?: (value: string, prop: NormalizedComponentProp, node: LayoutNode) => string;
}
export interface VueComponentRegistryEntry {
	importFrom: string;
	importName: string;
	importType?: "default" | "named";
	localName?: string;
	tagName?: string;
	props?: Record<string, VueComponentPropRule>;
	slotPolicy?: "none" | "default-text";
}
/**
 * YOLO 模型识别数据的类型定义
 */
/** YOLO 单个识别结果 */
export interface YoloPrediction {
	/** 边界框 [x1, y1, x2, y2]，基于原始图片坐标系 */
	box: [
		number,
		number,
		number,
		number
	];
	/** 识别框 ID */
	box_id: number;
	/** 子识别框 ID 列表 */
	children: number[];
	/** 组件语义标签（如 StatusBar、Search、Grid、List 等） */
	label: string;
	/** 层级深度（0=最外层） */
	layer_level: number;
	/** 与其他框的最大 IoU */
	max_iou: number;
	/** 最大 IoU 对应的框 ID */
	max_iou_id: number;
	/** 父框 ID（-1 表示无父节点） */
	parent: number;
	/** 置信度分数 0~1 */
	score: number;
	/** 是否可滚动 */
	scrollable: boolean;
}
/** YOLO 识别结果的完整数据结构 */
export interface YoloResult {
	result1: {
		json: {
			imageHeight: number;
			imageWidth: number;
			predictions: YoloPrediction[];
		};
	};
}
/** 颜色或渐变联合类型 */
export type DslColorOrGradient = DslColor | DslGradient;
/** preStage3Convert 三档开关 */
export type PreStage3ConvertMode = "auto" | "on" | "off";
export type VueComponentRegistry = Record<string, VueComponentRegistryEntry>;

export {};
