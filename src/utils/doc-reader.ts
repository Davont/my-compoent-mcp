/**
 * doc/ 目录读取工具
 * 
 * 读取随 MCP Server 包发布的 doc/ 目录中的数据
 */

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 获取 doc/ 目录的路径
 * 支持开发环境和生产环境
 */
function getDocPath(): string {
  // 尝试多种路径（rslib 打包会内联代码，__dirname 可能指向不同位置）
  const possiblePaths = [
    // 打包后内联到 dist/*.js: dist/ -> ../doc
    join(__dirname, '../doc'),
    // 打包后作为单独文件 dist/utils/doc-reader.js: dist/utils/ -> ../../doc
    join(__dirname, '../../doc'),
    // 开发环境 src/utils/doc-reader.ts -> ../../doc
    join(__dirname, '../../doc'),
  ];
  
  for (const p of possiblePaths) {
    if (existsSync(p)) {
      return p;
    }
  }
  
  throw new Error(`doc/ 目录不存在，已尝试路径: ${possiblePaths.join(', ')}`);
}

// ============ 类型定义 ============

/** 组件索引条目 */
export interface ComponentIndexEntry {
  name: string;
  aliases?: string[];
  category: string;
  status: 'stable' | 'beta' | 'deprecated';
  keywords?: string[];
  docPath: string;
  figma?: string;
  tokens?: string[];
  since?: string;
}

/** 规范索引条目 */
export interface GuidelineIndexEntry {
  name: string;
  title: string;
  docPath: string;
}

/** 索引文件结构 */
export interface DocIndex {
  schemaVersion: string;
  generatedAt: string;
  components: ComponentIndexEntry[];
  guidelines: GuidelineIndexEntry[];
}

/** 组件文档 frontmatter */
export interface ComponentFrontmatter {
  name: string;
  import?: string;
  category: string;
  status: string;
  since?: string;
  aliases?: string[];
  keywords?: string[];
  figma?: string;
  tokens?: string[];
  source?: string;
}

/** Token 定义 */
export interface TokenDefinition {
  name: string;
  type: string;
  description: string;
  default: string;
}

/** Tokens 文件结构 */
export interface TokensFile {
  schemaVersion: string;
  tokens: TokenDefinition[];
}

/** 主题文件结构 */
export interface ThemesFile {
  schemaVersion: string;
  themes: Array<{
    name: string;
    tokens: Record<string, string>;
  }>;
}

/** 示例条目 */
export interface ExampleEntry {
  name: string;
  description: string;
  content: string;
}

// ============ 上下文控量工具函数 ============

/** 大文档阈值（行数） */
const LARGE_DOC_THRESHOLD = 500;

/** Markdown 代码块正则 */
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;

/**
 * 从 Examples 章节中解析出所有示例条目
 * 按 ### 三级标题拆分，每个子标题为一个示例
 */
export function parseExamples(examplesContent: string): ExampleEntry[] {
  const examples: ExampleEntry[] = [];
  const parts = examplesContent.split(/(?=^### )/m);

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed.startsWith('### ')) continue;

    const titleMatch = trimmed.match(/^### (.+)/);
    if (!titleMatch) continue;

    const name = titleMatch[1].trim();
    const body = trimmed.slice(titleMatch[0].length).trim();

    // 第一行非空且非代码块的行作为描述
    const lines = body.split('\n');
    const description = lines.find(l => l.trim().length > 0 && !l.trim().startsWith('```'))?.trim() || '';

    examples.push({
      name,
      description,
      content: body,
    });
  }

  return examples;
}

/**
 * 提取文档中所有代码块
 */
export function extractCodeBlocks(content: string): string[] {
  return content.match(CODE_BLOCK_REGEX) || [];
}

/**
 * 将大文档中的代码块替换为编号占位符
 * 配合 get_code_block 工具使用
 */
export function replaceCodeBlocksWithPlaceholders(
  content: string,
  componentName: string
): string {
  let index = 0;
  return content.replace(CODE_BLOCK_REGEX, () => {
    index++;
    return `\`\`\`text\n[代码块 #${index} 已隐藏]\n使用 get_code_block 工具查看，参数: componentName="${componentName}", codeBlockIndex=${index}\n\`\`\``;
  });
}

/**
 * 判断文档是否为大文档（超过阈值行数）
 */
export function isLargeDocument(content: string): boolean {
  return content.split('\n').length > LARGE_DOC_THRESHOLD;
}

/**
 * 从 Props Markdown 表格中过滤出指定属性
 */
export function filterProps(propsContent: string, propNames: string[]): string {
  const lines = propsContent.split('\n');
  const result: string[] = [];
  const lowerPropNames = propNames.map(p => p.toLowerCase());

  for (const line of lines) {
    // 保留表头和分隔行
    if (line.match(/^\|\s*Prop\s*\|/) || line.match(/^\|[-:\s|]+\|$/)) {
      result.push(line);
      continue;
    }

    // 检查该行是否包含目标属性名
    const propMatch = line.match(/^\|\s*(\w+)\s*\|/);
    if (propMatch && lowerPropNames.includes(propMatch[1].toLowerCase())) {
      result.push(line);
    }
  }

  if (result.length <= 2) {
    return `未找到指定的 Props: ${propNames.join(', ')}`;
  }

  return result.join('\n');
}

/**
 * 从文档内容中提取组件描述（# 标题后的第一段）
 */
export function extractDescription(body: string): string {
  const lines = body.split('\n');
  const descLines: string[] = [];
  let started = false;

  for (const line of lines) {
    const trimmed = line.trim();
    // 跳过标题行
    if (trimmed.startsWith('# ')) continue;
    // 遇到 --- 或 ## 停止
    if (trimmed === '---' || trimmed.startsWith('## ')) break;

    if (trimmed.length > 0) started = true;
    if (started) {
      if (trimmed.length === 0 && descLines.length > 0) break;
      descLines.push(trimmed);
    }
  }

  return descLines.join(' ');
}

/**
 * 从 Props 表格中提取所有属性名列表
 */
export function extractPropNames(propsContent: string): string[] {
  const lines = propsContent.split('\n');
  const names: string[] = [];

  for (const line of lines) {
    // 跳过表头和分隔行
    if (line.match(/^\|\s*Prop\s*\|/) || line.match(/^\|[-:\s|]+\|$/)) continue;

    const propMatch = line.match(/^\|\s*(\w+)\s*\|/);
    if (propMatch) {
      names.push(propMatch[1]);
    }
  }

  return names;
}

// ============ 读取函数 ============

/**
 * 读取 index.json 索引文件
 */
export function readDocIndex(): DocIndex {
  const docPath = getDocPath();
  const indexPath = join(docPath, 'index.json');
  
  if (!existsSync(indexPath)) {
    throw new Error('index.json 不存在');
  }
  
  const content = readFileSync(indexPath, 'utf-8');
  return JSON.parse(content) as DocIndex;
}

/**
 * 读取组件文档
 * @param componentName - 组件名称（如 Button）
 * @returns 文档内容（Markdown 格式）
 */
export function readComponentDoc(componentName: string): string | null {
  const docPath = getDocPath();
  const index = readDocIndex();
  
  // 查找组件（支持别名）
  const component = index.components.find(c => 
    c.name.toLowerCase() === componentName.toLowerCase() ||
    c.aliases?.some(a => a.toLowerCase() === componentName.toLowerCase())
  );
  
  if (!component) {
    return null;
  }
  
  const filePath = join(docPath, component.docPath);
  if (!existsSync(filePath)) {
    return null;
  }
  
  return readFileSync(filePath, 'utf-8');
}

/**
 * 解析组件文档的 frontmatter
 * @param content - Markdown 内容
 */
export function parseFrontmatter(content: string): { frontmatter: ComponentFrontmatter | null; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  
  if (!match) {
    return { frontmatter: null, body: content };
  }
  
  const yamlContent = match[1];
  const body = match[2];
  
  // 简单的 YAML 解析（仅支持基本格式）
  const frontmatter: Record<string, any> = {};
  const lines = yamlContent.split('\n');
  
  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = line.slice(0, colonIndex).trim();
    let value = line.slice(colonIndex + 1).trim();
    
    // 处理数组格式 [a, b, c]
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value.slice(1, -1);
      frontmatter[key] = value.split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    }
    // 处理引号字符串
    else if (value.startsWith('"') && value.endsWith('"')) {
      frontmatter[key] = value.slice(1, -1);
    }
    else {
      frontmatter[key] = value;
    }
  }
  
  return { frontmatter: frontmatter as ComponentFrontmatter, body };
}

/**
 * 提取组件文档的指定章节
 * @param content - Markdown 内容
 * @param sectionName - 章节名称（如 "Props"、"Examples"）
 */
export function extractSection(content: string, sectionName: string): string | null {
  // 匹配 ## sectionName 开始，到下一个 ## 或文档结尾
  const regex = new RegExp(`## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(regex);
  
  if (!match) {
    return null;
  }
  
  return match[1].trim();
}

/**
 * 读取 tokens.json
 */
export function readTokens(): TokensFile {
  const docPath = getDocPath();
  const tokensPath = join(docPath, 'tokens/tokens.json');
  
  if (!existsSync(tokensPath)) {
    throw new Error('tokens/tokens.json 不存在');
  }
  
  const content = readFileSync(tokensPath, 'utf-8');
  return JSON.parse(content) as TokensFile;
}

/**
 * 读取 themes.json
 */
export function readThemes(): ThemesFile {
  const docPath = getDocPath();
  const themesPath = join(docPath, 'tokens/themes.json');
  
  if (!existsSync(themesPath)) {
    throw new Error('tokens/themes.json 不存在');
  }
  
  const content = readFileSync(themesPath, 'utf-8');
  return JSON.parse(content) as ThemesFile;
}

/**
 * 读取规范文档
 * @param guidelineName - 规范名称（如 "layout"、"typography"）
 */
export function readGuidelineDoc(guidelineName: string): string | null {
  const docPath = getDocPath();
  const index = readDocIndex();
  
  const guideline = index.guidelines.find(g => 
    g.name.toLowerCase() === guidelineName.toLowerCase()
  );
  
  if (!guideline) {
    return null;
  }
  
  const filePath = join(docPath, guideline.docPath);
  if (!existsSync(filePath)) {
    return null;
  }
  
  return readFileSync(filePath, 'utf-8');
}

/**
 * 读取 changelog
 */
export function readChangelog(): string | null {
  const docPath = getDocPath();
  const changelogPath = join(docPath, 'changelog/changelog.md');
  
  if (!existsSync(changelogPath)) {
    return null;
  }
  
  return readFileSync(changelogPath, 'utf-8');
}

/**
 * 获取所有组件列表
 */
export function getComponentList(): ComponentIndexEntry[] {
  const index = readDocIndex();
  return index.components;
}

/**
 * 搜索组件
 * @param query - 搜索关键词
 */
export function searchComponents(query: string): ComponentIndexEntry[] {
  const index = readDocIndex();
  const lowerQuery = query.toLowerCase();
  
  return index.components.filter(c => {
    // 搜索组件名
    if (c.name.toLowerCase().includes(lowerQuery)) return true;
    // 搜索别名
    if (c.aliases?.some(a => a.toLowerCase().includes(lowerQuery))) return true;
    // 搜索关键词
    if (c.keywords?.some(k => k.toLowerCase().includes(lowerQuery))) return true;
    // 搜索分类
    if (c.category.toLowerCase().includes(lowerQuery)) return true;
    
    return false;
  });
}
