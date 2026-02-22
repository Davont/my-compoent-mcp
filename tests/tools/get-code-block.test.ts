import { describe, it, expect } from '@rstest/core';
import { handleGetCodeBlock } from '../../src/tools/get-code-block';

describe('get_code_block 参数校验', () => {
  it('缺少 componentName 返回 isError', async () => {
    const result = await handleGetCodeBlock({ codeBlockIndex: 1 });
    expect(result.isError).toBe(true);
  });

  it('缺少 codeBlockIndex 返回 isError', async () => {
    const result = await handleGetCodeBlock({ componentName: 'Button' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('代码块编号');
  });

  it('codeBlockIndex=0 返回 isError', async () => {
    const result = await handleGetCodeBlock({ componentName: 'Button', codeBlockIndex: 0 });
    expect(result.isError).toBe(true);
  });

  it('codeBlockIndex 传字符串不崩溃', async () => {
    const result = await handleGetCodeBlock({ componentName: 'Button', codeBlockIndex: 'abc' as any });
    // NaN 被视为 falsy，应该返回错误
    expect(result.content).toBeDefined();
  });

  it('codeBlockIndex 越界返回 isError', async () => {
    const result = await handleGetCodeBlock({ componentName: 'Button', codeBlockIndex: 9999 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('超出范围');
  });

  it('正常获取代码块', async () => {
    const result = await handleGetCodeBlock({ componentName: 'Button', codeBlockIndex: 1 });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('代码块');
  });
});
