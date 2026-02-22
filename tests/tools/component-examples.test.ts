import { describe, it, expect } from '@rstest/core';
import { handleComponentExamples } from '../../src/tools/component-examples';

describe('component_examples 参数校验', () => {
  it('缺少 componentName 返回 isError', async () => {
    const result = await handleComponentExamples({});
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('组件名称');
  });

  it('不存在的组件返回 isError', async () => {
    const result = await handleComponentExamples({ componentName: 'NonExistent' });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('可用组件');
  });

  it('exampleName 传 number 不崩溃', async () => {
    const result = await handleComponentExamples({
      componentName: 'Button',
      exampleName: 123 as any,
    });
    // 不应崩溃
    expect(result.content).toBeDefined();
  });

  it('不传 exampleName 返回示例目录', async () => {
    const result = await handleComponentExamples({ componentName: 'Button' });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('示例');
  });

  it('传正确 exampleName 返回示例代码', async () => {
    const result = await handleComponentExamples({
      componentName: 'Button',
      exampleName: '基础用法',
    });
    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('基础用法');
  });
});
