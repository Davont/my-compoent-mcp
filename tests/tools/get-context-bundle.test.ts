import { describe, it, expect } from '@rstest/core';
import { handleGetContextBundle } from '../../src/tools/get-context-bundle';

describe('get_context_bundle 参数校验', () => {
  it('缺少 goal 返回 isError', async () => {
    const result = await handleGetContextBundle({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('goal');
  });

  it('uiType 未传时返回候选类型列表', async () => {
    const result = await handleGetContextBundle({ goal: '生成表单' });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain('uiType');
    expect(text).toContain('form');
    expect(text).toContain('table');
    expect(text).toContain('modal');
  });

  it('uiType 传错误值时返回候选类型列表', async () => {
    const result = await handleGetContextBundle({ goal: '生成表单', uiType: 'unknown_type' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('uiType');
  });
});

describe('get_context_bundle uiType=other', () => {
  it('other 分支按 goal 关键词搜索组件', async () => {
    const result = await handleGetContextBundle({ goal: 'button', uiType: 'other' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('通用场景上下文');
  });

  it('other 分支无匹配时给出建议', async () => {
    const result = await handleGetContextBundle({ goal: 'xyznotexist', uiType: 'other' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('未找到相关组件');
  });
});

describe('get_context_bundle 正常场景', () => {
  it('form + summary 返回推荐组件和 checklist', async () => {
    const result = await handleGetContextBundle({ goal: '生成表单', uiType: 'form' });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain('推荐组件');
    expect(text).toContain('Checklist');
  });

  it('form + summary 包含 Input、Select、Button', async () => {
    const result = await handleGetContextBundle({ goal: '生成表单', uiType: 'form' });
    const text = result.content[0].text;
    expect(text).toContain('Input');
    expect(text).toContain('Select');
    expect(text).toContain('Button');
  });

  it('form + full 包含 Props 章节', async () => {
    const result = await handleGetContextBundle({ goal: '生成表单', uiType: 'form', depth: 'full' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Props');
  });

  it('form + full 包含示例代码', async () => {
    const result = await handleGetContextBundle({ goal: '生成表单', uiType: 'form', depth: 'full' });
    expect(result.content[0].text).toContain('示例');
  });

  it('table + summary 正常返回', async () => {
    const result = await handleGetContextBundle({ goal: '数据列表页', uiType: 'table' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('table');
  });

  it('modal + summary 正常返回', async () => {
    const result = await handleGetContextBundle({ goal: '确认弹窗', uiType: 'modal' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('modal');
  });
});

describe('get_context_bundle 缓存', () => {
  it('相同 uiType+depth 第二次命中缓存', async () => {
    // 第一次
    await handleGetContextBundle({ goal: '任意需求', uiType: 'form', depth: 'summary' });
    // 第二次应命中缓存
    const result = await handleGetContextBundle({ goal: '另一个需求', uiType: 'form', depth: 'summary' });
    expect(result.content[0].text).toContain('缓存命中');
  });
});
