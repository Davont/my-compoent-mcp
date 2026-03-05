# Figma Layout Core — API 文档

`dist/core.js`（ES Module）/ `dist/core.umd.cjs`（UMD）是布局引擎的打包产物，将 Figma 导出的 JSON 转换为带有 Flex 布局和 CSS 样式的语义化节点树。

---

## 快速开始

### 安装引用

```ts
// ES Module
import { processDesign } from './dist/core.js';

// UMD（浏览器 / CommonJS）
const { processDesign } = require('./dist/core.umd.cjs');
```

### 最简用法

```ts
import { processDesign } from './dist/core.js';

// figmaJson：Figma 导出的 JSON（包含 type, id, x, y, width, height, children 等字段）
const result = processDesign(figmaJson);

console.log(result.tree);       // 最终的 LayoutNode 树（含 layout + styles）
console.log(result.stages);     // 各阶段中间结果
console.log(result.stats);      // 过滤统计（被移除了多少隐藏/透明/零尺寸节点）
```

---

## 输入格式

输入为 Figma 导出的 JSON 对象，核心字段：

```json
{
  "type": "FRAME",
  "id": "33:943",
  "name": "页面名称",
  "x": 0,
  "y": 0,
  "width": 360,
  "height": 792,
  "fills": [{ "type": "SOLID", "color": { "r": 1, "g": 1, "b": 1, "a": 1 } }],
  "strokes": [],
  "effects": [],
  "cornerRadius": 8,
  "children": [...]
}
```

完整示例可参考 `src/mocks/` 目录下的 JSON 文件。

---

## 输出格式：LayoutNode

所有 API 的核心数据结构，贯穿整个处理流程：

```ts
interface LayoutNode {
  id: string;
  name: string;
  type: string;         // FRAME, TEXT, IMAGE, VECTOR, GROUP, VIRTUAL_GROUP 等
  x: number;            // 绝对坐标
  y: number;
  width: number;
  height: number;
  children?: LayoutNode[];

  // 布局属性（Phase 5 由 applyLayout 生成）
  layout?: {
    display?: 'flex';
    flexDirection?: 'row' | 'column';
    alignItems?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
    justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
    gap?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
    marginTop?: number;
    marginLeft?: number;
    // ...
  };

  // 样式属性（Phase 6 由 applyStylesToTree 生成）
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
}
```

---

## API 参考

### 一站式 API

#### `processDesign(json, options?): ProcessDesignResult`

完整流程：预处理 → 扁平化 → 聚类 → 切割 → 布局 → 样式。绝大多数场景用这一个函数即可。

```ts
const result = processDesign(figmaJson, {
  flattenMode: 'smart',          // 'full' | 'smart' | 'preserve-groups'，默认 'smart'
  clusterAlgorithm: 'dbscan',   // 'row-based' | 'dbscan'，默认 'dbscan'
  generateStyles: true,          // 是否生成 CSS 样式，默认 true
  removeHidden: true,            // 移除隐藏节点
  removeTransparent: true,       // 移除透明节点
  removeZeroSize: true,          // 移除零尺寸节点
  removeOverflow: true,          // 移除溢出可视区域的节点
  removeOccluded: true,          // 移除被遮挡的节点
});
```

**返回值**：

```ts
interface ProcessDesignResult {
  tree: LayoutNode | null;       // 最终结果
  stages: {
    preprocessed: LayoutNode | null;  // 预处理后
    flattened: LayoutNode | null;     // 扁平化后
    clustered: LayoutNode | null;     // 聚类后
    split: LayoutNode | null;         // 切割后
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
```

---

### 分步 API（按处理阶段）

如果需要更精细的控制，可以逐步调用各阶段函数。

#### Phase 1：预处理管道

```ts
import { processPipeline } from './dist/core.js';

const { tree, nodeMap, stats } = processPipeline(figmaJson, {
  removeHidden: true,
  removeTransparent: true,
  removeZeroSize: true,
  removeOverflow: true,
  removeOccluded: true,
  autoSort: true,           // 按位置排序子节点
  enableGrouping: false,    // 是否在后处理阶段启用聚类
});
```

内部依次执行：`preprocess`（清洗） → `normalize`（标准化为 LayoutNode） → `postprocess`（8 条规则：排序/合并背景/塌缩图标等）。

#### Phase 2：扁平化

```ts
import { smartFlatten, flattenToLeaves, preserveGroupsFlatten } from './dist/core.js';

// 智能扁平化（保留 INSTANCE/COMPONENT 边界）— 推荐
const flattened = smartFlatten(tree);

// 完全扁平化（只保留叶子节点）
const leaves = flattenToLeaves(tree);

// 保留分组扁平化
const grouped = preserveGroupsFlatten(tree);
```

#### Phase 2.5：容器回填

```ts
import { recoverContainersLayered, collectContainers } from './dist/core.js';

// 收集原始容器信息
const containers = collectContainers(originalTree);

// 将容器回填到扁平化后的叶子中，重建层级
const recoveredTree = recoverContainersLayered(leaves, containers);
```

#### Phase 3：聚类

```ts
import { clusterWithinContainers, clusterWithDBSCAN, clusterLeaves } from './dist/core.js';

// 容器内聚类（推荐，配合 smartFlatten 使用）
const clustered = clusterWithinContainers(flattened, {
  algorithm: 'dbscan',
  dbscanEps: 'auto',
});

// DBSCAN 聚类（用于完全扁平化后的叶子节点）
const root = clusterWithDBSCAN(leaves, { eps: 'auto', minPts: 2 });

// 基于行的简单聚类
const root2 = clusterLeaves(leaves, { gapThresholdX: 50, gapThresholdY: 30 });
```

#### Phase 4：行列切割

```ts
import { splitWithinContainers, projectionSplit, splitResultToTree } from './dist/core.js';

// 容器内切割（推荐）
const split = splitWithinContainers(clustered);

// 手动投影切割
const splitResult = projectionSplit(elements);
const splitTree = splitResultToTree(splitResult, 'root');
```

#### Phase 5：布局分析

```ts
import { applyLayout } from './dist/core.js';

// 为容器节点添加 layout 属性（flexDirection, gap, alignItems, margin 等）
// 注意：直接修改传入的树（mutate），无返回值
applyLayout(splitTree);
```

#### Phase 6：样式生成

```ts
import { applyStylesToTree, extractStyles, stylesToInlineString } from './dist/core.js';

// 为整棵树生成样式（返回新树，不修改原树）
const styledTree = applyStylesToTree(splitTree);

// 单节点提取样式
const styles = extractStyles(node);  // => { background, border, borderRadius, ... }

// 转换为内联 CSS 字符串
const cssString = stylesToInlineString(styles);
// => "background: #fff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1)"
```

#### Phase 7：AI DSL 压缩

将 LayoutNode 树压缩为 AI 友好的格式，减少 token 消耗：

```ts
import { compressDSL, toJsonString, getCompressionStats, printStats } from './dist/core.js';

// 压缩为 AI DSL（删除冗余字段、缩写 key、颜色转 hex、数值去 px）
const compressed = compressDSL(styledTree);

// 输出 JSON 字符串（true = minify，省 token）
const json = toJsonString(compressed, true);

// 查看压缩统计
const stats = getCompressionStats(styledTree, compressed);
printStats(stats);
// => 原始: 120 KB / ~30000 tokens → 压缩后: 45 KB / ~11000 tokens，节省 62.5%
```

配置选项：

```ts
const compressed = compressDSL(tree, {
  simplifyId: true,       // ID 简化为数字序号（1, 2, 3...）
  keepAllName: true,      // 保留所有节点 name
  keepImageName: true,    // 只保留图片/图标的 name
  omitDefaults: true,     // 省略默认值（flex-start、left 等）
  convertColors: true,    // 颜色 rgb → hex
  removeUnits: true,      // 数值去 px 单位
});
```

压缩后的节点结构：

```ts
interface CompressedNode {
  id: string | number;        // 节点 ID
  type: string;               // 节点类型
  w: number;                  // width
  h: number;                  // height
  name?: string;              // 节点名称
  text?: string;              // 文本内容（TEXT 类型）
  role?: 'bg' | 'img';       // 图片角色
  layout?: {
    direction?: 'row' | 'column';
    gap?: number;
    justify?: 'center' | 'end' | 'between' | 'around' | 'evenly';
    align?: 'center' | 'end' | 'stretch';
    pt?: number; pr?: number; pb?: number; pl?: number;  // padding
    mt?: number; mr?: number; mb?: number; ml?: number;  // margin
  };
  styles?: {
    bg?: string;              // background（hex）
    border?: string;
    radius?: number | string; // borderRadius
    shadow?: string;          // boxShadow
    opacity?: number;
    color?: string;           // 文字颜色（hex）
    font?: string;            // fontFamily
    size?: number;            // fontSize
    weight?: number;          // fontWeight
    leading?: number;         // lineHeight
    spacing?: number;         // letterSpacing
    textAlign?: 'center' | 'right';
  };
  children?: CompressedNode[];
}
```

---

### 样式工具

#### 转换器（单独使用）

```ts
import { convertFills, convertStrokes, convertCornerRadius, convertEffects, convertTextStyles } from './dist/core.js';

convertFills(fills);            // Figma fills → CSS background
convertStrokes(strokes, info);  // Figma strokes → CSS border
convertCornerRadius(info);      // cornerRadius → CSS border-radius
convertEffects(effects);        // effects → CSS box-shadow
convertTextStyles(input);       // text properties → CSS font/color
```

#### 颜色工具

```ts
import { figmaColorToRgba, figmaColorToHex, parseColorString } from './dist/core.js';

figmaColorToRgba({ r: 1, g: 0, b: 0, a: 1 });  // => "rgba(255, 0, 0, 1)"
figmaColorToHex({ r: 1, g: 0, b: 0, a: 1 });    // => "#ff0000"
parseColorString("rgba(255, 0, 0, 1)");           // => { r, g, b, a }
```

#### Token 匹配

将 CSS 值映射到设计 Token（Tailwind / Ant Design）：

```ts
import { createTokenMatcher, tailwindTokens, antdTokens } from './dist/core.js';

const matcher = createTokenMatcher(tailwindTokens);
const result = matcher.tokenizeStyles({
  background: '#3b82f6',
  fontSize: '14px',
});
// result.matches => [{ property: 'background', cssVar: '--color-blue-500', ... }]
```

#### 样式优化

```ts
import { optimizeStyles, generateOptimizedCss } from './dist/core.js';

// 分析整棵树，提取可继承样式、共享类
const optimized = optimizeStyles(tree);

// 生成优化后的 CSS 文本
const css = generateOptimizedCss(optimized);
```

---

### 诊断检查（Layout Lint）

非破坏性检查布局质量问题（重叠、溢出、间距异常等）：

```ts
import { checkDesign, checkLayoutTree, formatDiagnostics } from './dist/core.js';

// 从原始 JSON 直接检查（内部会自动走 pipeline）
const { tree, issues } = checkDesign(figmaJson);

// 对已处理的树检查
const issues = checkLayoutTree(tree, {
  overlapThreshold: 0.6,    // 重叠面积阈值
  gapTolerance: 2,          // 间距容差（px）
  backgroundTolerance: 2,   // 背景溢出容差（px）
});

// 格式化输出
console.log(formatDiagnostics(issues));
// => [WARNING] sibling-overlap · Button (12:345) => 与 Icon 重叠 62%
//      ↳ Suggestion: 考虑使用 position: absolute 或调整间距
```

---

### 常量

```ts
import { LEAF_TYPES, CONTAINER_TYPES, PRESERVE_TYPES } from './dist/core.js';

LEAF_TYPES       // TEXT, IMAGE, VECTOR, RECTANGLE, ELLIPSE, LINE, POLYGON, STAR ...
CONTAINER_TYPES  // FRAME, GROUP, SECTION, VIRTUAL_GROUP
PRESERVE_TYPES   // INSTANCE, COMPONENT, COMPONENT_SET
```

---

## 典型流程示意

```
Figma JSON
    │
    ▼
processDesign(json, options)
    │
    ├─ Phase 1: processPipeline ──→ 清洗 + 标准化 + 后处理
    ├─ Phase 2: smartFlatten ─────→ 扁平化（保留组件边界）
    ├─ Phase 3: clusterWithinContainers → DBSCAN 空间聚类
    ├─ Phase 4: splitWithinContainers ──→ 投影切割（行/列识别）
    ├─ Phase 5: applyLayout ──────→ 推断 flex 属性
    └─ Phase 6: applyStylesToTree → 生成 CSS 样式
    │
    ▼
ProcessDesignResult
    ├─ tree:   最终的 LayoutNode 树（含 layout + styles）
    ├─ stages: 各阶段中间快照
    └─ stats:  过滤统计
    │
    ▼ (可选)
compressDSL(tree) → toJsonString()
    │
    ▼
AI DSL JSON（压缩后的精简格式，适合喂给 AI）
```
