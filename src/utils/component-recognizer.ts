/**
 * 从原始 Figma JSON 中识别可能对应组件库组件的节点。
 *
 * 直接扫描原始 JSON（不依赖 core.js），
 * 收集 INSTANCE / COMPONENT 节点的 name 并与 doc/index.json 匹配。
 *
 * 支持几种已知的包装结构：
 * - 标准 Figma 节点：{ type: "FRAME", children: [...] }
 * - Figma API 响应：{ document: { children: [...] } }
 * - nodes 包装：{ nodes: { "0:1": { document: ... } } } 或 { nodes: [...] }
 * - 顶层数组：[node1, node2, ...]
 */

import { getComponentList, type ComponentIndexEntry } from './doc-reader.js';

interface FigmaNode {
  type?: string;
  name?: string;
  children?: FigmaNode[];
}

/**
 * 从已知包装结构中提取出真正的 Figma 节点根列表。
 * 只处理有限的几种已知格式，不做任意深度泛化穿透。
 */
export function resolveRoots(json: unknown): FigmaNode[] {
  if (!json || typeof json !== 'object') return [];

  if (Array.isArray(json)) {
    return json.filter((item): item is FigmaNode => item && typeof item === 'object');
  }

  const obj = json as Record<string, unknown>;

  // 标准 Figma 节点（有 type 字段）→ 直接作为根
  if (typeof obj.type === 'string') {
    return [obj as unknown as FigmaNode];
  }

  // Figma API 响应：{ document: { children: [...] } }
  if (obj.document && typeof obj.document === 'object') {
    return resolveRoots(obj.document);
  }

  // nodes 对象包装：{ nodes: { "0:1": { document: ... }, ... } }
  if (obj.nodes && typeof obj.nodes === 'object' && !Array.isArray(obj.nodes)) {
    const roots: FigmaNode[] = [];
    for (const value of Object.values(obj.nodes as Record<string, unknown>)) {
      roots.push(...resolveRoots(value));
    }
    return roots;
  }

  // nodes 数组包装：{ nodes: [node1, node2] }
  if (Array.isArray(obj.nodes)) {
    return resolveRoots(obj.nodes);
  }

  // 有 children 但没有 type（某些中间容器）
  if (Array.isArray(obj.children)) {
    return (obj.children as unknown[]).filter(
      (item): item is FigmaNode => !!item && typeof item === 'object',
    );
  }

  return [];
}

export function extractRecommendedComponents(json: unknown): string[] {
  if (!json || typeof json !== 'object') return [];

  let knownComponents: ComponentIndexEntry[];
  try {
    knownComponents = getComponentList();
  } catch {
    return [];
  }
  if (knownComponents.length === 0) return [];

  const roots = resolveRoots(json);
  if (roots.length === 0) return [];

  const nodeTokens = new Set<string>();
  for (const root of roots) {
    walkFigmaTree(root, (node) => {
      if (node.type !== 'INSTANCE' && node.type !== 'COMPONENT') return;
      const name = node.name || '';
      nodeTokens.add(name.toLowerCase());
      for (const part of name.split(/[\/=,\s·]+/)) {
        const trimmed = part.trim();
        if (trimmed.length > 1) nodeTokens.add(trimmed.toLowerCase());
      }
    });
  }

  if (nodeTokens.size === 0) return [];

  const matched = new Set<string>();
  for (const comp of knownComponents) {
    const nameLower = comp.name.toLowerCase();
    if (nodeTokens.has(nameLower)) { matched.add(comp.name); continue; }
    if (comp.aliases?.some(a => nodeTokens.has(a.toLowerCase()))) { matched.add(comp.name); continue; }
    if (comp.keywords?.some(k => nodeTokens.has(k.toLowerCase()))) { matched.add(comp.name); continue; }
  }

  return Array.from(matched);
}

function walkFigmaTree(node: FigmaNode, cb: (n: FigmaNode) => void): void {
  cb(node);
  if (node.children) {
    for (const child of node.children) walkFigmaTree(child, cb);
  }
}
