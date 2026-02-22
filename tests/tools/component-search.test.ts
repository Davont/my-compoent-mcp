import { describe, it, expect } from '@rstest/core';
import { handleComponentSearch } from '../../src/tools/component-search';

describe('component_search 参数校验', () => {
  it('缺少 query 返回 isError', async () => {
    const result = await handleComponentSearch({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('搜索关键词');
  });

  it('空字符串 query 返回 isError', async () => {
    const result = await handleComponentSearch({ query: '' });
    expect(result.isError).toBe(true);
  });

  it('query 传 number 不崩溃', async () => {
    // 会被当作 falsy 或转换为字符串
    const result = await handleComponentSearch({ query: 123 as any });
    // 不应崩溃，可能匹配不到任何组件
    expect(result.content).toBeDefined();
  });

  it('query 传 array 不崩溃', async () => {
    const result = await handleComponentSearch({ query: ['a', 'b'] as any });
    expect(result.content).toBeDefined();
  });

  it('正常搜索返回结果', async () => {
    const result = await handleComponentSearch({ query: 'Button' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Button');
  });
});
