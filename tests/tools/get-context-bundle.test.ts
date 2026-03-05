import { describe, it, expect } from '@rstest/core';
import { handleGetContextBundle } from '../../src/tools/get-context-bundle';

// ============ 参数处理 ============

describe('get_context_bundle 参数处理', () => {
  it('components 和 query 都没传返回 isError', async () => {
    const result = await handleGetContextBundle({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('components');
    expect(result.content[0].text).toContain('query');
  });

  it('components 优先于 query', async () => {
    const result = await handleGetContextBundle({
      components: ['Button'],
      query: '表单',
    });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain('Button');
    // query "表单" 会匹配 Input，但 components 优先，不应走搜索
    expect(text).toContain('共 1 个组件');
  });

  it('components 含不存在的组件名时部分返回 + 提示', async () => {
    const result = await handleGetContextBundle({
      components: ['Button', 'NonExistComponent'],
    });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain('Button');
    expect(text).toContain('未找到组件');
    expect(text).toContain('NonExistComponent');
  });

  it('components 全部不存在返回 isError', async () => {
    const result = await handleGetContextBundle({
      components: ['Foo', 'Bar'],
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('未找到任何指定组件');
  });

  it('components 与 maxComponents 同时传入返回 isError（避免静默忽略）', async () => {
    const result = await handleGetContextBundle({
      components: ['Button'],
      maxComponents: 2,
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('maxComponents');
    expect(result.content[0].text).toContain('query');
  });
});

// ============ query 搜索 ============

describe('get_context_bundle query 搜索', () => {
  it('keyword 命中 + category 扩展', async () => {
    const result = await handleGetContextBundle({ query: '表单' });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    // Input/Form 的 keywords 含 "表单"，category=input
    // Select 等也是 category=input，应被扩展进来
    expect(text).toContain('Input');
    expect(text).toContain('Form');
  });

  it('name/alias 精确匹配排在前面', async () => {
    const result = await handleGetContextBundle({ query: '按钮' });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    // Button 的 aliases 含 "按钮"，应排在最前
    expect(text).toContain('Button');
    // 确保 Button 出现在其他组件之前
    const buttonPos = text.indexOf('## Button');
    const inputPos = text.indexOf('## Input');
    if (buttonPos !== -1 && inputPos !== -1) {
      expect(buttonPos).toBeLessThan(inputPos);
    }
  });

  it('0 命中返回 isError + 可用组件列表', async () => {
    const result = await handleGetContextBundle({ query: '图表统计' });
    expect(result.isError).toBe(true);
    const text = result.content[0].text;
    expect(text).toContain('未找到');
    expect(text).toContain('可用组件');
  });

  it('maxComponents 可配置，限制 query 返回数量', async () => {
    const result = await handleGetContextBundle({ query: '表单', maxComponents: 2 });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain('共 2 个组件');
    expect(text).toContain('结果已截断（最多 2 个组件）');
    expect(text).not.toContain('## Select');
  });

  it('maxComponents 非法时返回 isError', async () => {
    const result = await handleGetContextBundle({ query: '表单', maxComponents: 0 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('maxComponents');
  });
});

// ============ 数据源降级 ============

describe('get_context_bundle 数据源', () => {
  it('有 .md 的组件返回核心规则', async () => {
    const result = await handleGetContextBundle({ components: ['Button'] });
    const text = result.content[0].text;
    expect(text).toContain('Button');
    // Button 有 .md 文档，应有核心规则
    expect(text).toContain('核心规则');
  });

  it('summary 模式不包含示例', async () => {
    const result = await handleGetContextBundle({
      components: ['Button'],
      depth: 'summary',
    });
    const text = result.content[0].text;
    expect(text).not.toContain('### 示例');
  });

  it('full 模式包含示例', async () => {
    const result = await handleGetContextBundle({
      components: ['Button'],
      depth: 'full',
    });
    const text = result.content[0].text;
    expect(text).toContain('示例');
  });

  it('返回包含 Props 信息', async () => {
    const result = await handleGetContextBundle({ components: ['Button'] });
    const text = result.content[0].text;
    expect(text).toContain('Props');
  });

  it('包含推荐 imports 区块', async () => {
    const result = await handleGetContextBundle({
      components: ['Button', 'Input', 'Select'],
    });
    const text = result.content[0].text;
    expect(text).toContain('Imports（必须原样使用，禁止修改导入方式）');
    expect(text).toContain('禁止自行更改导入路径或导入方式');
    expect(text).toContain("@douyinfe/semi-ui");
  });
});

// ============ checklist ============

describe('get_context_bundle checklist', () => {
  it('自动从核心规则生成 checklist', async () => {
    const result = await handleGetContextBundle({
      components: ['Button', 'Input'],
    });
    const text = result.content[0].text;
    expect(text).toContain('Checklist');
    expect(text).toContain('- [ ]');
  });
});

// ============ 缓存 ============

describe('get_context_bundle 缓存', () => {
  it('相同 components + depth 二次调用命中缓存', async () => {
    const result1 = await handleGetContextBundle({
      components: ['Modal'],
      depth: 'summary',
    });
    expect(result1.isError).toBeUndefined();
    const result2 = await handleGetContextBundle({
      components: ['Modal'],
      depth: 'summary',
    });
    expect(result2.content[0].text).toBe(result1.content[0].text);
  });

  it('不同 components 不命中缓存', async () => {
    const result1 = await handleGetContextBundle({ components: ['Button'] });
    const result2 = await handleGetContextBundle({ components: ['Input'] });
    expect(result1.content[0].text).not.toBe(result2.content[0].text);
  });
});

// ============ 别名支持 ============

describe('get_context_bundle 别名', () => {
  it('支持通过别名获取组件', async () => {
    const result = await handleGetContextBundle({ components: ['Btn'] });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain('Button');
  });
});
