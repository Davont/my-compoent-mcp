import { describe, it, expect } from '@rstest/core';
import {
  parseFrontmatter,
  extractSection,
  filterProps,
  extractPropNames,
  extractCodeBlocks,
  replaceCodeBlocksWithPlaceholders,
  isLargeDocument,
  extractDescription,
  getComponentList,
  searchComponents,
  parseExamples,
} from '../../src/utils/doc-reader';

// ========================
// frontmatter 解析
// ========================
describe('parseFrontmatter', () => {
  it('正常解析 frontmatter', () => {
    const content = `---
name: Button
category: form
status: stable
---

# Button

A button component.`;

    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.name).toBe('Button');
    expect(frontmatter!.category).toBe('form');
    expect(frontmatter!.status).toBe('stable');
    expect(body).toContain('# Button');
  });

  it('缺少 frontmatter 返回 null', () => {
    const content = `# Button

A button component.`;

    const { frontmatter, body } = parseFrontmatter(content);
    expect(frontmatter).toBeNull();
    expect(body).toBe(content);
  });

  it('未闭合的 --- 返回 null frontmatter', () => {
    const content = `---
name: Button
category: form

# Button`;

    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter).toBeNull();
  });

  it('解析数组值 [a, b]', () => {
    const content = `---
name: Button
aliases: [Btn, 按钮]
---

body`;

    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.aliases).toEqual(['Btn', '按钮']);
  });

  it('解析带引号的值', () => {
    const content = `---
name: Button
import: "import { Button } from '@my-design/react';"
---

body`;

    const { frontmatter } = parseFrontmatter(content);
    expect(frontmatter).not.toBeNull();
    expect(frontmatter!.import).toBe("import { Button } from '@my-design/react';");
  });
});

// ========================
// section 提取
// ========================
describe('extractSection', () => {
  const content = `## Props

| Prop | Type |
|------|------|
| size | string |

## Events

| Event | Type |
|-------|------|
| onClick | function |

## Behavior

Button behavior description.`;

  it('正常提取 section', () => {
    const section = extractSection(content, 'Props');
    expect(section).not.toBeNull();
    expect(section).toContain('| Prop | Type |');
    expect(section).toContain('| size | string |');
  });

  it('不存在的 section 返回 null', () => {
    const section = extractSection(content, 'NonExistent');
    expect(section).toBeNull();
  });

  it('section 被下一个标题截断', () => {
    const section = extractSection(content, 'Props');
    expect(section).not.toBeNull();
    // 不应包含下一个 section 的内容
    expect(section).not.toContain('Events');
    expect(section).not.toContain('onClick');
  });

  it('大小写不敏感匹配', () => {
    const section = extractSection(content, 'props');
    expect(section).not.toBeNull();
    expect(section).toContain('| size | string |');
  });
});

// ========================
// Props 表格
// ========================
describe('filterProps', () => {
  const propsTable = `| Prop | Type | Default |
|------|------|---------|
| size | string | default |
| variant | string | secondary |
| loading | boolean | false |
| disabled | boolean | false |`;

  it('提取所有属性名', () => {
    const names = extractPropNames(propsTable);
    expect(names).toContain('size');
    expect(names).toContain('variant');
    expect(names).toContain('loading');
    expect(names).toContain('disabled');
    expect(names.length).toBe(4);
  });

  it('按名称过滤 Props', () => {
    const result = filterProps(propsTable, ['size', 'loading']);
    expect(result).toContain('size');
    expect(result).toContain('loading');
    expect(result).not.toContain('variant');
    expect(result).not.toContain('disabled');
  });

  it('连字符属性名无法匹配（已知 bug）', () => {
    const tableWithHyphen = `| Prop | Type | Default |
|------|------|---------|
| aria-label | string | |
| size | string | default |`;

    // 已知限制：\w+ 无法匹配 aria-label
    const names = extractPropNames(tableWithHyphen);
    // aria-label 不会被匹配
    expect(names).not.toContain('aria-label');
    expect(names).toContain('size');
  });

  it('无匹配返回提示信息', () => {
    const result = filterProps(propsTable, ['nonexistent']);
    expect(result).toContain('未找到指定的 Props');
  });
});

// ========================
// 代码块处理
// ========================
describe('extractCodeBlocks', () => {
  it('提取代码块', () => {
    const content = `Some text

\`\`\`tsx
const a = 1;
\`\`\`

More text

\`\`\`css
.btn { color: red; }
\`\`\``;

    const blocks = extractCodeBlocks(content);
    expect(blocks.length).toBe(2);
    expect(blocks[0]).toContain('const a = 1');
    expect(blocks[1]).toContain('.btn');
  });
});

describe('replaceCodeBlocksWithPlaceholders', () => {
  it('替换代码块为占位符', () => {
    const content = `Text

\`\`\`tsx
const a = 1;
\`\`\`

More text`;

    const result = replaceCodeBlocksWithPlaceholders(content, 'Button');
    expect(result).toContain('[代码块 #1 已隐藏]');
    expect(result).toContain('componentName="Button"');
    expect(result).not.toContain('const a = 1');
  });
});

describe('isLargeDocument', () => {
  it('少于 500 行的文档不是大文档', () => {
    const shortDoc = 'line\n'.repeat(100);
    expect(isLargeDocument(shortDoc)).toBe(false);
  });

  it('超过 500 行的文档是大文档', () => {
    const longDoc = 'line\n'.repeat(501);
    expect(isLargeDocument(longDoc)).toBe(true);
  });
});

// ========================
// 描述提取
// ========================
describe('extractDescription', () => {
  it('提取标题后第一段', () => {
    const body = `# Button

触发操作的基础组件，用于提交表单、确认操作。

---

## Props`;

    const desc = extractDescription(body);
    expect(desc).toBe('触发操作的基础组件，用于提交表单、确认操作。');
  });
});

// ========================
// 组件列表 / 搜索
// ========================
describe('getComponentList', () => {
  it('返回全部 5 个组件', () => {
    const list = getComponentList();
    expect(list.length).toBe(5);
    const names = list.map(c => c.name);
    expect(names).toContain('Button');
    expect(names).toContain('Input');
    expect(names).toContain('Modal');
    expect(names).toContain('Select');
    expect(names).toContain('Tooltip');
  });
});

describe('searchComponents', () => {
  it('按别名搜索', () => {
    const results = searchComponents('Btn');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe('Button');
  });

  it('按关键词搜索', () => {
    const results = searchComponents('loading');
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].name).toBe('Button');
  });
});

// ========================
// parseExamples
// ========================
describe('parseExamples', () => {
  it('解析多个示例', () => {
    const section = `### 基础用法

主操作用 primary。

\`\`\`tsx
<Button variant="primary">提交</Button>
\`\`\`

### 加载状态

异步操作时显示 loading。

\`\`\`tsx
<Button loading>提交中</Button>
\`\`\``;

    const examples = parseExamples(section);
    expect(examples.length).toBe(2);
    expect(examples[0].name).toBe('基础用法');
    expect(examples[0].description).toBe('主操作用 primary。');
    expect(examples[1].name).toBe('加载状态');
  });
});
