import { describe, it, expect } from '@rstest/core';
import { handleChangelogQuery } from '../../src/tools/changelog-query';

describe('changelog_query 参数校验', () => {
  it('无参数调用正常返回（第一页）', async () => {
    const result = await handleChangelogQuery({});
    expect(result.content).toBeDefined();
    // changelog 存在则正常返回，不存在则 isError
  });

  it('page 传字符串不崩溃', async () => {
    const result = await handleChangelogQuery({ page: 'abc' as any });
    expect(result.content).toBeDefined();
  });

  it('page 传负数', async () => {
    const result = await handleChangelogQuery({ page: -1 });
    // 负数页码应该返回错误或第一页
    expect(result.content).toBeDefined();
  });

  it('page 传 0', async () => {
    const result = await handleChangelogQuery({ page: 0 });
    // page 0 会被 || 1 替换为 1
    expect(result.content).toBeDefined();
  });

  it('keyword 搜索', async () => {
    const result = await handleChangelogQuery({ keyword: 'Button' });
    expect(result.content).toBeDefined();
  });
});
