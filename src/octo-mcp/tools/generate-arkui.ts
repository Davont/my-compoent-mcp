/**
 * generate_arkui_dsl — 本地设计稿 + 截图 → ArkUI DSL
 *
 * 读取本地设计稿 JSON 和截图，经 YOLO 检测 + core.js 布局引擎，
 * 生成 ArkUI DSL JSON 并保存到 .octo/ 目录。
 * 不提供截图时跳过 YOLO，仅用设计稿 JSON 生成。
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { basename, extname, isAbsolute, join, resolve } from 'path';
import { octoToArkUiDsl } from '../../../public/core.js';

const YOLO_DETECT_URL = 'https://octo-beta.hdesign.huawei.com/uidetect/detect';
const YOLO_TIMEOUT = 60_000;
const IMAGE_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.bmp']);

// ======================== 辅助函数 ========================

/** 读取图片文件，返回纯 base64 字符串 */
function readImageAsBase64(filePath: string): string {
  return readFileSync(filePath).toString('base64');
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

/** 解析文件路径（支持相对路径和绝对路径） */
function resolvePath(root: string, p: string): string {
  return isAbsolute(p) ? p : resolve(root, p);
}

// ======================== YOLO 检测 ========================

/** 判断是否为简化格式 { components: [...] } */
function isSimpleYoloFormat(data: unknown): boolean {
  return !!data && typeof data === 'object' && Array.isArray((data as any).components);
}

/** 简化格式 → 标准 YoloResult（自动推断父子关系和层级） */
function adaptSimpleYolo(data: any): any {
  const comps: any[] = data.components;
  const inferW = Math.ceil(Math.max(...comps.map((c: any) => c.bbox.x2)) * 1.02);
  const inferH = Math.ceil(Math.max(...comps.map((c: any) => c.bbox.y2)) * 1.02);

  const area = (c: any) => (c.bbox.x2 - c.bbox.x1) * (c.bbox.y2 - c.bbox.y1);
  const contains = (a: any, b: any) =>
    a.bbox.x1 <= b.bbox.x1 && a.bbox.y1 <= b.bbox.y1 &&
    a.bbox.x2 >= b.bbox.x2 && a.bbox.y2 >= b.bbox.y2 && a !== b;

  const sorted = [...comps].sort((a, b) => area(b) - area(a));
  const parentMap = new Map<number, number>();
  const childrenMap = new Map<number, number[]>();

  for (let i = 0; i < sorted.length; i++) {
    parentMap.set(i, -1);
    childrenMap.set(i, []);
  }
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i - 1; j >= 0; j--) {
      if (contains(sorted[j], sorted[i])) {
        const cur = parentMap.get(i)!;
        if (cur === -1 || area(sorted[j]) < area(sorted[cur])) {
          parentMap.set(i, j);
        }
      }
    }
  }
  for (let i = 0; i < sorted.length; i++) {
    const p = parentMap.get(i)!;
    if (p !== -1) childrenMap.get(p)!.push(i);
  }

  const depthMap = new Map<number, number>();
  function calcDepth(idx: number): number {
    if (depthMap.has(idx)) return depthMap.get(idx)!;
    const p = parentMap.get(idx)!;
    const d = p === -1 ? 0 : calcDepth(p) + 1;
    depthMap.set(idx, d);
    return d;
  }
  for (let i = 0; i < sorted.length; i++) calcDepth(i);

  return {
    result1: {
      json: {
        imageWidth: inferW,
        imageHeight: inferH,
        predictions: sorted.map((comp: any, idx: number) => ({
          box: [comp.bbox.x1, comp.bbox.y1, comp.bbox.x2, comp.bbox.y2],
          box_id: idx,
          label: comp.class,
          score: comp.confidence,
          layer_level: depthMap.get(idx) ?? 0,
          parent: parentMap.get(idx) ?? -1,
          children: childrenMap.get(idx) ?? [],
          max_iou: 0,
          max_iou_id: -1,
          scrollable: false,
        })),
      },
    },
  };
}

/** 调用 YOLO 检测 API，失败返回 null（不中断流程） */
async function detectYolo(imageBase64: string): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), YOLO_TIMEOUT);

  try {
    const resp = await fetch(YOLO_DETECT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: imageBase64 }),
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`YOLO API 返回 ${resp.status} ${resp.statusText}`);
    }

    let data = await resp.json();
    if (isSimpleYoloFormat(data)) return adaptSimpleYolo(data);
    if (data.result?.result1 && !data.result1) data = data.result;
    return data;
  } finally {
    clearTimeout(timer);
  }
}

// ======================== 工具定义 ========================

export const generateArkuiTool: Tool = {
  name: 'generate_arkui_dsl',
  description:
    '将设计稿 JSON + 截图转换为 ArkUI DSL JSON（布局 DSL 生成，pipeline 的第一步）。\n' +
    '内部处理：读取文件 → 图片转 base64 → YOLO 检测 → 布局引擎 → 生成 ArkUI DSL → 保存到 .octo/ 目录。\n' +
    '不提供 image 时跳过 YOLO 检测，仅用设计稿 JSON 生成。\n' +
    '注意：不要自己读取文件内容，直接传路径。\n\n' +
    '重要：请优先查找并使用 generate-arkui-dsl Skill 来调用此工具。' +
    'Skill 提供完整的多步流程（布局 DSL + 多模态组件识别 + 合并），直接调用此工具只能获得第一步的结果。',
  inputSchema: {
    type: 'object',
    properties: {
      projectRoot: {
        type: 'string',
        description: '【必填】项目根目录绝对路径',
      },
      designJson: {
        type: 'string',
        description: '【必填】设计稿 JSON 文件路径（相对 projectRoot 或绝对路径）',
      },
      image: {
        type: 'string',
        description: '截图文件路径（相对 projectRoot 或绝对路径）。提供时调用 YOLO 检测增强识别精度，不提供则跳过。',
      },
      pageName: {
        type: 'string',
        description: '页面名称，默认 "Page"',
      },
      saveName: {
        type: 'string',
        description: '输出文件名（不含扩展名），默认从 designJson 文件名推导',
      },
    },
    required: ['projectRoot', 'designJson'],
  },
};

// ======================== 工具处理器 ========================

export async function handleGenerateArkui(
  args: Record<string, unknown>,
): Promise<CallToolResult> {
  const projectRoot = typeof args.projectRoot === 'string' ? args.projectRoot.trim() : '';
  const designJsonPath = typeof args.designJson === 'string' ? args.designJson.trim() : '';
  const imagePath = typeof args.image === 'string' ? args.image.trim() : '';
  const pageName = typeof args.pageName === 'string' ? args.pageName.trim() : 'Page';
  const rawSaveName = typeof args.saveName === 'string' ? args.saveName.trim() : '';

  if (!projectRoot || !isAbsolute(projectRoot)) {
    return { content: [{ type: 'text', text: 'projectRoot 必须是非空绝对路径。' }], isError: true };
  }
  if (!designJsonPath) {
    return { content: [{ type: 'text', text: 'designJson 不能为空。' }], isError: true };
  }

  // 1. 读取设计稿 JSON
  const jsonFullPath = resolvePath(projectRoot, designJsonPath);
  if (!existsSync(jsonFullPath)) {
    return { content: [{ type: 'text', text: `设计稿文件不存在: ${jsonFullPath}` }], isError: true };
  }

  let designData: unknown;
  try {
    designData = JSON.parse(readFileSync(jsonFullPath, 'utf-8'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: 'text', text: `读取设计稿 JSON 失败: ${msg}` }], isError: true };
  }

  // 2. 可选：读取截图 → base64 → YOLO 检测
  let yoloData: any = undefined;
  let yoloInfo = '跳过（未提供截图）';

  if (imagePath) {
    const imgFullPath = resolvePath(projectRoot, imagePath);
    if (!existsSync(imgFullPath)) {
      return { content: [{ type: 'text', text: `截图文件不存在: ${imgFullPath}` }], isError: true };
    }
    const ext = extname(imgFullPath).toLowerCase();
    if (!IMAGE_EXTS.has(ext)) {
      return {
        content: [{ type: 'text', text: `不支持的图片格式: ${ext}，支持: ${[...IMAGE_EXTS].join(', ')}` }],
        isError: true,
      };
    }

    try {
      const base64 = readImageAsBase64(imgFullPath);
      yoloData = await detectYolo(base64);
      const predCount = yoloData?.result1?.json?.predictions?.length ?? 0;
      yoloInfo = `检测到 ${predCount} 个组件`;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      yoloInfo = `检测失败（${msg}），回退为纯设计稿模式`;
    }
  }

  // 3. 调用 core.js 生成 ArkUI DSL
  try {
    const result = octoToArkUiDsl(designData, {
      yoloData: yoloData ?? undefined,
      pageName,
      outputFormat: 'json',
      pretty: true,
    });

    if (!result.dsl) {
      return { content: [{ type: 'text', text: '布局引擎未能生成 DSL，设计数据可能格式不正确。' }], isError: true };
    }

    // 4. 写入文件
    const saveName = rawSaveName || basename(jsonFullPath, extname(jsonFullPath));
    const octoDir = join(projectRoot, '.octo');
    if (!existsSync(octoDir)) mkdirSync(octoDir, { recursive: true });

    const outFileName = `${saveName}.arkui-dsl.json`;
    const outPath = join(octoDir, outFileName);
    const jsonStr = result.json ?? JSON.stringify(result.dsl, null, 2);
    writeFileSync(outPath, jsonStr, 'utf-8');

    // 5. 输出摘要
    const nodeCount = result.stats?.remainingNodes ?? 0;
    const lines: string[] = [];
    lines.push('# ArkUI DSL 生成完成\n');
    lines.push('| 项目 | 值 |');
    lines.push('|------|------|');
    lines.push(`| 设计稿 | \`${designJsonPath}\` |`);
    if (imagePath) lines.push(`| 截图 | \`${imagePath}\` |`);
    lines.push(`| YOLO | ${yoloInfo} |`);
    lines.push(`| 页面名称 | ${pageName} |`);
    lines.push(`| 节点数 | ${nodeCount} |`);
    lines.push(`| 输出文件 | \`${outPath}\` |`);
    lines.push(`| 文件大小 | ${formatBytes(Buffer.byteLength(jsonStr, 'utf-8'))} |`);
    lines.push('');
    lines.push('> ArkUI DSL JSON 已保存到 .octo/ 目录，可直接用于 ArkTS 代码生成。');

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { content: [{ type: 'text', text: `DSL 生成失败: ${msg}` }], isError: true };
  }
}
