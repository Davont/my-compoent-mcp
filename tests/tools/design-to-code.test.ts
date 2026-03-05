import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from '@rstest/core';
import { mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { handleDesignToCode } from '../../src/tools/design-to-code';
import { transform, _setTransformOverride } from '../../src/transform/index';

const OCTO_DIR = join(process.cwd(), '.octo');
const TEST_FILE_HOME = '__test_home__';
const TEST_FILE_DETAIL = '__test_detail__';
const TEST_FILE_FIGMA = '__test_figma__';
const TEST_JSON = { nodes: [{ type: 'Frame', name: 'Home', children: [] }] };

/** 从 handleDesignToCode 输出文本中提取 ```json ... ``` 代码块并解析 */
function extractDslJson(text: string): Record<string, unknown> | null {
  const match = text.match(/```json\n([\s\S]*?)\n```/);
  if (!match) return null;
  try { return JSON.parse(match[1]); } catch { return null; }
}


/** 最小可处理的 Figma JSON（能通过 processDesign 布局引擎） */
const MINIMAL_FIGMA_JSON = {
  type: 'FRAME',
  id: 'test:1',
  name: '测试页面',
  x: 0,
  y: 0,
  width: 375,
  height: 600,
  visible: true,
  fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
  strokes: [],
  effects: [],
  children: [
    {
      type: 'FRAME',
      id: 'test:2',
      name: '标题栏',
      x: 0,
      y: 0,
      width: 375,
      height: 44,
      visible: true,
      fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 } }],
      strokes: [],
      effects: [],
      children: [
        {
          type: 'TEXT',
          id: 'test:3',
          name: '页面标题',
          x: 16,
          y: 12,
          width: 80,
          height: 20,
          visible: true,
          characters: '设置页面',
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
          strokes: [],
          effects: [],
          textData: {
            characters: '设置页面',
            fontSize: 16,
            fontWeight: 500,
            lineHeight: 20,
          },
          children: [],
        },
      ],
    },
    {
      type: 'INSTANCE',
      id: 'test:4',
      name: '按钮 Button',
      x: 16,
      y: 500,
      width: 343,
      height: 44,
      visible: true,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1, a: 1 } }],
      strokes: [],
      effects: [],
      cornerRadius: 8,
      children: [
        {
          type: 'TEXT',
          id: 'test:5',
          name: '按钮文字',
          x: 140,
          y: 12,
          width: 63,
          height: 20,
          visible: true,
          characters: '确认提交',
          fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
          strokes: [],
          effects: [],
          children: [],
        },
      ],
    },
  ],
};

let octoDirExistedBefore = false;

beforeAll(() => {
  octoDirExistedBefore = existsSync(OCTO_DIR);
  if (!octoDirExistedBefore) {
    mkdirSync(OCTO_DIR, { recursive: true });
  }
  writeFileSync(join(OCTO_DIR, `${TEST_FILE_HOME}.json`), JSON.stringify(TEST_JSON));
  writeFileSync(join(OCTO_DIR, `${TEST_FILE_DETAIL}.json`), JSON.stringify({ nodes: [] }));
  writeFileSync(join(OCTO_DIR, `${TEST_FILE_FIGMA}.json`), JSON.stringify(MINIMAL_FIGMA_JSON));
});

afterAll(() => {
  for (const name of [
    `${TEST_FILE_HOME}.json`,
    `${TEST_FILE_DETAIL}.json`,
    `${TEST_FILE_FIGMA}.json`,
  ]) {
    try {
      const filePath = join(OCTO_DIR, name);
      if (existsSync(filePath)) rmSync(filePath);
    } catch { /* ignore */ }
  }
  if (!octoDirExistedBefore && existsSync(OCTO_DIR)) {
    try {
      const remaining = readdirSync(OCTO_DIR);
      if (remaining.length === 0) rmSync(OCTO_DIR);
    } catch { /* ignore */ }
  }
});

// ============ 列出文件 ============

describe('design_to_code 列出文件', () => {
  it('不传 file 参数时返回可用文件列表', async () => {
    const result = await handleDesignToCode({});
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain(TEST_FILE_HOME);
    expect(first.text).toContain(TEST_FILE_DETAIL);
  });

  it('文件列表包含使用提示', async () => {
    const result = await handleDesignToCode({});
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('design_to_code');
  });
});

// ============ 读取并转换 ============

describe('design_to_code 读取转换', () => {
  it('默认 outputMode 为 dsl', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_HOME });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('dsl');
    expect(first.text).toContain(`${TEST_FILE_HOME}.json`);
  });

  it('outputMode=dsl 返回 JSON 内容', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'dsl' });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('DSL');
    const dsl = extractDslJson(first.text);
    expect(dsl).not.toBeNull();
    expect(dsl).toHaveProperty('id');
  });

  it('outputMode=html 返回 HTML 内容', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'html' });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('HTML');
    expect(first.text).toContain('html');
  });

  it('无推荐组件时末尾包含手动调用提示', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'dsl' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('get_context_bundle');
  });
});

// ============ transform 函数接口 ============

describe('transform 函数接口', () => {
  it('返回结构包含 mode 和 content', () => {
    const result = transform({ test: 1 }, 'dsl');
    expect(result.mode).toBe('dsl');
    expect(typeof result.content).toBe('string');
  });

  it('recommendedComponents 字段存在（可为空数组）', () => {
    const result = transform({ test: 1 }, 'dsl');
    expect(Array.isArray(result.recommendedComponents)).toBe(true);
  });

  it('任意 JSON 输入 html 模式返回有效 HTML', () => {
    const result = transform({ test: 1 }, 'html');
    expect(result.mode).toBe('html');
    expect(result.content).toContain('<div');
  });
});

// ============ 布局引擎集成 ============

describe('transform 布局引擎集成', () => {
  it('有效 Figma JSON 的 dsl 模式返回精简 DSL（带 w/h）', () => {
    const result = transform(MINIMAL_FIGMA_JSON, 'dsl');
    expect(result.mode).toBe('dsl');
    const parsed = JSON.parse(result.content);
    expect(typeof parsed.id).toBe('number');
    expect(parsed.w).toBeDefined();
    expect(parsed.h).toBeDefined();
  });

  it('精简 DSL 的 TEXT 节点包含 text 字段', () => {
    const result = transform(MINIMAL_FIGMA_JSON, 'dsl');
    const content = result.content;
    expect(content).toContain('"text"');
  });

  it('有效 Figma JSON 的 html 模式返回语义化 HTML', () => {
    const result = transform(MINIMAL_FIGMA_JSON, 'html');
    expect(result.mode).toBe('html');
    expect(result.content).toContain('<div');
    expect(result.content).toContain('<span');
    expect(result.content).toContain('</div>');
    expect(result.content).not.toContain('data-design-root');
  });

  it('HTML 输出包含内联样式', () => {
    const result = transform(MINIMAL_FIGMA_JSON, 'html');
    expect(result.content).toContain('style=');
  });

  it('识别出 INSTANCE 节点中的组件名', () => {
    const result = transform(MINIMAL_FIGMA_JSON, 'dsl');
    expect(result.recommendedComponents).toBeDefined();
    expect(result.recommendedComponents!).toContain('Button');
  });
});

// ============ 联动 get_context_bundle ============

describe('design_to_code 联动组件规范', () => {
  afterEach(() => { _setTransformOverride(null); });

  it('recommendedComponents 非空时输出包含组件规范内容且有"全部上下文"提示', async () => {
    _setTransformOverride({ mode: 'dsl', content: '{"nodes":[]}', recommendedComponents: ['Button'] });
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'dsl' });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('DSL');
    expect(first.text).toContain('Button');
    expect(first.text).toContain('Props');
    expect(first.text).toContain('全部上下文');
    expect(first.text).not.toContain('下一步：调用');
  });

  it('get_context_bundle 返回错误时降级但不影响设计稿内容', async () => {
    _setTransformOverride({ mode: 'dsl', content: '{"nodes":[]}', recommendedComponents: ['NonExistentXyzComponent'] });
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'dsl' });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('DSL');
    expect(first.text).toContain('get_context_bundle');
  });

  it('无推荐组件时走降级路径，提示手动调用', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'dsl' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('get_context_bundle');
    expect(first.text).not.toContain('全部上下文');
  });

  it('真实 Figma JSON 识别到 Button 时自动联动组件规范', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_FIGMA, outputMode: 'dsl' });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('Button');
  });
});

// ============ OCTO_DIR 环境变量 ============

describe('design_to_code OCTO_DIR 环境变量', () => {
  let customDir: string;
  const savedEnv = process.env.OCTO_DIR;

  beforeEach(() => {
    customDir = join(process.cwd(), '.octo_test_custom');
    mkdirSync(customDir, { recursive: true });
    writeFileSync(join(customDir, `${TEST_FILE_HOME}.json`), JSON.stringify(TEST_JSON));
    process.env.OCTO_DIR = customDir;
  });

  afterEach(() => {
    if (savedEnv === undefined) {
      delete process.env.OCTO_DIR;
    } else {
      process.env.OCTO_DIR = savedEnv;
    }
    try { rmSync(customDir, { recursive: true }); } catch { /* ignore */ }
  });

  it('OCTO_DIR 环境变量指向自定义目录时能正常列出文件', async () => {
    const result = await handleDesignToCode({});
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain(TEST_FILE_HOME);
  });

  it('OCTO_DIR 环境变量指向自定义目录时能正常读取文件', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'dsl' });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    const dsl = extractDslJson(first.text);
    expect(dsl).not.toBeNull();
    expect(dsl).toHaveProperty('id');
  });
});

// ============ 错误处理 ============

describe('design_to_code 错误处理', () => {
  it('文件不存在时返回 isError + 可用文件列表', async () => {
    const result = await handleDesignToCode({ file: 'nonexistent' });
    expect(result.isError).toBe(true);
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('nonexistent');
    expect(first.text).toContain(TEST_FILE_HOME);
  });

  it('文件名含非法字符时返回 isError', async () => {
    const result = await handleDesignToCode({ file: '../etc/passwd' });
    expect(result.isError).toBe(true);
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('非法字符');
  });

  it('文件名含 / 时返回 isError', async () => {
    const result = await handleDesignToCode({ file: 'a/b' });
    expect(result.isError).toBe(true);
  });
});
