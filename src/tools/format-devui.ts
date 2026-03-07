/**
 * devUI 模式的 MCP 输出格式化
 *
 * 负责将 Vue SFC + 组件识别结果 + 组件规范 bundle 组装为
 * AI 可直接理解和执行的结构化文本。
 *
 * 设计目标：对标 HTML 模式的效果（先复制再改、类名约定、组件警告），
 * 针对 Vue SFC 单文件的特点做适配。
 */

export interface FormatDevUIOptions {
  fileName: string;
  vue: string;
  componentBundle?: string | null;
  recommendedComponents: string[];
  sourceExt?: '.json' | '.vue';
}

export function formatDevUIOutput(opts: FormatDevUIOptions): string {
  const { fileName, vue, componentBundle, recommendedComponents, sourceExt = '.json' } = opts;
  const lines: string[] = [];

  lines.push('# 设计稿数据已就绪（DevUI Vue 模式）\n');
  lines.push(`文件：${fileName}${sourceExt}`);
  lines.push('输出格式：devUI\n');

  lines.push('## Page.vue\n');
  lines.push('```vue');
  lines.push(vue);
  lines.push('```\n');

  lines.push('> ⚠️ **必须严格按顺序完成以下全部步骤：**');
  lines.push(
    '> 1. **先复制**：将以上 Page.vue 的代码**逐字原样**写入项目文件，禁止修改任何内容',
  );
  lines.push('> 2. **再改造**：在已写入的文件上修改：');
  lines.push(
    '>    a. 只改 `n-` 开头的独立类名（如 n-33-946、n-rel-33-945、n-split-33-xxx）：' +
      '参考对应元素的 `data-name` 属性理解其含义，替换为语义化名称（如 title-bar、form-area）。' +
      '`<style scoped>` 中的对应选择器同步修改，样式值保持不变',
  );
  lines.push(
    '>    b. `s-` 开头的共享类名（如 s-729846、s-02dea1）是多个元素共用的，禁止修改、禁止拆分、禁止重命名',
  );
  lines.push(
    '>    c. layout-node、flex-row-start、flex-col-center、btn、text、icon、vector 等布局类禁止修改',
  );
  if (recommendedComponents.length > 0) {
    lines.push(
      '>    d. **组件标签（' +
        recommendedComponents.join('、') +
        '）及其 props 禁止修改**',
    );
    lines.push('>    e. 删除所有 `data-name` 属性');
  } else {
    lines.push('>    d. 删除所有 `data-name` 属性');
  }

  lines.push('');
  lines.push('---');
  lines.push('## 组件识别结果\n');

  if (recommendedComponents.length > 0) {
    lines.push(
      `识别到的组件库组件：${recommendedComponents.map(c => `\`${c}\``).join('、')}`,
    );
    lines.push('');
    lines.push(
      '⚠️ **以上组件已包含在 Page.vue 中并配好了 import。** ' +
        '禁止修改其标签名和 props。其他 `data-name`（如 标题栏、表单区域 等）是设计稿图层名，不是组件库组件。',
    );
  } else {
    lines.push('未识别到组件库组件。');
    lines.push('');
    lines.push(
      '⚠️ **不要从组件库导入任何组件。** `data-name` 是设计稿图层名，不是组件库组件名。全部使用普通 HTML 元素实现。',
    );
  }

  if (componentBundle) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(componentBundle);
    lines.push('');
    lines.push('---');
    lines.push(
      '> 以上是生成代码所需的全部上下文，请直接基于设计稿数据和组件规范进行语义化改造。',
    );
  }

  return lines.join('\n');
}
