import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from '@rstest/core';
import { mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { handleDesignToCode } from '../../src/tools/design-to-code';
import { transform, _setTransformOverride } from '../../src/transform/index';

// 使用带双下划线前缀的文件名，避免与用户真实设计稿撞名
const OCTO_DIR = join(process.cwd(), '.octo');
const TEST_FILE_HOME = '__test_home__';
const TEST_FILE_DETAIL = '__test_detail__';
const TEST_JSON = { nodes: [{ type: 'Frame', name: 'Home', children: [] }] };

// 记录测试前 .octo/ 是否已存在（决定清理时是否删目录）
let octoDirExistedBefore = false;

beforeAll(() => {
  octoDirExistedBefore = existsSync(OCTO_DIR);
  if (!octoDirExistedBefore) {
    mkdirSync(OCTO_DIR, { recursive: true });
  }
  writeFileSync(join(OCTO_DIR, `${TEST_FILE_HOME}.json`), JSON.stringify(TEST_JSON));
  writeFileSync(join(OCTO_DIR, `${TEST_FILE_DETAIL}.json`), JSON.stringify({ nodes: [] }));
});

afterAll(() => {
  // 只删除测试自己写入的文件，不误删用户的真实设计稿
  for (const name of [`${TEST_FILE_HOME}.json`, `${TEST_FILE_DETAIL}.json`]) {
    try {
      const filePath = join(OCTO_DIR, name);
      if (existsSync(filePath)) rmSync(filePath);
    } catch { /* ignore */ }
  }
  // 只有目录是测试创建的，且此时目录为空，才删除目录本身
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
    expect(first.text).toContain('Frame');
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
    // 占位 transform 返回空 recommendedComponents，应降级到文字提示
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'dsl' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('get_context_bundle');
  });
});

// ============ transform 接口 ============

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

  it('html 模式返回 html 内容', () => {
    const result = transform({ test: 1 }, 'html');
    expect(result.mode).toBe('html');
    expect(result.content).toContain('data-design-root');
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
    // 占位 transform 返回空 recommendedComponents → 降级
    const result = await handleDesignToCode({ file: TEST_FILE_HOME, outputMode: 'dsl' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('get_context_bundle');
    expect(first.text).not.toContain('全部上下文');
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
    expect(first.text).toContain('Frame');
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
