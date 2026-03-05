/**
 * Figma Layout Core 类型声明
 * 仅包含 core.js 导出的函数签名和直接关联的类型
 */

// ============ 核心类型 ============

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
  children?: LayoutNode[];
  isPageRoot?: boolean;
  visible?: boolean;
  characters?: string;
  fontSize?: number;
  fontName?: any;
  lineHeight?: any;
  fills?: any[];
  strokes?: any[];
  effects?: any[];
  cornerRadius?: number;
  borderRadius?: any;
  strokeWeight?: number;
  opacity?: number;
  imageRole?: 'background' | 'content';
  mask?: boolean;
  textData?: any;
  componentInfo?: any;
  styles?: ComputedStyles;
  layout?: LayoutProperties;
  [key: string]: any;
}

export interface LayoutProperties {
  display?: 'flex';
  flexDirection?: 'row' | 'column';
  flexWrap?: 'nowrap' | 'wrap';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  gap?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginRight?: number;
  marginBottom?: number;
  marginLeft?: number;
}

export interface ComputedStyles {
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
}

// ============ Pipeline ============

export interface PipelineOptions {
  removeHidden?: boolean;
  removeTransparent?: boolean;
  removeZeroSize?: boolean;
  removeOverflow?: boolean;
  removeOccluded?: boolean;
  autoSort?: boolean;
  enableGrouping?: boolean;
}

export interface PipelineResult {
  tree: LayoutNode | null;
  nodeMap: Map<string, any>;
  stats: PreprocessStats;
}

export interface PreprocessStats {
  totalNodes: number;
  removedHidden: number;
  removedTransparent: number;
  removedZeroSize: number;
  removedOverflow: number;
  removedOccluded: number;
  remainingNodes: number;
}

export function processPipeline(json: any, options?: PipelineOptions): PipelineResult;
export function generateContainmentTree(json: any, options?: PipelineOptions): LayoutNode | null;

// ============ 一站式 API ============

export interface ProcessDesignOptions {
  removeHidden?: boolean;
  removeTransparent?: boolean;
  removeZeroSize?: boolean;
  removeOverflow?: boolean;
  removeOccluded?: boolean;
  autoSort?: boolean;
  flattenMode?: 'full' | 'smart' | 'preserve-groups';
  clusterAlgorithm?: 'row-based' | 'dbscan';
  dbscanEps?: number | 'auto';
  gapThresholdX?: number;
  gapThresholdY?: number;
  minClusterSize?: number;
  generateStyles?: boolean;
}

export interface ProcessDesignResult {
  tree: LayoutNode | null;
  stages: {
    preprocessed: LayoutNode | null;
    flattened: LayoutNode | null;
    clustered: LayoutNode | null;
    split: LayoutNode | null;
  };
  stats: {
    removedHidden: number;
    removedTransparent: number;
    removedZeroSize: number;
    removedOverflow: number;
    removedOccluded: number;
    remainingNodes: number;
  };
}

export function processDesign(json: any, options?: ProcessDesignOptions): ProcessDesignResult;

// ============ 扁平化 ============

export function flattenToLeaves(node: LayoutNode): LayoutNode[];
export function smartFlatten(node: LayoutNode): LayoutNode;
export function preserveGroupsFlatten(node: LayoutNode): LayoutNode;
export function flatten(node: LayoutNode, options?: any): LayoutNode;

export declare const LEAF_TYPES: readonly string[];
export declare const CONTAINER_TYPES: readonly string[];
export declare const PRESERVE_TYPES: readonly string[];

// ============ 容器回填 ============

export interface CollectedContainer {
  node: LayoutNode;
  originalChildren: LayoutNode[];
}

export interface RecoveryOptions {
  paddingThreshold?: number;
  minContainRatio?: number;
}

export function collectContainers(root: LayoutNode): CollectedContainer[];
export function recoverContainersLayered(leaves: LayoutNode[], containers: CollectedContainer[], options?: RecoveryOptions): LayoutNode;
export function filterAndPropagate(root: LayoutNode): LayoutNode;
export function regroupByContainment(nodes: LayoutNode[]): LayoutNode[];
export function regroupTreeByContainment(root: LayoutNode): LayoutNode;

// ============ 聚类 ============

export function clusterLeaves(leaves: LayoutNode[], options?: any): LayoutNode;
export function clusterWithDBSCAN(leaves: LayoutNode[], options?: any): LayoutNode;
export function clusterWithinContainers(root: LayoutNode, options?: any): LayoutNode;
export function clusterGroups(root: LayoutNode): void;
export function findRows(nodes: LayoutNode[]): LayoutNode[][];
export function calcBounds(nodes: LayoutNode[]): { x: number; y: number; width: number; height: number };

// ============ 切割 / 布局 ============

export interface SplitResult {
  type: 'row' | 'column' | 'leaf';
  elements?: any[];
  children?: SplitResult[];
  gap?: number;
}

export function projectionSplit(elements: any[]): SplitResult;
export function splitResultToTree(result: SplitResult, rootId: string, options?: any): LayoutNode | LayoutNode[];
export function printSplitResult(result: SplitResult, indent?: number): void;
export function splitWithinContainers(root: LayoutNode): LayoutNode;
export function applyLayout(root: LayoutNode): void;

export function isolateFullCoverElements(nodes: LayoutNode[]): any;
export function deduplicateSameNameOverlaps(nodes: LayoutNode[]): any;
export function prefilterOverlappingLayers(nodes: LayoutNode[]): any;

export function analyzeChildSpacing(parent: LayoutNode, children: LayoutNode[], isRow: boolean): any;
export function calcChildMargins(parent: LayoutNode, child: LayoutNode, isRow: boolean): any;
export function calcChildrenMargins(parent: LayoutNode, children: LayoutNode[], isRow: boolean): any;
export function getEffectiveBounds(node: LayoutNode): any;
export function getTextBaselineWidth(node: LayoutNode): number | undefined;
export function hasVisualStylesForSpacing(node: LayoutNode): boolean;

// ============ 样式生成 ============

export function extractStyles(node: LayoutNode): ComputedStyles | undefined;
export function applyStylesToTree(root: LayoutNode): LayoutNode;
export function stylesToInlineString(styles: ComputedStyles): string;

export function convertFills(fills: any): string | undefined;
export function convertStrokes(strokes: any, info: any): string | undefined;
export function convertCornerRadius(info: any): string | undefined;
export function convertEffects(effects: any): any;
export function convertTextStyles(input: any): any;

export function figmaColorToRgba(color: any, opacity?: number): string;
export function figmaColorToHex(color: any): string;
export function parseColorString(color: string): any;

export interface TokenConfig {
  colors?: Record<string, string>;
  fontSizes?: Record<string, string>;
  spacing?: Record<string, string>;
  borderRadius?: Record<string, string>;
  lineHeights?: Record<string, string>;
  fontWeights?: Record<string, number>;
}

export declare class TokenMatcher {
  constructor(config: TokenConfig);
  tokenizeStyles(styles: ComputedStyles): any;
}

export function createTokenMatcher(config: TokenConfig): TokenMatcher;
export declare const tailwindTokens: TokenConfig;
export declare const antdTokens: TokenConfig;

export function optimizeStyles(root: LayoutNode, options?: any): any;
export function generateOptimizedCss(optimized: any): string;
export function getNodeOptimizedStyle(optimized: any, nodeId: string): any;

// ============ AI DSL 压缩 ============

export interface CompressedNode {
  id: string | number;
  type: string;
  w: number;
  h: number;
  name?: string;
  text?: string;
  role?: 'bg' | 'img';
  layout?: CompressedLayout;
  styles?: CompressedStyles;
  children?: CompressedNode[];
}

export interface CompressedLayout {
  direction?: 'row' | 'column';
  wrap?: boolean;
  justify?: 'center' | 'end' | 'between' | 'around' | 'evenly';
  align?: 'center' | 'end' | 'stretch';
  gap?: number;
  pt?: number; pr?: number; pb?: number; pl?: number;
  mt?: number; mr?: number; mb?: number; ml?: number;
}

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
  textAlign?: 'center' | 'right';
}

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

export interface CompressionStats {
  original: { size: number; sizeKB: string; nodeCount: number; estimatedTokens: number };
  compressed: { size: number; sizeKB: string; estimatedTokens: number };
  savings: { bytes: number; percent: string; tokens: number };
}

export declare const DEFAULT_COMPRESS_OPTIONS: Required<CompressOptions>;
export function compressDSL(node: LayoutNode, options?: CompressOptions): CompressedNode;
export function getCompressionStats(original: LayoutNode, compressed: CompressedNode, minify?: boolean): CompressionStats;
export function toJsonString(node: CompressedNode, minify?: boolean): string;
export function printStats(stats: CompressionStats): void;

// ============ 诊断（Layout Lint） ============

export interface LayoutIssue {
  id: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  nodeId: string;
  nodeName: string;
  message: string;
  suggestion?: string;
  relatedNodeIds?: string[];
}

export interface CheckResult {
  tree: LayoutNode | null;
  issues: LayoutIssue[];
}

export function checkDesign(json: any, options?: any): CheckResult;
export function checkLayoutTree(root: LayoutNode, options?: any): LayoutIssue[];
export function formatDiagnostics(issues: LayoutIssue[]): string;

// ============ 工具 ============

export declare const utils: {
  hasDeveloperPluginData: (node: any) => boolean;
  isAtomicComponent: (node: any) => boolean;
};
