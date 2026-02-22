import { describe, it, expect, beforeAll } from '@rstest/core';
import { handleGetComponentFileList } from '../../src/tools/get-component-file-list';
import { resolve } from 'path';

// 设置 MY_DESIGN_PACKAGE_ROOT 指向 mock 目录
beforeAll(() => {
  process.env.MY_DESIGN_PACKAGE_ROOT = resolve(__dirname, '../../mock/@my-design/react');
});

describe('get_component_file_list 参数校验', () => {
  it('缺少 componentName 返回 isError', async () => {
    const result = await handleGetComponentFileList({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('componentName');
  });

  it('不存在的组件返回 isError 及可用目录', async () => {
    const result = await handleGetComponentFileList({ componentName: 'NonExistent' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('未找到组件');
  });

  it('正常获取 Button 组件文件列表', async () => {
    const result = await handleGetComponentFileList({ componentName: 'Button' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('button');
  });

  it('大小写不敏感', async () => {
    const result = await handleGetComponentFileList({ componentName: 'button' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('文件列表');
  });
});
