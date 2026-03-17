import { describe, it, expect, beforeAll, afterAll } from '@rstest/core';
import { mkdirSync, writeFileSync, rmSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { handleDesignToCode } from '../../src/tools/design-to-code';
import { transformDevUI } from '../../src/transform/devui';
import { generateComponentImports } from '../../src/transform/devui';
import { formatDevUIOutput } from '../../src/tools/format-devui';

const OCTO_DIR = join(process.cwd(), '.octo');
const TEST_FILE = '__test_devui__';
const TEST_FILE_OCTO = '__test_devui_octo__';
const TEST_JSON = { nodes: [{ type: 'Frame', name: 'Home', children: [] }] };

const MINIMAL_OCTO_JSON = {
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
          textData: { characters: '设置页面', fontSize: 16, fontWeight: 500, lineHeight: 20 },
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
  writeFileSync(join(OCTO_DIR, `${TEST_FILE}.json`), JSON.stringify(TEST_JSON));
  writeFileSync(join(OCTO_DIR, `${TEST_FILE_OCTO}.json`), JSON.stringify(MINIMAL_OCTO_JSON));
});

afterAll(() => {
  for (const name of [`${TEST_FILE}.json`, `${TEST_FILE_OCTO}.json`]) {
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

// ============ handleDesignToCode devUI 模式 ============

describe('design_to_code devUI 模式', () => {
  it('outputMode=devUI 返回 Vue SFC 格式', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE, outputMode: 'devUI' });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('DevUI Vue');
    expect(first.text).toContain('devUI');
    expect(first.text).toContain('<template>');
    expect(first.text).toContain('<style scoped>');
    expect(first.text).toContain('<script setup');
  });

  it('devUI 输出包含 Page.vue 代码块', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE, outputMode: 'devUI' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('Page.vue');
    expect(first.text).toContain('```vue');
  });

  it('devUI 输出使用 class 而非 className', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_OCTO, outputMode: 'devUI' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    const vueBlock = first.text.match(/```vue\n([\s\S]*?)\n```/);
    expect(vueBlock).not.toBeNull();
    if (vueBlock) {
      expect(vueBlock[1]).not.toContain('className=');
    }
  });

  it('devUI 输出包含 AI 语义化改造指令', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE, outputMode: 'devUI' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('先复制');
    expect(first.text).toContain('再改造');
    expect(first.text).toContain('n-');
    expect(first.text).toContain('s-');
    expect(first.text).toContain('data-name');
  });

  it('不传 file 时仍正常列出文件', async () => {
    const result = await handleDesignToCode({});
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain(TEST_FILE);
  });
});

// ============ 组件识别联动 ============

describe('design_to_code devUI 组件识别', () => {
  it('有效 Octo JSON 识别到 Button 时输出包含组件信息', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_OCTO, outputMode: 'devUI' });
    expect(result.isError).toBeUndefined();
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('Button');
    expect(first.text).toContain('组件识别结果');
  });

  it('无推荐组件时提示不要导入组件', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE, outputMode: 'devUI' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('未识别到');
    expect(first.text).toContain('不要从组件库导入');
  });

  it('有推荐组件时提示组件已包含并禁止修改', async () => {
    const result = await handleDesignToCode({ file: TEST_FILE_OCTO, outputMode: 'devUI' });
    const first = result.content[0];
    if (first.type !== 'text') throw new Error('expected text content');
    expect(first.text).toContain('已包含在 Page.vue');
    expect(first.text).toContain('禁止修改');
  });
});

// ============ transformDevUI 函数 ============

describe('transformDevUI 函数', () => {
  it('返回 mode 为 devUI', () => {
    const result = transformDevUI({ test: 1 });
    expect(result.mode).toBe('devUI');
  });

  it('返回结构包含 vue 字段', () => {
    const result = transformDevUI({ test: 1 });
    expect(typeof result.vue).toBe('string');
    expect(result.vue).toContain('<template>');
    expect(result.vue).toContain('</template>');
    expect(result.vue).toContain('<script setup');
    expect(result.vue).toContain('<style scoped>');
  });

  it('有效 Octo JSON 返回带布局的 Vue SFC', () => {
    const result = transformDevUI(MINIMAL_OCTO_JSON);
    expect(result.vue).toContain('<template>');
    expect(result.vue).toContain('class=');
    expect(result.vue).not.toContain('className=');
    expect(result.vue).toContain('<style scoped>');
    expect(result.vue).toContain('layout-node');
  });

  it('有效 Octo JSON 识别出 Button', () => {
    const result = transformDevUI(MINIMAL_OCTO_JSON);
    expect(result.recommendedComponents).toContain('Button');
  });

  it('recommendedComponents 存在（可为空数组）', () => {
    const result = transformDevUI({ test: 1 });
    expect(Array.isArray(result.recommendedComponents)).toBe(true);
  });
});

// ============ generateComponentImports ============

describe('generateComponentImports', () => {
  it('空列表返回空数组', () => {
    expect(generateComponentImports([])).toEqual([]);
  });

  it('已知组件返回正确 import', () => {
    const imports = generateComponentImports(['Button']);
    expect(imports.length).toBeGreaterThan(0);
    expect(imports[0]).toContain('Button');
    expect(imports[0]).toContain('import');
  });

  it('多个组件合并为一条 named import', () => {
    const imports = generateComponentImports(['Button', 'Input']);
    expect(imports.length).toBe(1);
    expect(imports[0]).toContain('Button');
    expect(imports[0]).toContain('Input');
  });
});

// ============ formatDevUIOutput ============

describe('formatDevUIOutput', () => {
  it('输出包含必要结构', () => {
    const output = formatDevUIOutput({
      fileName: 'test',
      vue: '<template><div></div></template>',
      recommendedComponents: [],
    });
    expect(output).toContain('DevUI Vue');
    expect(output).toContain('Page.vue');
    expect(output).toContain('```vue');
    expect(output).toContain('先复制');
    expect(output).toContain('再改造');
  });

  it('有组件时包含组件禁止修改提示', () => {
    const output = formatDevUIOutput({
      fileName: 'test',
      vue: '<template><div></div></template>',
      recommendedComponents: ['Button', 'Input'],
    });
    expect(output).toContain('Button');
    expect(output).toContain('Input');
    expect(output).toContain('已包含在 Page.vue');
    expect(output).toContain('禁止修改');
    expect(output).toContain('props 禁止修改');
  });

  it('无组件时提示不要导入', () => {
    const output = formatDevUIOutput({
      fileName: 'test',
      vue: '<template><div></div></template>',
      recommendedComponents: [],
    });
    expect(output).toContain('不要从组件库导入');
  });

  it('有 componentBundle 时包含规范内容', () => {
    const output = formatDevUIOutput({
      fileName: 'test',
      vue: '<template><div></div></template>',
      componentBundle: '## Button Props\n- type: string',
      recommendedComponents: ['Button'],
    });
    expect(output).toContain('Button Props');
    expect(output).toContain('全部上下文');
  });
});
