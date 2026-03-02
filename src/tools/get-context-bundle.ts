/**
 * get_context_bundle 工具
 *
 * 聚合工具：根据用户意图（goal + uiType）一次返回所需的所有上下文。
 * 服务端内部编排 search/details/examples/tokens 逻辑，对 AI 只暴露一次调用。
 *
 * 两层输出策略：
 * - depth=summary（默认）：精简结论，减少 token 消耗
 * - depth=full：完整内容，包含 props 表格和全部示例代码
 */

import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  searchComponents,
  readComponentDoc,
  parseFrontmatter,
  extractSection,
  extractDescription,
  extractPropNames,
  readTokens,
} from '../utils/doc-reader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============ Profile 类型 ============

interface Profile {
  uiType: string;
  description: string;
  components: string[];
  tokenTypes: string[];
  defaultSections: string[];
  checklist: string[];
  hint: string;
}

// ============ 内存缓存 ============

interface CacheEntry {
  result: string;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 分钟

function getCacheKey(uiType: string, depth: string): string {
  // goal/constraints 不参与 profile 内容构建，不纳入 key
  return `${uiType}|${depth}`;
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

// ============ Profile 加载 ============

/**
 * 获取 doc/profiles/ 目录路径
 * 与 doc-reader 的 getDocPath 策略一致：
 *   打包产物 dist/*.js → __dirname = dist/ → ../doc/profiles
 *   源码运行 src/tools/*.ts → __dirname = src/tools/ → ../../doc/profiles
 */
function getProfilesDir(): string {
  const candidates = [
    join(__dirname, '../doc/profiles'),
    join(__dirname, '../../doc/profiles'),
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  // 兜底：返回第一个候选，loadProfile 内部会做 existsSync 判断
  return candidates[0];
}

const AVAILABLE_UI_TYPES = ['form', 'table', 'modal'];

function loadProfile(uiType: string): Profile | null {
  const profilePath = join(getProfilesDir(), `${uiType}.json`);
  if (!existsSync(profilePath)) return null;
  return JSON.parse(readFileSync(profilePath, 'utf-8')) as Profile;
}

// ============ 内部编排逻辑 ============

interface ComponentSummary {
  name: string;
  description: string;
  importStatement: string;
  propNames: string[];
  rules: string | null;
  firstExample: string | null;
}

interface ComponentFull extends ComponentSummary {
  props: string | null;
  allExamples: string | null;
}

function buildComponentSummary(name: string): ComponentSummary {
  const doc = readComponentDoc(name);
  if (!doc) {
    return {
      name,
      description: '文档暂未收录',
      importStatement: '',
      propNames: [],
      rules: null,
      firstExample: null,
    };
  }

  const { frontmatter, body } = parseFrontmatter(doc);
  const description = extractDescription(body);
  const importStatement = frontmatter?.import ?? '';

  const propsSection = extractSection(body, 'Props');
  const propNames = propsSection ? extractPropNames(propsSection) : [];

  const rulesSection = extractSection(body, '核心规则（AI 生成时必读）');

  // 只取第一个示例
  const examplesSection = extractSection(body, 'Examples');
  let firstExample: string | null = null;
  if (examplesSection) {
    const firstMatch = examplesSection.match(/### .+?\n[\s\S]*?(?=\n### |$)/);
    if (firstMatch) {
      firstExample = firstMatch[0].trim();
    }
  }

  return {
    name,
    description,
    importStatement,
    propNames,
    rules: rulesSection,
    firstExample,
  };
}

function buildComponentFull(name: string): ComponentFull {
  const summary = buildComponentSummary(name);
  const doc = readComponentDoc(name);

  if (!doc) {
    return { ...summary, props: null, allExamples: null };
  }

  const { body } = parseFrontmatter(doc);
  const props = extractSection(body, 'Props');
  const allExamples = extractSection(body, 'Examples');

  return { ...summary, props, allExamples };
}

function buildTokenSummary(tokenTypes: string[]): string {
  try {
    const tokensData = readTokens();
    const filtered = tokenTypes.includes('all')
      ? tokensData.tokens
      : tokensData.tokens.filter(t => tokenTypes.includes(t.type.toLowerCase()));

    if (filtered.length === 0) return '';

    const lines = ['**相关 Tokens**（使用 CSS 变量，勿硬编码）：'];
    for (const t of filtered.slice(0, 20)) {
      lines.push(`- \`${t.name}\` — ${t.description}（默认: \`${t.default}\`）`);
    }
    if (filtered.length > 20) {
      lines.push(`- ... 共 ${filtered.length} 个，使用 theme_tokens 工具获取完整列表`);
    }
    return lines.join('\n');
  } catch {
    return '';
  }
}

// ============ 输出格式化 ============

function formatSummary(profile: Profile, components: ComponentSummary[], tokenSummary: string): string {
  const lines: string[] = [];

  lines.push(`# ${profile.uiType} 场景上下文（summary）\n`);
  lines.push(`**场景说明**：${profile.description}\n`);

  lines.push('## 推荐组件\n');
  for (const c of components) {
    lines.push(`### ${c.name}`);
    if (c.description) lines.push(c.description);
    if (c.importStatement) lines.push(`\`${c.importStatement}\``);
    if (c.propNames.length > 0) {
      lines.push(`**关键 Props**：${c.propNames.slice(0, 8).join('、')}${c.propNames.length > 8 ? '...' : ''}`);
    }
    if (c.rules) {
      lines.push('\n**核心规则**：');
      const ruleLines = c.rules.split('\n').filter(l => l.trim().startsWith('-')).slice(0, 5);
      lines.push(ruleLines.join('\n'));
    }
    lines.push('');
  }

  if (tokenSummary) {
    lines.push('## Design Tokens\n');
    lines.push(tokenSummary);
    lines.push('');
  }

  lines.push('## 实现 Checklist\n');
  for (const item of profile.checklist) {
    lines.push(`- [ ] ${item}`);
  }
  lines.push('');

  if (profile.hint) {
    lines.push(`> **实现建议**：${profile.hint}`);
    lines.push('');
  }

  lines.push('---');
  lines.push('> 需要完整 Props 表格或全部示例？再次调用 `get_context_bundle` 并传入 `depth="full"`');

  return lines.join('\n');
}

function formatFull(profile: Profile, components: ComponentFull[], tokenSummary: string): string {
  const lines: string[] = [];

  lines.push(`# ${profile.uiType} 场景上下文（full）\n`);
  lines.push(`**场景说明**：${profile.description}\n`);

  for (const c of components) {
    lines.push(`## ${c.name} 组件\n`);
    if (c.description) lines.push(`${c.description}\n`);
    if (c.importStatement) lines.push(`**引入**：\`${c.importStatement}\`\n`);

    if (c.rules) {
      lines.push('### 核心规则\n');
      lines.push(c.rules);
      lines.push('');
    }

    if (c.props) {
      lines.push('### Props\n');
      lines.push(c.props);
      lines.push('');
    }

    // fix: 使用 allExamples 而非 firstExample
    if (c.allExamples) {
      lines.push('### 示例\n');
      lines.push(c.allExamples);
      lines.push('');
    }
  }

  if (tokenSummary) {
    lines.push('## Design Tokens\n');
    lines.push(tokenSummary);
    lines.push('');
  }

  lines.push('## 实现 Checklist\n');
  for (const item of profile.checklist) {
    lines.push(`- [ ] ${item}`);
  }
  lines.push('');

  if (profile.hint) {
    lines.push(`> **实现建议**：${profile.hint}`);
  }

  return lines.join('\n');
}

function formatUiTypeUnknown(goal: string): string {
  const lines: string[] = [];
  lines.push('## 需要补充参数：uiType\n');
  lines.push(`收到需求：「${goal}」\n`);
  lines.push('请从以下场景类型中选择一个，重新调用 `get_context_bundle` 并传入 `uiType`：\n');

  for (const uiType of AVAILABLE_UI_TYPES) {
    const profile = loadProfile(uiType);
    if (profile) {
      lines.push(`- **${uiType}** — ${profile.description}`);
    }
  }

  lines.push('');
  lines.push('> 如果没有合适的类型，传入 `uiType="other"`，将根据 goal 关键词搜索相关组件。');
  return lines.join('\n');
}

function formatOtherGoal(goal: string): string {
  const results = searchComponents(goal);
  const lines: string[] = [];

  lines.push(`# 通用场景上下文：「${goal}」\n`);

  if (results.length === 0) {
    lines.push('未找到相关组件。建议使用 `component_search` 工具进行更精确的搜索。');
    return lines.join('\n');
  }

  lines.push(`根据需求找到 ${results.length} 个相关组件：\n`);
  for (const c of results) {
    const summary = buildComponentSummary(c.name);
    lines.push(`## ${c.name}`);
    if (summary.description) lines.push(summary.description);
    if (summary.importStatement) lines.push(`\`${summary.importStatement}\``);
    if (summary.propNames.length > 0) {
      lines.push(`**Props**：${summary.propNames.slice(0, 6).join('、')}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ============ 工具定义 ============

export const getContextBundleTool: Tool = {
  name: 'get_context_bundle',
  description:
    '聚合工具：根据用户需求一次返回所需的所有组件上下文（推荐组件、关键 Props、核心规则、示例、Token、实现 Checklist）。\n' +
    '替代多次单独调用 component_search / component_details / theme_tokens。\n\n' +
    '【输出策略】\n' +
    '- uiType=form/table/modal：走模板化稳定输出，不同 goal 返回相同的场景上下文（设计如此，保证稳定性）。\n' +
    '- uiType=other：按 goal 关键词语义检索，返回匹配组件的上下文。\n\n' +
    '推荐在生成页面代码前优先调用此工具。',
  inputSchema: {
    type: 'object',
    properties: {
      goal: {
        type: 'string',
        description: '用自然语言描述需求，如"生成用户信息编辑表单"、"做一个带筛选的数据列表页"。',
      },
      uiType: {
        type: 'string',
        description:
          '场景类型，枚举值：form（表单）、table（表格列表）、modal（弹窗）、other（其他，按 goal 搜索）。' +
          '不传或传错时，工具会返回候选类型列表要求补充。',
      },
      depth: {
        type: 'string',
        description:
          '输出详细程度：summary（默认，精简摘要）、full（完整 Props 表格 + 全部示例代码）。',
      },
    },
    required: ['goal'],
  },
};

// ============ 工具处理器 ============

export async function handleGetContextBundle(
  args: Record<string, unknown>
): Promise<CallToolResult> {
  const goal = (args?.goal as string) ?? '';
  const uiType = ((args?.uiType as string) ?? '').toLowerCase().trim();
  const depth = ((args?.depth as string) ?? 'summary').toLowerCase().trim();

  if (!goal) {
    return {
      content: [{ type: 'text', text: '请提供 goal 参数描述你的需求' }],
      isError: true,
    };
  }

  try {
    // uiType 未传或不在已知列表且不是 other → 返回候选列表
    if (!uiType || (!AVAILABLE_UI_TYPES.includes(uiType) && uiType !== 'other')) {
      return {
        content: [{ type: 'text', text: formatUiTypeUnknown(goal) }],
      };
    }

    // uiType=other → 按 goal 搜索组件
    if (uiType === 'other') {
      return {
        content: [{ type: 'text', text: formatOtherGoal(goal) }],
      };
    }

    // 检查缓存（key 只用 uiType + depth，profile 内容与 goal 无关）
    const cacheKey = getCacheKey(uiType, depth);
    const cached = getFromCache(cacheKey);
    if (cached) {
      return {
        content: [{ type: 'text', text: `[缓存命中]\n\n${cached}` }],
      };
    }

    // 加载 profile
    const profile = loadProfile(uiType);
    if (!profile) {
      return {
        content: [
          {
            type: 'text',
            text: `未找到场景配置 "${uiType}"。可用类型：${AVAILABLE_UI_TYPES.join('、')}`,
          },
        ],
        isError: true,
      };
    }

    const tokenSummary = buildTokenSummary(profile.tokenTypes);

    let output: string;
    if (depth === 'full') {
      const components = profile.components.map(buildComponentFull);
      output = formatFull(profile, components, tokenSummary);
    } else {
      const components = profile.components.map(buildComponentSummary);
      output = formatSummary(profile, components, tokenSummary);
    }

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
