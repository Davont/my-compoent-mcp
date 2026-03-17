import { describe, it, expect } from '@rstest/core';
import { resolveRoots, extractRecommendedComponents } from '../../src/utils/component-recognizer';

// ============ resolveRoots ============

describe('resolveRoots', () => {
  it('标准 Figma 节点（有 type）→ 直接作为根', () => {
    const node = { type: 'FRAME', name: 'Page', children: [] };
    expect(resolveRoots(node)).toEqual([node]);
  });

  it('顶层数组 → 每个元素作为根', () => {
    const nodes = [
      { type: 'FRAME', name: 'A' },
      { type: 'FRAME', name: 'B' },
    ];
    expect(resolveRoots(nodes)).toEqual(nodes);
  });

  it('Figma API 响应 { document: { children: [...] } }', () => {
    const child1 = { type: 'FRAME', name: 'Page1', children: [] };
    const child2 = { type: 'FRAME', name: 'Page2', children: [] };
    const apiResponse = { document: { children: [child1, child2] } };
    expect(resolveRoots(apiResponse)).toEqual([child1, child2]);
  });

  it('nodes 数组包装 { nodes: [...] }', () => {
    const node = { type: 'FRAME', name: 'Root', children: [] };
    expect(resolveRoots({ nodes: [node] })).toEqual([node]);
  });

  it('nodes 对象包装 { nodes: { "0:1": { document: ... } } }', () => {
    const inner = { type: 'FRAME', name: 'Inner', children: [] };
    const wrapped = {
      nodes: {
        '0:1': { document: inner },
      },
    };
    expect(resolveRoots(wrapped)).toEqual([inner]);
  });

  it('有 children 但没有 type 的中间容器', () => {
    const child = { type: 'INSTANCE', name: 'Button' };
    expect(resolveRoots({ children: [child] })).toEqual([child]);
  });

  it('null / undefined / 非对象 → 空数组', () => {
    expect(resolveRoots(null)).toEqual([]);
    expect(resolveRoots(undefined)).toEqual([]);
    expect(resolveRoots('string')).toEqual([]);
    expect(resolveRoots(42)).toEqual([]);
  });

  it('空对象 → 空数组', () => {
    expect(resolveRoots({})).toEqual([]);
  });
});

// ============ extractRecommendedComponents 包装层穿透 ============

describe('extractRecommendedComponents 包装层穿透', () => {
  it('标准 Figma 节点能识别 INSTANCE', () => {
    const json = {
      type: 'FRAME',
      name: 'Page',
      children: [
        { type: 'INSTANCE', name: 'Button', children: [] },
      ],
    };
    const result = extractRecommendedComponents(json);
    expect(result).toContain('Button');
  });

  it('{ nodes: [figmaRoot] } 包装也能识别', () => {
    const json = {
      nodes: [{
        type: 'FRAME',
        name: 'Page',
        children: [
          { type: 'INSTANCE', name: 'Button', children: [] },
        ],
      }],
    };
    const result = extractRecommendedComponents(json);
    expect(result).toContain('Button');
  });

  it('{ document: { children: [...] } } 包装也能识别', () => {
    const json = {
      document: {
        children: [{
          type: 'FRAME',
          name: 'Page',
          children: [
            { type: 'COMPONENT', name: 'Input', children: [] },
          ],
        }],
      },
    };
    const result = extractRecommendedComponents(json);
    expect(result).toContain('Input');
  });

  it('无 INSTANCE/COMPONENT 节点 → 空数组', () => {
    const json = {
      type: 'FRAME',
      name: 'Page',
      children: [
        { type: 'TEXT', name: 'Hello' },
      ],
    };
    expect(extractRecommendedComponents(json)).toEqual([]);
  });
});
