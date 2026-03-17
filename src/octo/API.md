# Figma Layout Core — API 文档

`dist/core.js`（ES Module）和 `dist/core.umd.cjs`（UMD）现在只对外暴露一个函数：`designToCode`。

这个入口面向下游业务和 MCP 场景，目标是让调用方不再手动拼接 `processDesign`、`renderLayoutPageWithCss`、`compressDSL` 等内部流程。

---

## 快速开始

### 安装引用

```ts
// ES Module（推荐）
import { designToCode } from './dist/core.js';

// UMD / CommonJS
const { designToCode } = require('./dist/core.umd.cjs');
```

### 最简用法

```ts
// HTML 模式：返回完整 HTML 和完整 CSS
const htmlResult = designToCode(figmaJson, { mode: 'html' });
console.log(htmlResult.html);
console.log(htmlResult.css);

// DSL 模式：返回压缩后的 JSON 字符串
const dslResult = designToCode(figmaJson, { mode: 'dsl' });
console.log(dslResult.dsl);
```

---

## 对外 API

### `designToCode(json, options)`

统一入口，输入设计稿 JSON，输出下游可直接消费的结果。

```ts
declare function designToCode(
  json: any,
  options: { mode: 'html' | 'dsl' }
): {
  html?: string;
  css?: string;
  dsl?: string;
};
```

### 参数

```ts
{
  mode: 'html' | 'dsl';
}
```

- `mode: 'html'`：输出完整 HTML 页面字符串和完整 CSS 字符串
- `mode: 'dsl'`：输出压缩后的 JSON 字符串

### 返回值

#### `mode: 'html'`

```ts
{
  html?: string; // 完整 HTML 页面字符串
  css?: string;  // 完整 CSS 字符串，对应旧接口里的 fullCss
}
```

#### `mode: 'dsl'`

```ts
{
  dsl?: string;  // 压缩后的 JSON 字符串
}
```

### 失败行为

如果内部 `processDesign()` 没有产出有效树结构，会返回：

```ts
{
  html: undefined,
  css: undefined,
  dsl: undefined,
}
```

由下游自行处理空结果。

---

## 两种模式

### HTML 模式

```ts
const result = designToCode(figmaJson, { mode: 'html' });

if (result.html && result.css) {
  // result.html: 完整 HTML 页面（含 <style>）
  // result.css: 完整 CSS 字符串，可单独写入文件
}
```

内部固定逻辑近似等价于：

```ts
const { tree } = processDesign(figmaJson);

if (!tree) {
  return { html: undefined, css: undefined, dsl: undefined };
}

const pageResult = renderLayoutPageWithCss(tree, {
  classMode: 'tailwind',
  semanticTags: true,
  enableDedup: true,
  includeNodeId: false,
  includeNodeName: true,
});
```

说明：

- `html` 对应 `renderLayoutPageWithCss(...).html`
- `css` 对应 `renderLayoutPageWithCss(...).fullCss`
- 输出 HTML 已经是完整页面，可直接预览或落盘

### DSL 模式

```ts
const result = designToCode(figmaJson, { mode: 'dsl' });

if (result.dsl) {
  const data = JSON.parse(result.dsl);
  console.log(data);
}
```

内部固定逻辑近似等价于：

```ts
const { tree } = processDesign(figmaJson);

if (!tree) {
  return { html: undefined, css: undefined, dsl: undefined };
}

const compressed = compressDSL(tree, {
  simplifyId: true,
  removeCoordinates: true,
  keepAllName: true,
  omitDefaults: true,
  convertColors: true,
  removeUnits: true,
});

const dsl = toJsonString(compressed);
```

说明：

- `dsl` 是压缩后的 JSON 字符串，不是对象
- 默认更适合喂给 AI、MCP 或代码生成链路

---

## 输入要求

输入通常是 Figma 导出的 JSON 对象，典型结构如下：

```json
{
  "type": "FRAME",
  "id": "33:943",
  "name": "页面名称",
  "x": 0,
  "y": 0,
  "width": 360,
  "height": 792,
  "children": []
}
```

`designToCode` 的入参格式与旧 `core.js` 主路径保持一致，直接传标准 Figma JSON 即可。

---

## 迁移说明

如果你之前这样调用：

```ts
const result = processDesign(json);
const tree = result.tree;

const pageResult = renderLayoutPageWithCss(tree, {
  classMode: 'tailwind',
  semanticTags: true,
  enableDedup: true,
  includeNodeId: false,
  includeNodeName: true,
});
```

现在可以直接改成：

```ts
const result = designToCode(json, { mode: 'html' });
```

如果你之前这样调用：

```ts
const result = processDesign(json);
const tree = result.tree;

const compressed = compressDSL(tree, {
  simplifyId: true,
  removeCoordinates: true,
  keepAllName: true,
  omitDefaults: true,
  convertColors: true,
  removeUnits: true,
});

const dsl = toJsonString(compressed);
```

现在可以直接改成：

```ts
const result = designToCode(json, { mode: 'dsl' });
```

---

## 设计原则

- 对外只保留一个入口，降低接入成本
- 固定下游真实使用的默认参数，避免重复胶水代码
- 内部仍复用现有 pipeline 和渲染 / 压缩逻辑，不改变核心能力
- 对外文档只描述公开能力，不暴露内部实现细节为正式 API
