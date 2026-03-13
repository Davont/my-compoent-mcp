import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@rstest/core';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { handleFetchDesignData } from '../../src/tools/fetch-design-data';
import { registerGetDSL } from '../../src/utils/get-dsl';

const OCTO_DIR = join(process.cwd(), '.octo_test_fetch');
const SAVED_ENV: Record<string, string | undefined> = {};

function saveEnv(...keys: string[]) {
  for (const k of keys) SAVED_ENV[k] = process.env[k];
}
function restoreEnv() {
  for (const [k, v] of Object.entries(SAVED_ENV)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

function getText(result: { content: Array<{ type: string; text?: string }> }): string {
  const first = result.content[0];
  if (first?.type !== 'text' || !first.text) throw new Error('expected text content');
  return first.text;
}

/** 最小 Figma-like JSON 用于 mock */
const MOCK_DESIGN = {
  type: 'FRAME',
  id: '1:1',
  name: '测试页面',
  x: 0, y: 0, width: 375, height: 812,
  children: [
    { type: 'TEXT', id: '1:2', name: '标题', x: 16, y: 20, width: 200, height: 24, characters: '你好' },
    { type: 'FRAME', id: '1:3', name: '内容区', x: 0, y: 60, width: 375, height: 400, children: [] },
  ],
};

// ============ 无 API 场景（列出本地文件） ============

describe('fetch_design_data 本地文件列出', () => {
  beforeAll(() => {
    saveEnv('OCTO_DIR');
    mkdirSync(OCTO_DIR, { recursive: true });
    writeFileSync(join(OCTO_DIR, 'page-home.json'), JSON.stringify({ type: 'FRAME' }));
    writeFileSync(join(OCTO_DIR, 'page-detail.json'), JSON.stringify({ type: 'FRAME' }));
    process.env.OCTO_DIR = OCTO_DIR;
  });

  afterAll(() => {
    restoreEnv();
    try { rmSync(OCTO_DIR, { recursive: true }); } catch { /* ignore */ }
  });

  it('不传 input 时列出本地已有文件', async () => {
    const result = await handleFetchDesignData({});
    expect(result.isError).toBeUndefined();
    const text = getText(result);
    expect(text).toContain('page-home');
    expect(text).toContain('page-detail');
    expect(text).toContain('design_to_code');
  });

  it('本地文件列表显示文件大小', async () => {
    const result = await handleFetchDesignData({});
    const text = getText(result);
    expect(text).toContain('B');
  });
});

// ============ 文件名校验 ============

describe('fetch_design_data 文件名校验', () => {
  beforeEach(() => {
    saveEnv('OCTO_DIR');
    process.env.OCTO_DIR = OCTO_DIR;
    registerGetDSL(async () => JSON.stringify(MOCK_DESIGN));
  });

  afterEach(() => restoreEnv());

  it('saveName 含非法字符时返回错误', async () => {
    const result = await handleFetchDesignData({ input: 'test', saveName: '../etc/passwd' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('非法字符');
  });

  it('saveName 含斜杠时返回错误', async () => {
    const result = await handleFetchDesignData({ input: 'test', saveName: 'a/b' });
    expect(result.isError).toBe(true);
  });
});

// ============ 本地文件已存在 + overwrite ============

describe('fetch_design_data overwrite 控制', () => {
  beforeAll(() => {
    mkdirSync(OCTO_DIR, { recursive: true });
  });

  beforeEach(() => {
    saveEnv('OCTO_DIR');
    process.env.OCTO_DIR = OCTO_DIR;
    registerGetDSL(async () => JSON.stringify(MOCK_DESIGN));
    writeFileSync(join(OCTO_DIR, 'existing.json'), JSON.stringify({ old: true }));
  });

  afterEach(() => {
    restoreEnv();
    try { rmSync(join(OCTO_DIR, 'existing.json')); } catch { /* ignore */ }
  });

  afterAll(() => {
    try { rmSync(OCTO_DIR, { recursive: true }); } catch { /* ignore */ }
  });

  it('overwrite=false 且文件已存在时不覆盖，返回提示', async () => {
    const result = await handleFetchDesignData({
      input: 'test',
      saveName: 'existing',
      overwrite: false,
    });
    expect(result.isError).toBeUndefined();
    const text = getText(result);
    expect(text).toContain('已存在');
    expect(text).toContain('design_to_code');
    const content = readFileSync(join(OCTO_DIR, 'existing.json'), 'utf-8');
    expect(JSON.parse(content)).toEqual({ old: true });
  });
});

// ============ getDSL 下载场景 ============

describe('fetch_design_data getDSL 下载', () => {
  beforeEach(() => {
    saveEnv('OCTO_DIR');
    mkdirSync(OCTO_DIR, { recursive: true });
    process.env.OCTO_DIR = OCTO_DIR;
  });

  afterEach(() => {
    restoreEnv();
    for (const f of ['9E5B01GS_546.json', 'my-page.json', 'design-ok.json']) {
      try { rmSync(join(OCTO_DIR, f)); } catch { /* ignore */ }
    }
  });

  afterAll(() => {
    try { rmSync(OCTO_DIR, { recursive: true }); } catch { /* ignore */ }
  });

  it('正常下载设计稿并保存到本地', async () => {
    registerGetDSL(async ({ code, filePath }) => {
      const data = JSON.stringify(MOCK_DESIGN);
      writeFileSync(filePath, data, 'utf-8');
      return data;
    });

    const result = await handleFetchDesignData({ input: '9E5B01GS_546' });
    expect(result.isError).toBeUndefined();
    const text = getText(result);
    expect(text).toContain('下载完成');
    expect(text).toContain('9E5B01GS_546.json');
    expect(text).toContain('design_to_code');

    const saved = JSON.parse(readFileSync(join(OCTO_DIR, '9E5B01GS_546.json'), 'utf-8'));
    expect(saved.type).toBe('FRAME');
    expect(saved.children).toHaveLength(2);
  });

  it('自定义 saveName 生效', async () => {
    registerGetDSL(async ({ filePath }) => {
      const data = JSON.stringify(MOCK_DESIGN);
      writeFileSync(filePath, data, 'utf-8');
      return data;
    });

    const result = await handleFetchDesignData({ input: '9E5B01GS_546', saveName: 'my-page' });
    expect(result.isError).toBeUndefined();
    const text = getText(result);
    expect(text).toContain('my-page.json');
    expect(existsSync(join(OCTO_DIR, 'my-page.json'))).toBe(true);
  });

  it('getDSL 收到正确的 code 和 filePath', async () => {
    let receivedCode = '';
    let receivedFilePath = '';

    registerGetDSL(async ({ code, filePath }) => {
      receivedCode = code;
      receivedFilePath = filePath;
      const data = JSON.stringify(MOCK_DESIGN);
      writeFileSync(filePath, data, 'utf-8');
      return data;
    });

    await handleFetchDesignData({ input: '9E5B01GS_546', saveName: 'my-page' });
    expect(receivedCode).toBe('9E5B01GS_546');
    expect(receivedFilePath).toContain('my-page.json');
    expect(receivedFilePath).toContain('.octo');
  });

  it('getDSL 抛出错误时返回错误提示', async () => {
    registerGetDSL(async () => {
      throw new Error('网络超时');
    });

    const result = await handleFetchDesignData({ input: '9E5B01GS_546' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('下载失败');
    expect(text).toContain('网络超时');
  });

  it('getDSL 未注册时返回错误', async () => {
    registerGetDSL(undefined as any);

    const result = await handleFetchDesignData({ input: '9E5B01GS_546' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('下载失败');
  });

  it('fileKey 含特殊字符时自动转换为合法文件名', async () => {
    registerGetDSL(async ({ filePath }) => {
      const data = JSON.stringify(MOCK_DESIGN);
      writeFileSync(filePath, data, 'utf-8');
      return data;
    });

    const result = await handleFetchDesignData({ input: 'design-ok' });
    expect(result.isError).toBeUndefined();
    expect(existsSync(join(OCTO_DIR, 'design-ok.json'))).toBe(true);
  });

  it('.octo/ 目录不存在时自动创建', async () => {
    const freshDir = join(process.cwd(), '.octo_test_fresh');
    process.env.OCTO_DIR = freshDir;

    registerGetDSL(async ({ filePath }) => {
      const data = JSON.stringify(MOCK_DESIGN);
      writeFileSync(filePath, data, 'utf-8');
      return data;
    });

    try {
      const result = await handleFetchDesignData({ input: 'design-ok', saveName: 'fresh-test' });
      expect(result.isError).toBeUndefined();
      expect(existsSync(join(freshDir, 'fresh-test.json'))).toBe(true);
    } finally {
      try { rmSync(freshDir, { recursive: true }); } catch { /* ignore */ }
    }
  });

  it('返回的文件大小统计正确', async () => {
    const data = JSON.stringify(MOCK_DESIGN);
    registerGetDSL(async ({ filePath }) => {
      writeFileSync(filePath, data, 'utf-8');
      return data;
    });

    const result = await handleFetchDesignData({ input: 'design-ok' });
    const text = getText(result);
    expect(text).toContain('大小');
    expect(text).toMatch(/\d+.*B/);
  });
});
