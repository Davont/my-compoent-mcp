/**
 * get_context_bundle 工具（v3 重构）
 *
 * 聚合工具：根据组件名列表或搜索关键词，一次返回所需的所有上下文。
 * 数据源：.d.ts（Props 接口）+ .md（核心规则）
 *
 * 两种输入方式：
 * - components: 直传组件名列表（精准获取，适合 DSL 场景）
 * - query: 关键词搜索 + 同 category 扩展（模糊获取）
 *
 * 两层输出策略：
 * - depth=summary（默认）：Props 接口 + 核心规则摘要
 * - depth=full：Props 接口 + 核心规则 + 全部示例
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  readComponentDoc,
  parseFrontmatter,
  extractSection,
  extractDescription,
  getComponentList,
  searchComponentsWithCategoryExpansion,
  readAiRules,
} from '../utils/doc-reader.js';
import {
  resolvePackageRoot,
  extractPropsFromDts,
} from '../utils/source-code-reader.js';
import { PACKAGE_NAME, DEFAULT_IMPORT_STYLE } from '../config.js';

// ============ 内存缓存 ============

interface CacheEntry {
  result: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;
const DEFAULT_QUERY_MAX_COMPONENTS = 8;
const MAX_QUERY_MAX_COMPONENTS = 50;

function getCacheKey(components: string[], depth: string): string {
  return `${[...components].sort().join(',')}|${depth}`;
}

function getFromCache(key: string): string | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: string): void {
  cache.set(key, { result, timestamp: Date.now() });
}

// ============ 组件上下文构建 ============

interface ComponentContext {
  name: string;
  importStatement: string;
  propsInterface: string | null;
  propsFromMd: string | null;
  rules: string | null;
  description: string;
  examples: string | null;
}

function getPackageRoot(): string | null {
  try {
    return resolvePackageRoot();
  } catch {
    return null;
  }
}

function buildComponentContext(name: string, depth: string, packageRoot: string | null): ComponentContext {
  const doc = readComponentDoc(name);
  let importStatement = DEFAULT_IMPORT_STYLE === 'named'
    ? `import { ${name} } from '${PACKAGE_NAME}';`
    : `import ${name} from '${PACKAGE_NAME}/${name}';`;
  let description = '';
  let rules: string | null = null;
  let propsFromMd: string | null = null;
  let examples: string | null = null;

  if (doc) {
    const { frontmatter, body } = parseFrontmatter(doc);
    if (frontmatter?.import) {
      // 按文档原样返回 import，避免工具层改写导致与组件库真实导出方式不一致。
      importStatement = frontmatter.import.trim();
    }
    description = extractDescription(body);
    rules = extractSection(body, '核心规则（AI 生成时必读）');
    propsFromMd = extractSection(body, 'Props');

    if (depth === 'full') {
      examples = extractSection(body, 'Examples');
    }
  }

  let propsInterface: string | null = null;
  if (packageRoot) {
    propsInterface = extractPropsFromDts(packageRoot, name);
  }

  return {
    name,
    importStatement,
    propsInterface,
    propsFromMd,
    rules,
    description,
    examples,
  };
}

function collectRecommendedImports(
  components: Array<{ importStatement: string }>
): string[] {
  const namedImportsByModule = new Map<string, Set<string>>();
  const otherImports: string[] = [];
  const seenOther = new Set<string>();

  for (const c of components) {
    const raw = c.importStatement?.trim();
    if (!raw) continue;

    const normalized = raw.endsWith(';') ? raw : `${raw};`;
    const namedImportMatch = normalized.match(
      /^import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]\s*;?$/
    );

    if (namedImportMatch) {
      const members = namedImportMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const moduleName = namedImportMatch[2];

      if (!namedImportsByModule.has(moduleName)) {
        namedImportsByModule.set(moduleName, new Set<string>());
      }
      const memberSet = namedImportsByModule.get(moduleName)!;
      for (const member of members) {
        memberSet.add(member);
      }
      continue;
    }

    if (!seenOther.has(normalized)) {
      seenOther.add(normalized);
      otherImports.push(normalized);
    }
  }

  const mergedNamedImports: string[] = [];
  for (const [moduleName, memberSet] of namedImportsByModule.entries()) {
    const members = Array.from(memberSet).sort().join(', ');
    mergedNamedImports.push(`import { ${members} } from '${moduleName}';`);
  }

  return [...mergedNamedImports, ...otherImports];
}

// ============ 输出格式化 ============

function formatOutput(
  components: ComponentContext[],
  notFound: string[],
  truncated: boolean,
  depth: string,
  maxComponents: number
): string {
  const lines: string[] = [];
  const recommendedImports = collectRecommendedImports(components);

  lines.push(`# 组件上下文（共 ${components.length} 个组件）\n`);

  const aiRules = readAiRules();
  if (aiRules) {
    lines.push('## 通用规则（必须遵守）\n');
    lines.push(aiRules);
    lines.push('');
  }

  if (recommendedImports.length > 0) {
    lines.push('## Imports（必须原样使用，禁止修改导入方式）\n');
    lines.push('```ts');
    lines.push(...recommendedImports);
    lines.push('```');
    lines.push('');
    lines.push('> **⚠️ 严格要求：必须使用上方提供的 import 语句，禁止自行更改导入路径或导入方式。**\n');
  }

  for (const c of components) {
    lines.push(`## ${c.name}`);
    if (c.description) lines.push(c.description);
    lines.push(`\`${c.importStatement}\`\n`);

    if (c.propsInterface) {
      lines.push('### Props\n');
      lines.push('```typescript');
      lines.push(c.propsInterface);
      lines.push('```\n');
    } else if (c.propsFromMd) {
      lines.push('### Props\n');
      lines.push(c.propsFromMd);
      lines.push('');
    }

    if (c.rules) {
      lines.push('### 核心规则\n');
      lines.push(c.rules);
      lines.push('');
    }

    if (depth === 'full' && c.examples) {
      lines.push('### 示例\n');
      lines.push(c.examples);
      lines.push('');
    }
  }

  // checklist：从各组件核心规则中自动提取
  const checklistItems: string[] = [];
  for (const c of components) {
    if (c.rules) {
      const ruleLines = c.rules
        .split('\n')
        .filter(l => l.trim().startsWith('-'))
        .slice(0, 3);
      checklistItems.push(...ruleLines);
    }
  }
  checklistItems.unshift('- import 语句与上方提供的完全一致，未自行修改导入方式');
  lines.push('## Checklist（自动生成）\n');
  for (const item of checklistItems) {
    const text = item.trim().replace(/^-\s*/, '');
    lines.push(`- [ ] ${text}`);
  }
  lines.push('');

  if (notFound.length > 0) {
    const allComponents = getComponentList();
    const available = allComponents.map(c => c.name).join(', ');
    lines.push(`---\n> 未找到组件: ${notFound.join(', ')}。可用组件: ${available}`);
  }

  if (truncated) {
    lines.push(`---\n> 结果已截断（最多 ${maxComponents} 个组件）。使用 \`components\` 参数精确指定需要的组件。`);
  }

  return lines.join('\n');
}

// ============ 工具定义 ============

export const getContextBundleTool: Tool = {
  name: 'get_context_bundle',
  description:
    '聚合工具：一次返回多个组件的完整上下文（Props 接口、核心规则、示例）。\n' +
    '替代多次单独调用 component_details / theme_tokens。\n\n' +
    '⚠️ 禁止在设计稿场景中首先调用本工具。当用户提到 .octo、设计稿、Figma 时，必须先调用 design_to_code 获取设计稿数据，design_to_code 已内置组件识别。本工具仅用于 design_to_code 之后补充组件信息。\n\n' +
    '两种使用方式：\n' +
    '- components: 传组件名列表，精准获取（如 ["Button", "Input"]）\n' +
    '- query: 传关键词搜索，自动匹配相关组件（如 "表单"）',
  inputSchema: {
    type: 'object',
    properties: {
      components: {
        type: 'array',
        items: { type: 'string' },
        description: '组件名列表，如 ["Button", "Input", "Select"]。直接获取指定组件的上下文。',
      },
      query: {
        type: 'string',
        description: '搜索关键词，如 "表单"、"弹窗"。自动匹配相关组件并返回上下文。',
      },
      maxComponents: {
        type: 'integer',
        description:
          `query 模式的最大返回组件数（可配置）。默认 ${DEFAULT_QUERY_MAX_COMPONENTS}，最大 ${MAX_QUERY_MAX_COMPONENTS}。`,
      },
      depth: {
        type: 'string',
        description:
          '输出详细程度：summary（默认，Props + 核心规则）、full（额外包含全部示例代码）。',
      },
    },
  },
};

// ============ 工具处理器 ============

export async function handleGetContextBundle(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const rawComponents = args?.components;
  const components = Array.isArray(rawComponents)
    ? rawComponents.filter((item): item is string => typeof item === 'string')
    : undefined;
  const query = typeof args?.query === 'string' ? args.query : undefined;
  const depth = ((args?.depth as string) ?? 'summary').toLowerCase().trim();
  const rawMaxComponents = args?.maxComponents;

  if ((!components || components.length === 0) && !query) {
    return {
      content: [{ type: 'text', text: '请提供 components（组件名列表）或 query（搜索关键词）参数' }],
      isError: true,
    };
  }

  if (components && components.length > 0 && rawMaxComponents !== undefined) {
    return {
      content: [{
        type: 'text',
        text: 'maxComponents 仅在 query 模式生效；传了 components 时请移除 maxComponents',
      }],
      isError: true,
    };
  }

  try {
    let targetNames: string[];
    let notFound: string[] = [];
    let truncated = false;
    let maxComponents = DEFAULT_QUERY_MAX_COMPONENTS;

    if (components && components.length > 0) {
      // 路径 A：components 直传
      const allComponents = getComponentList();
      const allNames = new Set(allComponents.map(c => c.name.toLowerCase()));
      const aliasMap = new Map<string, string>();
      for (const c of allComponents) {
        if (c.aliases) {
          for (const alias of c.aliases) {
            aliasMap.set(alias.toLowerCase(), c.name);
          }
        }
      }

      targetNames = [];
      for (const name of components) {
        const lower = name.toLowerCase();
        if (allNames.has(lower)) {
          const found = allComponents.find(c => c.name.toLowerCase() === lower);
          if (found) targetNames.push(found.name);
        } else if (aliasMap.has(lower)) {
          targetNames.push(aliasMap.get(lower)!);
        } else {
          notFound.push(name);
        }
      }

      targetNames = [...new Set(targetNames)];

      if (targetNames.length === 0) {
        const available = allComponents.map(c => c.name).join(', ');
        return {
          content: [{
            type: 'text',
            text: `未找到任何指定组件。可用组件: ${available}`,
          }],
          isError: true,
        };
      }
    } else {
      // 路径 B：query 搜索
      if (rawMaxComponents !== undefined) {
        if (typeof rawMaxComponents !== 'number' || !Number.isInteger(rawMaxComponents)) {
          return {
            content: [{
              type: 'text',
              text: 'maxComponents 必须是整数（仅 query 模式生效）',
            }],
            isError: true,
          };
        }
        if (rawMaxComponents < 1 || rawMaxComponents > MAX_QUERY_MAX_COMPONENTS) {
          return {
            content: [{
              type: 'text',
              text: `maxComponents 必须在 1 到 ${MAX_QUERY_MAX_COMPONENTS} 之间`,
            }],
            isError: true,
          };
        }
        maxComponents = rawMaxComponents;
      }

      const searchResult = searchComponentsWithCategoryExpansion(query!, maxComponents);
      if (searchResult.results.length === 0) {
        const allComponents = getComponentList();
        const available = allComponents.map(c => c.name).join(', ');
        return {
          content: [{
            type: 'text',
            text: `未找到与 "${query}" 相关的组件。可用组件: ${available}。建议使用 components 参数直接指定。`,
          }],
          isError: true,
        };
      }
      targetNames = searchResult.results.map(r => r.name);
      truncated = searchResult.truncated;
    }

    // 缓存 key：components 路径排序（顺序无关），query 路径用 query 本身
    const baseKey = query && (!components || components.length === 0)
      ? `q:${query}|${depth}|max:${maxComponents}`
      : getCacheKey(targetNames, depth);
    const cacheKey = baseKey +
      (notFound.length > 0 ? `|nf:${notFound.join(',')}` : '') +
      (truncated ? '|trunc' : '');
    const cached = getFromCache(cacheKey);
    if (cached) {
      return {
        content: [{ type: 'text', text: cached }],
      };
    }

    // 构建上下文
    const packageRoot = getPackageRoot();
    const contexts = targetNames.map(name =>
      buildComponentContext(name, depth, packageRoot)
    );

    const output = formatOutput(contexts, notFound, truncated, depth, maxComponents);
    setCache(cacheKey, output);

    return {
      content: [{ type: 'text', text: output }],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `get_context_bundle 失败: ${msg}` }],
      isError: true,
    };
  }
}
