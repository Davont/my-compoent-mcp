import { describe, it, expect } from '@rstest/core';
import { handleThemeTokens } from '../../src/tools/theme-tokens';

describe('theme_tokens 参数校验', () => {
  it('无参数调用正常返回', async () => {
    const result = await handleThemeTokens({});
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Design Tokens');
  });

  it('type 传 number 不崩溃', async () => {
    const result = await handleThemeTokens({ type: 123 as any });
    // 类型转换后可能匹配不到
    expect(result.content).toBeDefined();
  });

  it('无效 theme 名返回 isError', async () => {
    const result = await handleThemeTokens({ theme: 'nonexistent' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('可用主题');
  });

  it('正确 type 过滤', async () => {
    const result = await handleThemeTokens({ type: 'color' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('color');
  });
});
