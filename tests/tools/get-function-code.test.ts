import { describe, it, expect, beforeAll } from '@rstest/core';
import { handleGetFunctionCode } from '../../src/tools/get-function-code';
import { resolve } from 'path';

// 设置 MY_DESIGN_PACKAGE_ROOT 指向 mock 目录
beforeAll(() => {
  process.env.MY_DESIGN_PACKAGE_ROOT = resolve(__dirname, '../../mock/@my-design/react');
});

describe('get_function_code 参数校验', () => {
  it('缺少 filePath 返回 isError', async () => {
    const result = await handleGetFunctionCode({ functionName: 'test' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('filePath');
  });

  it('缺少 functionName 返回 isError', async () => {
    const result = await handleGetFunctionCode({ filePath: '@my-design/react/components/button/index.js' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('functionName');
  });

  it('functionName 传 number 不崩溃', async () => {
    const result = await handleGetFunctionCode({
      filePath: '@my-design/react/components/button/index.js',
      functionName: 123 as any,
    });
    // number 被当作 truthy，作为字符串使用不应崩溃
    expect(result.content).toBeDefined();
  });

  it('正常提取函数', async () => {
    const result = await handleGetFunctionCode({
      filePath: '@my-design/react/components/button/index.js',
      functionName: 'getClassNames',
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('getClassNames');
  });

  it('不存在的函数返回可用函数列表', async () => {
    const result = await handleGetFunctionCode({
      filePath: '@my-design/react/components/button/index.js',
      functionName: 'nonexistentFunction',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('未找到函数');
  });
});
