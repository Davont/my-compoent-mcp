import { describe, it, expect, beforeAll } from '@rstest/core';
import { handleSourceInspect } from '../../src/tools/source-inspect';
import { resolve } from 'path';

beforeAll(() => {
  process.env.MY_DESIGN_PACKAGE_ROOT = resolve(__dirname, '../../mock/@my-design/react');
});

describe('source_inspect 参数校验', () => {
  it('缺少 mode 返回 isError', async () => {
    const result = await handleSourceInspect({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('未知 mode');
  });

  it('未知 mode 返回 isError', async () => {
    const result = await handleSourceInspect({ mode: 'invalid' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('list_files');
  });
});

describe('source_inspect list_files', () => {
  it('缺少 componentName 返回 isError', async () => {
    const result = await handleSourceInspect({ mode: 'list_files' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('componentName');
  });

  it('有效组件返回文件列表', async () => {
    const result = await handleSourceInspect({ mode: 'list_files', componentName: 'Button' });
    expect(result.isError).toBeUndefined();
    const text = result.content[0].text;
    expect(text).toContain('Button');
    expect(text).toContain('文件列表');
  });

  it('不存在的组件返回 isError 及可用目录', async () => {
    const result = await handleSourceInspect({ mode: 'list_files', componentName: 'NonExistent' });
    expect(result.isError).toBe(true);
  });
});

describe('source_inspect get_file', () => {
  it('缺少 filePath 返回 isError', async () => {
    const result = await handleSourceInspect({ mode: 'get_file' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('filePath');
  });

  it('无效路径格式返回 isError', async () => {
    const result = await handleSourceInspect({ mode: 'get_file', filePath: 'invalid/path' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('无效');
  });

  it('有效文件路径返回代码内容', async () => {
    const result = await handleSourceInspect({
      mode: 'get_file',
      filePath: '@my-design/react/components/button/index.js',
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('文件');
  });
});

describe('source_inspect get_function', () => {
  it('缺少 filePath 返回 isError', async () => {
    const result = await handleSourceInspect({ mode: 'get_function', functionName: 'foo' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('filePath');
  });

  it('缺少 functionName 返回 isError', async () => {
    const result = await handleSourceInspect({
      mode: 'get_function',
      filePath: '@my-design/react/components/button/index.js',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('functionName');
  });

  it('无效路径格式返回 isError', async () => {
    const result = await handleSourceInspect({
      mode: 'get_function',
      filePath: 'bad/path',
      functionName: 'foo',
    });
    expect(result.isError).toBe(true);
  });
});
