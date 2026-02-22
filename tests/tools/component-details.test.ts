import { describe, it, expect } from '@rstest/core';
import { handleComponentDetails } from '../../src/tools/component-details';

describe('component_details 参数校验', () => {
  it('缺少 componentName 返回 isError', async () => {
    const result = await handleComponentDetails({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('组件名称');
  });

  it('不存在的组件返回 isError 及可用组件列表', async () => {
    const result = await handleComponentDetails({ componentName: 'NonExistent' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('可用组件');
  });

  it('sections 传 string 而非 array 不崩溃', async () => {
    const result = await handleComponentDetails({
      componentName: 'Button',
      sections: 'props' as any,
    });
    // 不应崩溃
    expect(result.content).toBeDefined();
  });

  it('propFilter 传 number 不崩溃', async () => {
    const result = await handleComponentDetails({
      componentName: 'Button',
      propFilter: 123 as any,
    });
    expect(result.content).toBeDefined();
  });

  it('brief 模式正常返回', async () => {
    const result = await handleComponentDetails({
      componentName: 'Button',
      brief: true,
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('概述');
  });

  it('正常请求 sections', async () => {
    const result = await handleComponentDetails({
      componentName: 'Button',
      sections: ['props', 'events'],
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('Props');
  });
});
