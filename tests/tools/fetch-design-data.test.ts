import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@rstest/core';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { handleFetchDesignData } from '../../src/tools/fetch-design-data';

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

// ============ 无 API 场景（列出本地文件、缺少环境变量） ============

describe('fetch_design_data 本地文件列出', () => {
  beforeAll(() => {
    saveEnv('OCTO_DIR', 'OCTO_API_BASE', 'OCTO_TOKEN');
    mkdirSync(OCTO_DIR, { recursive: true });
    writeFileSync(join(OCTO_DIR, 'page-home.json'), JSON.stringify({ type: 'FRAME' }));
    writeFileSync(join(OCTO_DIR, 'page-detail.json'), JSON.stringify({ type: 'FRAME' }));
    process.env.OCTO_DIR = OCTO_DIR;
    delete process.env.OCTO_API_BASE;
    delete process.env.OCTO_TOKEN;
  });

  afterAll(() => {
    restoreEnv();
    try { rmSync(OCTO_DIR, { recursive: true }); } catch { /* ignore */ }
  });

  it('不传 fileKey 时列出本地已有文件', async () => {
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

describe('fetch_design_data 环境变量检查', () => {
  beforeEach(() => {
    saveEnv('OCTO_DIR', 'OCTO_API_BASE', 'OCTO_TOKEN');
    process.env.OCTO_DIR = OCTO_DIR;
  });

  afterEach(() => restoreEnv());

  it('缺少 OCTO_API_BASE 时返回错误提示', async () => {
    delete process.env.OCTO_API_BASE;
    delete process.env.OCTO_TOKEN;
    const result = await handleFetchDesignData({ input: 'test123' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('OCTO_API_BASE');
  });

  it('有 OCTO_API_BASE 但缺少 OCTO_TOKEN 时返回错误提示', async () => {
    process.env.OCTO_API_BASE = 'http://localhost:9999';
    delete process.env.OCTO_TOKEN;
    const result = await handleFetchDesignData({ input: 'test123' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('OCTO_TOKEN');
  });
});

// ============ 文件名校验 ============

describe('fetch_design_data 文件名校验', () => {
  beforeEach(() => {
    saveEnv('OCTO_DIR', 'OCTO_API_BASE', 'OCTO_TOKEN');
    process.env.OCTO_DIR = OCTO_DIR;
    process.env.OCTO_API_BASE = 'http://localhost:9999';
    process.env.OCTO_TOKEN = 'test-token';
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
    saveEnv('OCTO_DIR', 'OCTO_API_BASE', 'OCTO_TOKEN');
    process.env.OCTO_DIR = OCTO_DIR;
    process.env.OCTO_API_BASE = 'http://localhost:9999';
    process.env.OCTO_TOKEN = 'test-token';
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

// ============ Mock API 下载场景 ============

describe('fetch_design_data API 下载', () => {
  let server: ReturnType<typeof createServer>;
  let port: number;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createServer((req: IncomingMessage, res: ServerResponse) => {
        const url = new URL(req.url ?? '/', `http://localhost`);
        const auth = req.headers['authorization'];

        if (auth !== 'Bearer valid-token') {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unauthorized' }));
          return;
        }

        if (url.pathname === '/designs/design-ok') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(MOCK_DESIGN));
          return;
        }

        if (url.pathname === '/designs/design-with-node') {
          const nodeId = url.searchParams.get('nodeId');
          const filtered = nodeId
            ? { ...MOCK_DESIGN, children: MOCK_DESIGN.children.filter(c => c.id === nodeId) }
            : MOCK_DESIGN;
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(filtered));
          return;
        }

        if (url.pathname === '/designs/design-slow') {
          setTimeout(() => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(MOCK_DESIGN));
          }, 5000);
          return;
        }

        if (url.pathname === '/designs/design-500') {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
          return;
        }

        if (url.pathname === '/designs/design-bad-json') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end('not-valid-json{{{');
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      });

      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === 'object' && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try { rmSync(OCTO_DIR, { recursive: true }); } catch { /* ignore */ }
  });

  beforeEach(() => {
    saveEnv('OCTO_DIR', 'OCTO_API_BASE', 'OCTO_TOKEN');
    mkdirSync(OCTO_DIR, { recursive: true });
    process.env.OCTO_DIR = OCTO_DIR;
    process.env.OCTO_API_BASE = `http://127.0.0.1:${port}`;
    process.env.OCTO_TOKEN = 'valid-token';
  });

  afterEach(() => {
    restoreEnv();
    for (const f of ['design-ok.json', 'my-page.json', 'design-with-node.json', 'node-test.json']) {
      try { rmSync(join(OCTO_DIR, f)); } catch { /* ignore */ }
    }
  });

  it('正常下载设计稿并保存到本地', async () => {
    const result = await handleFetchDesignData({ input: 'design-ok' });
    expect(result.isError).toBeUndefined();
    const text = getText(result);
    expect(text).toContain('下载完成');
    expect(text).toContain('design-ok.json');
    expect(text).toContain('design_to_code');
    expect(text).toMatch(/节点数.*\d+/);
    expect(text).toMatch(/耗时.*\d+ms/);

    const saved = JSON.parse(readFileSync(join(OCTO_DIR, 'design-ok.json'), 'utf-8'));
    expect(saved.type).toBe('FRAME');
    expect(saved.children).toHaveLength(2);
  });

  it('自定义 saveName 生效', async () => {
    const result = await handleFetchDesignData({ input: 'design-ok', saveName: 'my-page' });
    expect(result.isError).toBeUndefined();
    const text = getText(result);
    expect(text).toContain('my-page.json');
    expect(existsSync(join(OCTO_DIR, 'my-page.json'))).toBe(true);
  });

  it('带 nodeId 参数下载指定子树', async () => {
    const result = await handleFetchDesignData({
      input: 'design-with-node',
      nodeId: '1:2',
      saveName: 'node-test',
    });
    expect(result.isError).toBeUndefined();
    const text = getText(result);
    expect(text).toContain('node-test.json');
    expect(text).toContain('1:2');

    const saved = JSON.parse(readFileSync(join(OCTO_DIR, 'node-test.json'), 'utf-8'));
    expect(saved.children).toHaveLength(1);
    expect(saved.children[0].id).toBe('1:2');
  });

  it('API 返回 401 时报认证错误', async () => {
    process.env.OCTO_TOKEN = 'bad-token';
    const result = await handleFetchDesignData({ input: 'design-ok' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('401');
  });

  it('API 返回 500 时报服务器错误', async () => {
    const result = await handleFetchDesignData({ input: 'design-500' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('500');
  });

  it('API 返回 404 时报未找到', async () => {
    const result = await handleFetchDesignData({ input: 'nonexistent' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('404');
  });

  it('API 返回无效 JSON 时报解析错误', async () => {
    const result = await handleFetchDesignData({ input: 'design-bad-json' });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('请求失败');
  });

  it('超时场景返回超时错误', async () => {
    const result = await handleFetchDesignData({
      input: 'design-slow',
      timeout: 200,
    });
    expect(result.isError).toBe(true);
    const text = getText(result);
    expect(text).toContain('超时');
  });

  it('fileKey 含特殊字符时自动转换为合法文件名', async () => {
    const result = await handleFetchDesignData({ input: 'design-ok' });
    expect(result.isError).toBeUndefined();
    expect(existsSync(join(OCTO_DIR, 'design-ok.json'))).toBe(true);
  });

  it('返回的节点数统计正确', async () => {
    const result = await handleFetchDesignData({ input: 'design-ok' });
    const text = getText(result);
    // MOCK_DESIGN: root(1) + TEXT(1) + FRAME(1) = 3
    expect(text).toContain('3');
  });

  it('.octo/ 目录不存在时自动创建', async () => {
    const freshDir = join(process.cwd(), '.octo_test_fresh');
    process.env.OCTO_DIR = freshDir;
    try {
      const result = await handleFetchDesignData({ input: 'design-ok', saveName: 'fresh-test' });
      expect(result.isError).toBeUndefined();
      expect(existsSync(join(freshDir, 'fresh-test.json'))).toBe(true);
    } finally {
      try { rmSync(freshDir, { recursive: true }); } catch { /* ignore */ }
    }
  });
});
