import { describe, it, expect } from '@rstest/core';
import { handleComponentList } from '../../src/tools/component-list';

describe('component_list 参数校验', () => {
  it('无参数调用正常返回', async () => {
    const result = await handleComponentList({});
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('组件列表');
  });

  it('category 传 number 不崩溃（触发 catch 返回 isError）', async () => {
    const result = await handleComponentList({ category: 123 as any });
    // number.toLowerCase() 会抛出，catch 返回 isError: true
    expect(result.isError).toBe(true);
  });

  it('status 传无效枚举值不崩溃', async () => {
    const result = await handleComponentList({ status: 'invalid_status' });
    expect(result.isError).toBeUndefined();
    // 无效 status 过滤后应该没有匹配
    expect(result.content[0].text).toContain('未找到符合条件的组件');
  });

  it('正确的 category 过滤', async () => {
    const result = await handleComponentList({ category: 'form' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Button');
  });

  it('正确的 status 过滤', async () => {
    const result = await handleComponentList({ status: 'beta' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Tooltip');
  });
});
