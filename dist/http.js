#!/usr/bin/env node
import { createServer } from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { closeSync, existsSync as external_fs_existsSync, openSync, readFileSync as external_fs_readFileSync, readSync, readdirSync, realpathSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join as external_path_join, resolve as external_path_resolve, sep } from "path";
import { parseSync } from "oxc-parser";
const doc_reader_filename = fileURLToPath(import.meta.url);
const doc_reader_dirname = dirname(doc_reader_filename);
function getDocPath() {
    const possiblePaths = [
        external_path_join(doc_reader_dirname, '../doc'),
        external_path_join(doc_reader_dirname, '../../doc'),
        external_path_join(doc_reader_dirname, '../../doc')
    ];
    for (const p of possiblePaths)if (external_fs_existsSync(p)) return p;
    throw new Error(`doc/ 目录不存在，已尝试路径: ${possiblePaths.join(', ')}`);
}
const LARGE_DOC_THRESHOLD = 500;
const CODE_BLOCK_REGEX = /```[\s\S]*?```/g;
function parseExamples(examplesContent) {
    const examples = [];
    const parts = examplesContent.split(/(?=^### )/m);
    for (const part of parts){
        const trimmed = part.trim();
        if (!trimmed.startsWith('### ')) continue;
        const titleMatch = trimmed.match(/^### (.+)/);
        if (!titleMatch) continue;
        const name = titleMatch[1].trim();
        const body = trimmed.slice(titleMatch[0].length).trim();
        const lines = body.split('\n');
        const description = lines.find((l)=>l.trim().length > 0 && !l.trim().startsWith('```'))?.trim() || '';
        examples.push({
            name,
            description,
            content: body
        });
    }
    return examples;
}
function extractCodeBlocks(content) {
    return content.match(CODE_BLOCK_REGEX) || [];
}
function replaceCodeBlocksWithPlaceholders(content, componentName) {
    let index = 0;
    return content.replace(CODE_BLOCK_REGEX, ()=>{
        index++;
        return `\`\`\`text\n[代码块 #${index} 已隐藏]\n使用 get_code_block 工具查看，参数: componentName="${componentName}", codeBlockIndex=${index}\n\`\`\``;
    });
}
function isLargeDocument(content) {
    return content.split('\n').length > LARGE_DOC_THRESHOLD;
}
function filterProps(propsContent, propNames) {
    const lines = propsContent.split('\n');
    const result = [];
    const lowerPropNames = propNames.map((p)=>p.toLowerCase());
    for (const line of lines){
        if (line.match(/^\|\s*Prop\s*\|/) || line.match(/^\|[-:\s|]+\|$/)) {
            result.push(line);
            continue;
        }
        const propMatch = line.match(/^\|\s*(\w+)\s*\|/);
        if (propMatch && lowerPropNames.includes(propMatch[1].toLowerCase())) result.push(line);
    }
    if (result.length <= 2) return `未找到指定的 Props: ${propNames.join(', ')}`;
    return result.join('\n');
}
function extractDescription(body) {
    const lines = body.split('\n');
    const descLines = [];
    let started = false;
    for (const line of lines){
        const trimmed = line.trim();
        if (!trimmed.startsWith('# ')) {
            if ('---' === trimmed || trimmed.startsWith('## ')) break;
            if (trimmed.length > 0) started = true;
            if (started) {
                if (0 === trimmed.length && descLines.length > 0) break;
                descLines.push(trimmed);
            }
        }
    }
    return descLines.join(' ');
}
function extractPropNames(propsContent) {
    const lines = propsContent.split('\n');
    const names = [];
    for (const line of lines){
        if (line.match(/^\|\s*Prop\s*\|/) || line.match(/^\|[-:\s|]+\|$/)) continue;
        const propMatch = line.match(/^\|\s*(\w+)\s*\|/);
        if (propMatch) names.push(propMatch[1]);
    }
    return names;
}
function readDocIndex() {
    const docPath = getDocPath();
    const indexPath = external_path_join(docPath, 'index.json');
    if (!external_fs_existsSync(indexPath)) throw new Error('index.json 不存在');
    const content = external_fs_readFileSync(indexPath, 'utf-8');
    return JSON.parse(content);
}
function readComponentDoc(componentName) {
    const docPath = getDocPath();
    const index = readDocIndex();
    const component = index.components.find((c)=>c.name.toLowerCase() === componentName.toLowerCase() || c.aliases?.some((a)=>a.toLowerCase() === componentName.toLowerCase()));
    if (!component) return null;
    const filePath = external_path_join(docPath, component.docPath);
    if (!external_fs_existsSync(filePath)) return null;
    return external_fs_readFileSync(filePath, 'utf-8');
}
function parseFrontmatter(content) {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return {
        frontmatter: null,
        body: content
    };
    const yamlContent = match[1];
    const body = match[2];
    const frontmatter = {};
    const lines = yamlContent.split('\n');
    for (const line of lines){
        const colonIndex = line.indexOf(':');
        if (-1 === colonIndex) continue;
        const key = line.slice(0, colonIndex).trim();
        let value = line.slice(colonIndex + 1).trim();
        if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1);
            frontmatter[key] = value.split(',').map((s)=>s.trim().replace(/^["']|["']$/g, ''));
        } else if (value.startsWith('"') && value.endsWith('"')) frontmatter[key] = value.slice(1, -1);
        else frontmatter[key] = value;
    }
    return {
        frontmatter: frontmatter,
        body
    };
}
function extractSection(content, sectionName) {
    const regex = new RegExp(`## ${sectionName}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
    const match = content.match(regex);
    if (!match) return null;
    return match[1].trim();
}
function readTokens() {
    const docPath = getDocPath();
    const tokensPath = external_path_join(docPath, 'tokens/tokens.json');
    if (!external_fs_existsSync(tokensPath)) throw new Error('tokens/tokens.json 不存在');
    const content = external_fs_readFileSync(tokensPath, 'utf-8');
    return JSON.parse(content);
}
function readThemes() {
    const docPath = getDocPath();
    const themesPath = external_path_join(docPath, 'tokens/themes.json');
    if (!external_fs_existsSync(themesPath)) throw new Error('tokens/themes.json 不存在');
    const content = external_fs_readFileSync(themesPath, 'utf-8');
    return JSON.parse(content);
}
function readChangelog() {
    const docPath = getDocPath();
    const changelogPath = external_path_join(docPath, 'changelog/changelog.md');
    if (!external_fs_existsSync(changelogPath)) return null;
    return external_fs_readFileSync(changelogPath, 'utf-8');
}
function getComponentList() {
    const index = readDocIndex();
    return index.components;
}
function searchComponents(query) {
    const index = readDocIndex();
    const lowerQuery = query.toLowerCase();
    return index.components.filter((c)=>{
        if (c.name.toLowerCase().includes(lowerQuery)) return true;
        if (c.aliases?.some((a)=>a.toLowerCase().includes(lowerQuery))) return true;
        if (c.keywords?.some((k)=>k.toLowerCase().includes(lowerQuery))) return true;
        if (c.category.toLowerCase().includes(lowerQuery)) return true;
        return false;
    });
}
const componentListTool = {
    name: 'component_list',
    description: '获取 my-design 组件库的组件列表。返回所有可用组件及其分类、状态等元信息。',
    inputSchema: {
        type: 'object',
        properties: {
            category: {
                type: 'string',
                description: '按分类过滤组件。可选值：form（表单）、data（数据展示）、feedback（反馈）、layout（布局）、navigation（导航）、general（通用）'
            },
            status: {
                type: 'string',
                description: '按状态过滤组件。可选值：stable（稳定）、beta（测试）、deprecated（已弃用）'
            }
        },
        required: []
    }
};
function formatComponentList(components) {
    if (0 === components.length) return '未找到符合条件的组件';
    const grouped = components.reduce((acc, c)=>{
        if (!acc[c.category]) acc[c.category] = [];
        acc[c.category].push(c);
        return acc;
    }, {});
    const lines = [];
    lines.push(`my-design 组件列表（共 ${components.length} 个组件）\n`);
    for (const [category, comps] of Object.entries(grouped)){
        lines.push(`## ${category}（${comps.length} 个）\n`);
        for (const c of comps){
            const status = 'stable' !== c.status ? ` [${c.status}]` : '';
            const aliases = c.aliases?.length ? ` (别名: ${c.aliases.join(', ')})` : '';
            lines.push(`- **${c.name}**${status}${aliases}`);
        }
        lines.push('');
    }
    return lines.join('\n');
}
async function handleComponentList(args) {
    const category = args?.category;
    const status = args?.status;
    try {
        let components = getComponentList();
        if (category) components = components.filter((c)=>c.category.toLowerCase() === category.toLowerCase());
        if (status) components = components.filter((c)=>c.status === status);
        const output = formatComponentList(components);
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `获取组件列表失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
const componentSearchTool = {
    name: 'component_search',
    description: '搜索 my-design 组件库的组件。支持按组件名、别名、关键词、分类进行模糊搜索。适用于：1) 不确定组件名称时进行探索；2) 根据需求找到合适的组件；3) 查找相关组件。',
    inputSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description: '搜索关键词。可以是组件名、别名、关键词或分类名。例如："按钮"、"表单"、"primary"、"loading"'
            }
        },
        required: [
            'query'
        ]
    }
};
function formatSearchResults(components, query) {
    if (0 === components.length) return `未找到与 "${query}" 相关的组件。\n\n建议：\n- 尝试使用英文组件名（如 Button、Input）\n- 尝试使用更通用的关键词（如 form、data）\n- 使用 component_list 工具查看所有可用组件`;
    const lines = [];
    lines.push(`搜索 "${query}" 找到 ${components.length} 个组件：\n`);
    for (const c of components){
        const status = 'stable' !== c.status ? ` [${c.status}]` : '';
        const aliases = c.aliases?.length ? `\n  别名: ${c.aliases.join(', ')}` : '';
        const keywords = c.keywords?.length ? `\n  关键词: ${c.keywords.join(', ')}` : '';
        lines.push(`### ${c.name}${status}`);
        lines.push(`- 分类: ${c.category}${aliases}${keywords}`);
        lines.push("- 使用 `component_details` 获取详细 API");
        lines.push('');
    }
    return lines.join('\n');
}
async function handleComponentSearch(args) {
    const query = args?.query;
    if (!query) return {
        content: [
            {
                type: 'text',
                text: '请提供搜索关键词'
            }
        ],
        isError: true
    };
    try {
        const components = searchComponents(query);
        const output = formatSearchResults(components, query);
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `搜索组件失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
const componentDetailsTool = {
    name: 'component_details',
    description: '获取 my-design 组件的详细文档。支持三种用法：1) brief=true 只返回组件概述和 Props 名称列表（推荐先调用）；2) 指定 sections 获取特定章节；3) propFilter 只获取指定属性的详情。生成代码前建议先 brief 了解组件，再按需获取详细信息。',
    inputSchema: {
        type: 'object',
        properties: {
            componentName: {
                type: 'string',
                description: '组件名称，如 Button、Input、Table。支持别名（如 Btn）。'
            },
            brief: {
                type: 'boolean',
                description: '简要模式。设为 true 只返回组件概述 + 可用章节列表 + Props 名称列表（不含详细表格），适合初步了解组件。默认 false。'
            },
            sections: {
                type: 'array',
                items: {
                    type: 'string'
                },
                description: '要获取的章节列表。可选值：props、events、rules（核心规则）、behavior、when-to-use、accessibility、all（全部）。默认返回 props + rules。'
            },
            propFilter: {
                type: 'array',
                items: {
                    type: 'string'
                },
                description: '只返回指定的 Props 属性名。如 ["onClick", "loading"] 只返回这 2 个属性的详情。需要 sections 包含 "props"（或默认）时生效。'
            }
        },
        required: [
            'componentName'
        ]
    }
};
const SECTION_MAP = {
    props: 'Props',
    events: 'Events',
    rules: '核心规则（AI 生成时必读）',
    behavior: 'Behavior',
    'when-to-use': 'When to use',
    accessibility: 'Accessibility'
};
function formatBriefOutput(componentName, frontmatter, body) {
    const lines = [];
    lines.push(`# ${componentName} 组件概述\n`);
    const desc = extractDescription(body);
    if (desc) {
        lines.push(desc);
        lines.push('');
    }
    if (frontmatter) {
        const info = [];
        if (frontmatter.import) info.push(`引入: \`${frontmatter.import}\``);
        if (frontmatter.status) info.push(`状态: ${frontmatter.status}`);
        if (frontmatter.since) info.push(`首次发布: v${frontmatter.since}`);
        if (info.length > 0) {
            lines.push(info.join(' | '));
            lines.push('');
        }
    }
    const availableSections = [];
    for (const [key, title] of Object.entries(SECTION_MAP))if (extractSection(body, title)) availableSections.push(key);
    lines.push(`**可用章节**: ${availableSections.join(', ')}`);
    const propsContent = extractSection(body, 'Props');
    if (propsContent) {
        const propNames = extractPropNames(propsContent);
        if (propNames.length > 0) lines.push(`**Props 列表** (${propNames.length} 个): ${propNames.join(', ')}`);
    }
    lines.push('');
    lines.push('> 提示：使用 component_details 并指定 sections 和 propFilter 获取详细信息。');
    return lines.join('\n');
}
function formatComponentDetails(componentName, frontmatter, sections) {
    const lines = [];
    lines.push(`# ${componentName} 组件详情\n`);
    if (frontmatter) {
        if (frontmatter.import) lines.push(`**引入方式**: \`${frontmatter.import}\`\n`);
        if (frontmatter.status && 'stable' !== frontmatter.status) lines.push(`**状态**: ${frontmatter.status}\n`);
        if (frontmatter.since) lines.push(`**首次发布**: v${frontmatter.since}\n`);
        lines.push('');
    }
    for (const [key, content] of Object.entries(sections))if (content) {
        const sectionTitle = SECTION_MAP[key] || key;
        lines.push(`## ${sectionTitle}\n`);
        lines.push(content);
        lines.push('');
    }
    return lines.join('\n');
}
async function handleComponentDetails(args) {
    const componentName = args?.componentName;
    const brief = args?.brief;
    const requestedSections = args?.sections;
    const propFilter = args?.propFilter;
    if (!componentName) return {
        content: [
            {
                type: 'text',
                text: '请提供组件名称'
            }
        ],
        isError: true
    };
    try {
        const content = readComponentDoc(componentName);
        if (!content) {
            const allComponents = getComponentList();
            const componentNames = allComponents.map((c)=>c.name).join(', ');
            return {
                content: [
                    {
                        type: 'text',
                        text: `未找到组件 "${componentName}" 的文档。\n\n可用组件：${componentNames}`
                    }
                ],
                isError: true
            };
        }
        const { frontmatter, body } = parseFrontmatter(content);
        if (brief) {
            const output = formatBriefOutput(componentName, frontmatter, body);
            return {
                content: [
                    {
                        type: 'text',
                        text: output
                    }
                ]
            };
        }
        let sectionsToExtract;
        sectionsToExtract = requestedSections && 0 !== requestedSections.length ? requestedSections.includes('all') ? Object.keys(SECTION_MAP) : requestedSections : [
            'props',
            'rules'
        ];
        const sections = {};
        for (const section of sectionsToExtract){
            const sectionTitle = SECTION_MAP[section];
            if (sectionTitle) {
                let sectionContent = extractSection(body, sectionTitle);
                if ('props' === section && sectionContent && propFilter && propFilter.length > 0) sectionContent = filterProps(sectionContent, propFilter);
                if (sectionContent && isLargeDocument(content)) sectionContent = replaceCodeBlocksWithPlaceholders(sectionContent, componentName);
                sections[section] = sectionContent;
            }
        }
        const output = formatComponentDetails(componentName, frontmatter, sections);
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `获取组件详情失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
const componentExamplesTool = {
    name: 'component_examples',
    description: '获取 my-design 组件的代码示例。不传 exampleName 时返回示例目录（名称+描述，不含代码）；传 exampleName 时返回指定示例的完整代码。建议先获取目录，再按需获取具体示例。',
    inputSchema: {
        type: 'object',
        properties: {
            componentName: {
                type: 'string',
                description: '组件名称，如 Button、Input、Table。支持别名。'
            },
            exampleName: {
                type: 'string',
                description: '示例名称（如"基础用法"、"加载状态"）。不传则返回示例目录列表（不含代码），根据目录决定获取哪个示例。'
            }
        },
        required: [
            'componentName'
        ]
    }
};
async function handleComponentExamples(args) {
    const componentName = args?.componentName;
    const exampleName = args?.exampleName;
    if (!componentName) return {
        content: [
            {
                type: 'text',
                text: '请提供组件名称'
            }
        ],
        isError: true
    };
    try {
        const content = readComponentDoc(componentName);
        if (!content) {
            const allComponents = getComponentList();
            const componentNames = allComponents.map((c)=>c.name).join(', ');
            return {
                content: [
                    {
                        type: 'text',
                        text: `未找到组件 "${componentName}" 的文档。\n\n可用组件：${componentNames}`
                    }
                ],
                isError: true
            };
        }
        const examplesSection = extractSection(content, 'Examples');
        if (!examplesSection) return {
            content: [
                {
                    type: 'text',
                    text: `组件 "${componentName}" 暂无示例代码。`
                }
            ]
        };
        const examples = parseExamples(examplesSection);
        if (0 === examples.length) return {
            content: [
                {
                    type: 'text',
                    text: `# ${componentName} 代码示例\n\n${examplesSection}`
                }
            ]
        };
        if (!exampleName) {
            const lines = [];
            lines.push(`# ${componentName} 代码示例目录\n`);
            lines.push(`共 ${examples.length} 个示例：\n`);
            examples.forEach((ex, i)=>{
                lines.push(`${i + 1}. **${ex.name}** — ${ex.description}`);
            });
            lines.push('');
            lines.push(`> 提示：使用 component_examples 并传入 exampleName（如 "${examples[0].name}"）获取具体示例代码。`);
            return {
                content: [
                    {
                        type: 'text',
                        text: lines.join('\n')
                    }
                ]
            };
        }
        const lowerName = exampleName.toLowerCase();
        const target = examples.find((ex)=>ex.name.toLowerCase() === lowerName || ex.name.toLowerCase().includes(lowerName));
        if (!target) {
            const availableNames = examples.map((ex)=>ex.name).join('、');
            return {
                content: [
                    {
                        type: 'text',
                        text: `未找到示例 "${exampleName}"。\n\n可用示例：${availableNames}`
                    }
                ],
                isError: true
            };
        }
        const output = `# ${componentName} 示例：${target.name}\n\n${target.content}`;
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `获取组件示例失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
const themeTokensTool = {
    name: 'theme_tokens',
    description: '获取 my-design 的 Design Token（设计令牌）和主题信息。包括颜色、间距、圆角、字体等 token 定义，以及不同主题（light/dark）下的值差异。生成代码时应优先使用 token（CSS 变量），避免硬编码颜色、间距等值。',
    inputSchema: {
        type: 'object',
        properties: {
            type: {
                type: 'string',
                description: 'Token 类型过滤。可选值：color（颜色）、spacing（间距）、radius（圆角）、font（字体）、shadow（阴影）、all（全部）。默认返回全部。'
            },
            theme: {
                type: 'string',
                description: '主题名称。可选值：light、dark。如果指定，则返回该主题下的 token 值。'
            }
        },
        required: []
    }
};
function formatTokenList(tokens, type) {
    let filteredTokens = tokens;
    if (type && 'all' !== type) filteredTokens = tokens.filter((t)=>t.type.toLowerCase() === type.toLowerCase());
    if (0 === filteredTokens.length) return type ? `未找到类型为 "${type}" 的 token` : '未找到 token';
    const grouped = filteredTokens.reduce((acc, t)=>{
        if (!acc[t.type]) acc[t.type] = [];
        acc[t.type].push(t);
        return acc;
    }, {});
    const lines = [];
    lines.push(`# my-design Design Tokens\n`);
    lines.push(`共 ${filteredTokens.length} 个 token\n`);
    lines.push('> 生成代码时，请使用 CSS 变量（如 `var(--md-color-primary)`），避免硬编码值。\n');
    for (const [tokenType, typeTokens] of Object.entries(grouped)){
        lines.push(`## ${tokenType}（${typeTokens.length} 个）\n`);
        lines.push('| Token | 默认值 | 说明 |');
        lines.push('|-------|--------|------|');
        for (const t of typeTokens)lines.push(`| \`${t.name}\` | \`${t.default}\` | ${t.description} |`);
        lines.push('');
    }
    return lines.join('\n');
}
function formatThemeInfo(themeName, themeTokens) {
    const lines = [];
    lines.push(`# ${themeName} 主题 Token 值\n`);
    lines.push('| Token | 值 |');
    lines.push('|-------|-----|');
    for (const [name, value] of Object.entries(themeTokens))lines.push(`| \`${name}\` | \`${value}\` |`);
    return lines.join('\n');
}
async function handleThemeTokens(args) {
    const type = args?.type;
    const theme = args?.theme;
    try {
        if (theme) {
            const themesData = readThemes();
            const themeInfo = themesData.themes.find((t)=>t.name.toLowerCase() === theme.toLowerCase());
            if (!themeInfo) {
                const availableThemes = themesData.themes.map((t)=>t.name).join(', ');
                return {
                    content: [
                        {
                            type: 'text',
                            text: `未找到主题 "${theme}"。可用主题：${availableThemes}`
                        }
                    ],
                    isError: true
                };
            }
            const output = formatThemeInfo(themeInfo.name, themeInfo.tokens);
            return {
                content: [
                    {
                        type: 'text',
                        text: output
                    }
                ]
            };
        }
        const tokensData = readTokens();
        const output = formatTokenList(tokensData.tokens, type);
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `获取 token 信息失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
const PAGE_SIZE = 100;
const changelogQueryTool = {
    name: 'changelog_query',
    description: '查询 my-design 组件库的变更日志（Changelog）和迁移指南。用于：1) 了解版本更新内容；2) 查找 Breaking Changes 和迁移方法；3) 排查版本升级问题。支持按版本号过滤和分页。',
    inputSchema: {
        type: 'object',
        properties: {
            version: {
                type: 'string',
                description: '指定版本号（如 "2.0.0"）或版本范围（如 ">=1.5.0"）。如不指定，返回最新的变更记录。'
            },
            page: {
                type: 'number',
                description: '页码（从 1 开始）。changelog 较长时需要分页获取。默认为 1。'
            },
            keyword: {
                type: 'string',
                description: '关键词搜索。用于在 changelog 中搜索特定内容（如组件名、功能名）。'
            }
        },
        required: []
    }
};
function paginateContent(content, page) {
    const lines = content.split('\n');
    const totalLines = lines.length;
    const totalPages = Math.ceil(totalLines / PAGE_SIZE);
    const startIndex = (page - 1) * PAGE_SIZE;
    const endIndex = Math.min(startIndex + PAGE_SIZE, totalLines);
    const pageLines = lines.slice(startIndex, endIndex);
    return {
        content: pageLines.join('\n'),
        totalPages,
        currentPage: page,
        totalLines
    };
}
function extractByVersion(content, version) {
    const versionRegex = new RegExp(`## ${version.replace(/\./g, '\\.')}[\\s\\S]*?(?=\\n## |$)`, 'i');
    const match = content.match(versionRegex);
    return match ? match[0] : null;
}
function searchByKeyword(content, keyword) {
    const lines = content.split('\n');
    const results = [];
    let currentSection = '';
    for (const line of lines){
        if (line.startsWith('## ')) currentSection = line;
        if (line.toLowerCase().includes(keyword.toLowerCase())) {
            if (0 === results.length || !results.includes(currentSection)) results.push(currentSection);
            results.push(line);
        }
    }
    if (0 === results.length) return `未找到包含 "${keyword}" 的内容`;
    return results.join('\n');
}
async function handleChangelogQuery(args) {
    const version = args?.version;
    const page = args?.page || 1;
    const keyword = args?.keyword;
    try {
        const changelog = readChangelog();
        if (!changelog) return {
            content: [
                {
                    type: 'text',
                    text: 'Changelog 文件不存在或为空'
                }
            ],
            isError: true
        };
        let output;
        if (version) {
            const versionContent = extractByVersion(changelog, version);
            if (!versionContent) return {
                content: [
                    {
                        type: 'text',
                        text: `未找到版本 "${version}" 的变更记录`
                    }
                ],
                isError: true
            };
            output = `# Changelog - 版本 ${version}\n\n${versionContent}`;
        } else if (keyword) {
            const searchResult = searchByKeyword(changelog, keyword);
            output = `# Changelog 搜索结果 - "${keyword}"\n\n${searchResult}`;
        } else {
            const paginated = paginateContent(changelog, page);
            if (page < 1 || page > paginated.totalPages) return {
                content: [
                    {
                        type: 'text',
                        text: `页码 ${page} 超出范围。Changelog 共 ${paginated.totalPages} 页（每页 ${PAGE_SIZE} 行）。`
                    }
                ],
                isError: true
            };
            const pageInfo = `[第 ${paginated.currentPage}/${paginated.totalPages} 页 | 共 ${paginated.totalLines} 行]`;
            const navHint = [];
            if (page > 1) navHint.push(`上一页: page=${page - 1}`);
            if (page < paginated.totalPages) navHint.push(`下一页: page=${page + 1}`);
            output = `# my-design Changelog\n\n${pageInfo}\n${navHint.length > 0 ? `[提示: ${navHint.join(', ')}]\n` : ''}\n${paginated.content}`;
        }
        return {
            content: [
                {
                    type: 'text',
                    text: output
                }
            ]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `查询 Changelog 失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
const getCodeBlockTool = {
    name: 'get_code_block',
    description: '获取组件文档中被隐藏的代码块。当组件文档较长时，代码块会被替换为编号占位符（如 [代码块 #1 已隐藏]），使用此工具按编号获取具体代码。',
    inputSchema: {
        type: 'object',
        properties: {
            componentName: {
                type: 'string',
                description: '组件名称，如 Button、Input、Table。'
            },
            codeBlockIndex: {
                type: 'number',
                description: '代码块编号（从 1 开始），对应占位符中的编号。'
            }
        },
        required: [
            'componentName',
            'codeBlockIndex'
        ]
    }
};
async function handleGetCodeBlock(args) {
    const componentName = args?.componentName;
    const codeBlockIndex = args?.codeBlockIndex;
    if (!componentName) return {
        content: [
            {
                type: 'text',
                text: '请提供组件名称'
            }
        ],
        isError: true
    };
    if (!codeBlockIndex || codeBlockIndex < 1) return {
        content: [
            {
                type: 'text',
                text: '请提供有效的代码块编号（从 1 开始）'
            }
        ],
        isError: true
    };
    try {
        const content = readComponentDoc(componentName);
        if (!content) {
            const allComponents = getComponentList();
            const componentNames = allComponents.map((c)=>c.name).join(', ');
            return {
                content: [
                    {
                        type: 'text',
                        text: `未找到组件 "${componentName}" 的文档。\n\n可用组件：${componentNames}`
                    }
                ],
                isError: true
            };
        }
        const codeBlocks = extractCodeBlocks(content);
        if (0 === codeBlocks.length) return {
            content: [
                {
                    type: 'text',
                    text: `组件 "${componentName}" 文档中没有代码块。`
                }
            ],
            isError: true
        };
        if (codeBlockIndex > codeBlocks.length) return {
            content: [
                {
                    type: 'text',
                    text: `代码块编号 ${codeBlockIndex} 超出范围。组件 "${componentName}" 共有 ${codeBlocks.length} 个代码块（编号 1-${codeBlocks.length}）。`
                }
            ],
            isError: true
        };
        const targetBlock = codeBlocks[codeBlockIndex - 1];
        return {
            content: [
                {
                    type: 'text',
                    text: `${componentName} 代码块 #${codeBlockIndex}（共 ${codeBlocks.length} 个）:\n\n${targetBlock}`
                }
            ]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `获取代码块失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
const DEFAULT_PACKAGE_NAME = '@my-design/react';
const ENV_PACKAGE_ROOT = 'MY_DESIGN_PACKAGE_ROOT';
const EXCLUDE_PATH_SEGMENTS = [
    '/node_modules/',
    '/dist/',
    '/lib/',
    '/es/',
    '/cjs/',
    '/__test__/',
    '/__tests__/',
    '/_story/',
    '/_stories/',
    '/.git/'
];
const EXCLUDE_TOP_LEVEL_DIRS = new Set([
    'node_modules',
    '.git',
    'dist',
    'lib',
    'es',
    'cjs'
]);
const MAX_DEPTH = 10;
const BINARY_CHECK_BYTES = 8192;
function shouldExcludePath(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    for (const segment of EXCLUDE_PATH_SEGMENTS)if (normalized.includes(segment)) return true;
    return false;
}
function extractPackageName(packageRoot) {
    const parts = packageRoot.replace(/\\/g, '/').split('/');
    if (parts.length >= 2 && parts[parts.length - 2].startsWith('@')) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    return parts[parts.length - 1];
}
function listFilesRecursive(dir, depth) {
    if (depth > MAX_DEPTH) return [];
    const results = [];
    let entries;
    try {
        entries = readdirSync(dir, {
            withFileTypes: true
        });
    } catch  {
        return [];
    }
    for (const entry of entries){
        const fullPath = external_path_join(dir, entry.name);
        if (entry.isDirectory()) {
            if (!shouldExcludePath(fullPath + '/')) results.push(...listFilesRecursive(fullPath, depth + 1));
        } else if (entry.isFile()) {
            if (!shouldExcludePath(fullPath)) results.push(fullPath);
        }
    }
    return results;
}
function resolvePackageRoot(packageName = DEFAULT_PACKAGE_NAME) {
    const envRoot = process.env[ENV_PACKAGE_ROOT];
    if (envRoot && external_fs_existsSync(envRoot)) return realpathSync(envRoot);
    const resolvedPath = external_path_join(process.cwd(), 'node_modules', packageName);
    if (!external_fs_existsSync(resolvedPath)) throw new Error(`Package "${packageName}" not found at ${resolvedPath}. Ensure it is installed.`);
    return realpathSync(resolvedPath);
}
function listComponentFiles(packageRoot, componentName) {
    const packageName = extractPackageName(packageRoot);
    const normalizedName = componentName.toLowerCase();
    let entries;
    try {
        entries = readdirSync(packageRoot, {
            withFileTypes: true
        });
    } catch  {
        throw new Error(`包根目录不可读: ${packageRoot}`);
    }
    let matchedDir = null;
    for (const entry of entries)if (entry.isDirectory() && entry.name.toLowerCase() === normalizedName) {
        matchedDir = entry.name;
        break;
    }
    if (!matchedDir) return {
        files: [],
        packageName
    };
    const componentDir = external_path_join(packageRoot, matchedDir);
    const absoluteFiles = listFilesRecursive(componentDir, 1);
    const files = absoluteFiles.map((absPath)=>{
        const relativePath = absPath.slice(packageRoot.length + 1).replace(/\\/g, '/');
        return `${packageName}/${relativePath}`;
    });
    return {
        files,
        packageName
    };
}
function readSourceFile(packageRoot, relativePath) {
    const realRoot = realpathSync(packageRoot);
    const absPath = external_path_resolve(realRoot, relativePath);
    if (!absPath.startsWith(realRoot + sep) && absPath !== realRoot) throw new Error(`Path traversal detected: ${relativePath}`);
    if (!external_fs_existsSync(absPath)) throw new Error(`File not found: ${relativePath}`);
    const fd = openSync(absPath, 'r');
    try {
        const buffer = Buffer.alloc(BINARY_CHECK_BYTES);
        const bytesRead = readSync(fd, buffer, 0, BINARY_CHECK_BYTES, 0);
        for(let i = 0; i < bytesRead; i++)if (0x00 === buffer[i]) throw new Error(`Binary file detected: ${relativePath}`);
    } finally{
        closeSync(fd);
    }
    return external_fs_readFileSync(absPath, 'utf-8');
}
function listTopLevelDirectories(packageRoot) {
    let entries;
    try {
        entries = readdirSync(packageRoot, {
            withFileTypes: true
        });
    } catch  {
        throw new Error(`包根目录不可读: ${packageRoot}`);
    }
    const dirs = [];
    for (const entry of entries)if (entry.isDirectory() && !EXCLUDE_TOP_LEVEL_DIRS.has(entry.name)) dirs.push(entry.name);
    return dirs.sort();
}
const getComponentFileListTool = {
    name: 'get_component_file_list',
    description: `获取 my-design 组件的所有源码文件路径列表。

返回组件在 @my-design/react 中的所有文件路径。

路径格式示例：
- @my-design/react/Button/index.tsx
- @my-design/react/Button/Button.tsx
- @my-design/react/Button/style/index.scss

使用场景：
1. 先调用此工具获取组件文件列表
2. 再使用 get_file_code 获取感兴趣的文件代码
3. 如需查看具体函数实现，使用 get_function_code`,
    inputSchema: {
        type: 'object',
        properties: {
            componentName: {
                type: 'string',
                description: '组件名称，如 Button、DatePicker、Modal 等（大小写不敏感）'
            },
            packageName: {
                type: 'string',
                description: 'npm 包名，默认为 "@my-design/react"'
            }
        },
        required: [
            'componentName'
        ]
    }
};
async function handleGetComponentFileList(args) {
    const componentName = args?.componentName;
    const packageName = args?.packageName;
    if (!componentName) return {
        content: [
            {
                type: 'text',
                text: '错误：请提供组件名称 (componentName)'
            }
        ],
        isError: true
    };
    try {
        const packageRoot = resolvePackageRoot(packageName);
        const { files, packageName: pkgName } = listComponentFiles(packageRoot, componentName);
        if (0 === files.length) {
            const availableDirs = listTopLevelDirectories(packageRoot);
            const suggestions = availableDirs.length > 0 ? `\n\n可用的组件目录：\n${availableDirs.map((d)=>`  - ${d}`).join('\n')}` : '';
            return {
                content: [
                    {
                        type: 'text',
                        text: `未找到组件 "${componentName}" 的文件。${suggestions}`
                    }
                ],
                isError: true
            };
        }
        const stats = {
            ts: files.filter((f)=>f.endsWith('.ts') && !f.endsWith('.d.ts')).length,
            tsx: files.filter((f)=>f.endsWith('.tsx')).length,
            js: files.filter((f)=>f.endsWith('.js')).length,
            jsx: files.filter((f)=>f.endsWith('.jsx')).length,
            scss: files.filter((f)=>f.endsWith('.scss')).length,
            css: files.filter((f)=>f.endsWith('.css')).length,
            other: files.filter((f)=>!f.match(/\.(tsx?|jsx?|d\.ts|scss|css)$/)).length
        };
        const statsLines = [];
        if (stats.ts > 0) statsLines.push(`  .ts:   ${stats.ts}`);
        if (stats.tsx > 0) statsLines.push(`  .tsx:  ${stats.tsx}`);
        if (stats.js > 0) statsLines.push(`  .js:   ${stats.js}`);
        if (stats.jsx > 0) statsLines.push(`  .jsx:  ${stats.jsx}`);
        if (stats.scss > 0) statsLines.push(`  .scss: ${stats.scss}`);
        if (stats.css > 0) statsLines.push(`  .css:  ${stats.css}`);
        if (stats.other > 0) statsLines.push(`  其他:  ${stats.other}`);
        const output = [
            `组件: ${componentName}`,
            `包名: ${pkgName}`,
            `总文件数: ${files.length}`,
            "",
            "文件类型统计:",
            ...statsLines,
            "",
            "===== 文件列表 =====",
            "",
            ...files,
            "",
            "提示: 使用 get_file_code 工具传入上述路径获取文件代码"
        ];
        return {
            content: [
                {
                    type: 'text',
                    text: output.join('\n')
                }
            ]
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `获取组件文件列表失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
}
function traverse(node, callback) {
    if (!node) return;
    if (Array.isArray(node)) {
        for (const child of node)traverse(child, callback);
        return;
    }
    callback(node);
    const childKeys = [
        'body',
        'declarations',
        'init',
        'expression',
        'left',
        'right',
        'properties',
        'elements',
        'argument',
        'arguments',
        'params',
        'consequent',
        'alternate',
        'test',
        'object',
        'property',
        'callee',
        'value',
        'key',
        'computed',
        'members',
        'cases',
        'discriminant',
        'handler',
        'block',
        'finalizer',
        'param',
        'declaration',
        'specifiers',
        'source',
        'exported',
        'local',
        'imported',
        'superClass',
        'decorators',
        'typeAnnotation',
        'returnType',
        'typeParameters',
        'implements',
        'extends'
    ];
    for (const key of childKeys){
        const child = node[key];
        if (child && 'object' == typeof child) traverse(child, callback);
    }
}
function extractFunctionsFromAST(ast, code) {
    const functions = [];
    traverse(ast, (node)=>{
        let funcName;
        let bodyStart;
        let bodyEnd;
        let funcStart;
        let funcEnd;
        switch(node.type){
            case 'FunctionDeclaration':
                if (node.id?.name && node.body && 'object' == typeof node.body && !Array.isArray(node.body)) {
                    funcName = node.id.name;
                    bodyStart = node.body.start;
                    bodyEnd = node.body.end;
                    funcStart = node.start;
                    funcEnd = node.end;
                }
                break;
            case 'FunctionExpression':
                if (node.body && 'object' == typeof node.body && !Array.isArray(node.body)) {
                    funcName = node.id?.name;
                    bodyStart = node.body.start;
                    bodyEnd = node.body.end;
                    funcStart = node.start;
                    funcEnd = node.end;
                }
                break;
            case 'ArrowFunctionExpression':
                if (node.body && 'object' == typeof node.body && !Array.isArray(node.body) && 'BlockStatement' === node.body.type) {
                    bodyStart = node.body.start;
                    bodyEnd = node.body.end;
                    funcStart = node.start;
                    funcEnd = node.end;
                }
                break;
            case 'MethodDefinition':
                if (node.key && node.value && 'object' == typeof node.value) {
                    const keyNode = node.key;
                    funcName = keyNode.name || keyNode.value;
                    const valueNode = node.value;
                    if (valueNode.body && 'object' == typeof valueNode.body && !Array.isArray(valueNode.body)) {
                        bodyStart = valueNode.body.start;
                        bodyEnd = valueNode.body.end;
                        funcStart = node.start;
                        funcEnd = node.end;
                    }
                }
                break;
            case 'PropertyDefinition':
                if (node.key && node.value && 'object' == typeof node.value) {
                    const keyNode = node.key;
                    const valueNode = node.value;
                    if ('ArrowFunctionExpression' === valueNode.type || 'FunctionExpression' === valueNode.type) {
                        funcName = keyNode.name || keyNode.value;
                        if (valueNode.body && 'object' == typeof valueNode.body && !Array.isArray(valueNode.body) && 'BlockStatement' === valueNode.body.type) {
                            bodyStart = valueNode.body.start;
                            bodyEnd = valueNode.body.end;
                            funcStart = node.start;
                            funcEnd = node.end;
                        }
                    }
                }
                break;
            case 'Property':
                if (node.key && node.value && 'object' == typeof node.value) {
                    const keyNode = node.key;
                    const valueNode = node.value;
                    if ('FunctionExpression' === valueNode.type || 'ArrowFunctionExpression' === valueNode.type) {
                        funcName = keyNode.name || keyNode.value;
                        if (valueNode.body && 'object' == typeof valueNode.body && !Array.isArray(valueNode.body) && 'BlockStatement' === valueNode.body.type) {
                            bodyStart = valueNode.body.start;
                            bodyEnd = valueNode.body.end;
                            funcStart = node.start;
                            funcEnd = node.end;
                        }
                    }
                }
                break;
        }
        if (void 0 !== bodyStart && void 0 !== bodyEnd && void 0 !== funcStart && void 0 !== funcEnd) functions.push({
            name: funcName || '<anonymous>',
            bodyStart,
            bodyEnd,
            fullCode: code.slice(funcStart, funcEnd),
            start: funcStart,
            end: funcEnd
        });
    });
    functions.sort((a, b)=>a.start - b.start);
    return functions;
}
function extractVariableDeclarationFunctions(ast, code, existingFunctions) {
    const existingStarts = new Set(existingFunctions.map((f)=>f.bodyStart));
    traverse(ast, (node)=>{
        if ('VariableDeclaration' === node.type && node.declarations) {
            for (const decl of node.declarations)if ('VariableDeclarator' === decl.type && decl.id && decl.init) {
                const idNode = decl.id;
                const initNode = decl.init;
                if (('ArrowFunctionExpression' === initNode.type || 'FunctionExpression' === initNode.type) && initNode.body && 'object' == typeof initNode.body && !Array.isArray(initNode.body) && 'BlockStatement' === initNode.body.type) {
                    const bodyStart = initNode.body.start;
                    for (const func of existingFunctions)if (func.bodyStart === bodyStart && '<anonymous>' === func.name) {
                        func.name = idNode.name || '<anonymous>';
                        break;
                    }
                    if (!existingStarts.has(bodyStart)) existingFunctions.push({
                        name: idNode.name || '<anonymous>',
                        bodyStart,
                        bodyEnd: initNode.body.end,
                        fullCode: code.slice(node.start, node.end),
                        start: node.start,
                        end: node.end
                    });
                }
            }
        }
    });
}
function findAllFunctions(code, filename = 'code.tsx') {
    try {
        const result = parseSync(filename, code);
        if (result.errors && result.errors.length > 0) console.warn('解析代码时有错误:', result.errors);
        const ast = result.program;
        const functions = extractFunctionsFromAST(ast, code);
        extractVariableDeclarationFunctions(ast, code, functions);
        functions.sort((a, b)=>a.start - b.start);
        return functions;
    } catch (error) {
        console.error('解析代码失败:', error);
        return [];
    }
}
function removeFunctionBodies(code, filename = 'code.tsx') {
    const functions = findAllFunctions(code, filename);
    if (0 === functions.length) return code;
    const sortedByBodyStart = [
        ...functions
    ].sort((a, b)=>b.bodyStart - a.bodyStart);
    let result = code;
    const replacedRanges = [];
    for (const func of sortedByBodyStart){
        const isNested = replacedRanges.some((range)=>func.bodyStart >= range.start && func.bodyEnd <= range.end);
        if (isNested) continue;
        const before = result.slice(0, func.bodyStart);
        const after = result.slice(func.bodyEnd);
        result = before + '{ ... }' + after;
        replacedRanges.push({
            start: func.bodyStart,
            end: func.bodyEnd
        });
    }
    return result;
}
function extractFunction(code, functionName, filename = 'code.tsx') {
    const functions = findAllFunctions(code, filename);
    const targetFunction = functions.find((f)=>f.name === functionName);
    if (!targetFunction) return null;
    return targetFunction.fullCode;
}
function getFunctionNames(code, filename = 'code.tsx') {
    const functions = findAllFunctions(code, filename);
    const names = functions.map((f)=>f.name).filter((name)=>'<anonymous>' !== name);
    return Array.from(new Set(names));
}
function parseFilePath(fullPath) {
    const match = fullPath.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
    if (!match) return null;
    return {
        packageName: match[1],
        relativePath: match[2]
    };
}
function isScriptFile(filePath) {
    return /\.(tsx?|jsx?)$/.test(filePath);
}
const LINE_THRESHOLD = 500;
const getFileCodeTool = {
    name: 'get_file_code',
    description: `获取组件文件的代码内容。

输入文件路径（从 get_component_file_list 工具获取），返回文件代码。

默认行为：
- .ts/.tsx/.js/.jsx 文件且行数 >= ${LINE_THRESHOLD}：函数体被替换为 "{ ... }"，只显示代码结构
- .ts/.tsx/.js/.jsx 文件且行数 < ${LINE_THRESHOLD}：显示完整代码
- 其他文件（.scss 等）：显示完整内容

可通过 fullCode 参数强制获取完整代码（包含函数体）。

路径格式示例：
- @my-design/react/Button/index.tsx
- @my-design/react/Button/Button.tsx
- @my-design/react/DatePicker/style/index.scss`,
    inputSchema: {
        type: 'object',
        properties: {
            filePath: {
                type: 'string',
                description: '文件完整路径，如 @my-design/react/Button/index.tsx'
            },
            fullCode: {
                type: 'boolean',
                description: '是否获取完整代码（包含函数体），默认为 false'
            }
        },
        required: [
            'filePath'
        ]
    }
};
async function handleGetFileCode(args) {
    const filePath = args?.filePath;
    const fullCode = args?.fullCode || false;
    if (!filePath) return {
        content: [
            {
                type: 'text',
                text: '错误：请提供文件路径 (filePath)'
            }
        ],
        isError: true
    };
    const parsed = parseFilePath(filePath);
    if (!parsed) return {
        content: [
            {
                type: 'text',
                text: `错误：无效的文件路径格式。路径应为 @scope/package/path 格式。\n\n提供的路径: ${filePath}\n\n正确示例: @my-design/react/Button/index.tsx`
            }
        ],
        isError: true
    };
    let packageRoot;
    try {
        packageRoot = resolvePackageRoot(parsed.packageName);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `无法找到包 "${parsed.packageName}": ${errorMessage}`
                }
            ],
            isError: true
        };
    }
    let content;
    try {
        content = readSourceFile(packageRoot, parsed.relativePath);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `读取文件失败: ${errorMessage}\n\n文件路径: ${filePath}`
                }
            ],
            isError: true
        };
    }
    const lineCount = content.split('\n').length;
    let outputContent = content;
    let processInfo = '';
    const shouldFilterFunctionBodies = isScriptFile(filePath) && !fullCode && lineCount >= LINE_THRESHOLD;
    if (shouldFilterFunctionBodies) {
        outputContent = removeFunctionBodies(content, filePath);
        processInfo = '（代码较长，函数体已替换为 "{ ... }"，可使用 fullCode=true 获取完整代码，或使用 get_function_code 工具读取具体函数实现）';
    }
    const output = [
        `文件: ${filePath}`,
        `行数: ${lineCount}`,
        `大小: ${content.length} 字符`,
        processInfo ? `处理: ${processInfo}` : '',
        '',
        '='.repeat(60),
        '',
        outputContent
    ].filter(Boolean);
    return {
        content: [
            {
                type: 'text',
                text: output.join('\n')
            }
        ]
    };
}
function get_function_code_parseFilePath(fullPath) {
    const match = fullPath.match(/^(@[^/]+\/[^/]+)\/(.+)$/);
    if (!match) return null;
    return {
        packageName: match[1],
        relativePath: match[2]
    };
}
const getFunctionCodeTool = {
    name: 'get_function_code',
    description: `获取组件文件中指定函数的完整实现。

输入文件路径和函数名，返回函数的完整代码（包含函数体）。

支持的函数类型：
- 普通函数声明: function foo() {}
- 箭头函数: const foo = () => {}
- 类方法: class Foo { bar() {} }
- getter/setter: get foo() {} / set foo() {}

路径格式示例：
- @my-design/react/Button/index.tsx
- @my-design/react/Table/Table.tsx`,
    inputSchema: {
        type: 'object',
        properties: {
            filePath: {
                type: 'string',
                description: '文件完整路径，如 @my-design/react/Table/Table.tsx'
            },
            functionName: {
                type: 'string',
                description: '函数名称，如 render、handleClick 等'
            }
        },
        required: [
            'filePath',
            'functionName'
        ]
    }
};
async function handleGetFunctionCode(args) {
    const filePath = args?.filePath;
    const functionName = args?.functionName;
    if (!filePath) return {
        content: [
            {
                type: 'text',
                text: '错误：请提供文件路径 (filePath)'
            }
        ],
        isError: true
    };
    if (!functionName) return {
        content: [
            {
                type: 'text',
                text: '错误：请提供函数名称 (functionName)'
            }
        ],
        isError: true
    };
    const parsed = get_function_code_parseFilePath(filePath);
    if (!parsed) return {
        content: [
            {
                type: 'text',
                text: `错误：无效的文件路径格式。路径应为 @scope/package/path 格式。\n\n提供的路径: ${filePath}\n\n示例: @my-design/react/Button/index.tsx`
            }
        ],
        isError: true
    };
    let packageRoot;
    try {
        packageRoot = resolvePackageRoot(parsed.packageName);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `解析包路径失败: ${errorMessage}`
                }
            ],
            isError: true
        };
    }
    let content;
    try {
        content = readSourceFile(packageRoot, parsed.relativePath);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
            content: [
                {
                    type: 'text',
                    text: `读取文件失败: ${errorMessage}\n\n文件路径: ${filePath}`
                }
            ],
            isError: true
        };
    }
    const functionCode = extractFunction(content, functionName, filePath);
    if (!functionCode) {
        const allFunctions = getFunctionNames(content, filePath);
        return {
            content: [
                {
                    type: 'text',
                    text: [
                        `未找到函数 "${functionName}"`,
                        '',
                        `文件: ${filePath}`,
                        '',
                        `文件中可用的函数/方法 (共 ${allFunctions.length} 个):`,
                        ...allFunctions.map((name)=>`  - ${name}`)
                    ].join('\n')
                }
            ],
            isError: true
        };
    }
    const output = [
        `文件: ${filePath}`,
        `函数: ${functionName}`,
        '',
        '='.repeat(60),
        '',
        functionCode
    ];
    return {
        content: [
            {
                type: 'text',
                text: output.join('\n')
            }
        ]
    };
}
const tools = [
    componentListTool,
    componentSearchTool,
    componentDetailsTool,
    componentExamplesTool,
    themeTokensTool,
    changelogQueryTool,
    getCodeBlockTool,
    getComponentFileListTool,
    getFileCodeTool,
    getFunctionCodeTool
];
const toolHandlers = {
    [componentListTool.name]: handleComponentList,
    [componentSearchTool.name]: handleComponentSearch,
    [componentDetailsTool.name]: handleComponentDetails,
    [componentExamplesTool.name]: handleComponentExamples,
    [themeTokensTool.name]: handleThemeTokens,
    [changelogQueryTool.name]: handleChangelogQuery,
    [getCodeBlockTool.name]: handleGetCodeBlock,
    [getComponentFileListTool.name]: handleGetComponentFileList,
    [getFileCodeTool.name]: handleGetFileCode,
    [getFunctionCodeTool.name]: handleGetFunctionCode
};
const server_filename = fileURLToPath(import.meta.url);
const server_dirname = dirname(server_filename);
function getPackageVersion() {
    try {
        const packageJsonPath = external_path_join(server_dirname, '../package.json');
        const packageJson = JSON.parse(external_fs_readFileSync(packageJsonPath, 'utf-8'));
        return packageJson.version;
    } catch  {
        try {
            const packageJsonPath = external_path_join(server_dirname, '../../package.json');
            const packageJson = JSON.parse(external_fs_readFileSync(packageJsonPath, 'utf-8'));
            return packageJson.version;
        } catch  {
            return '0.1.0';
        }
    }
}
function createMCPServer() {
    const version = getPackageVersion();
    const server = new Server({
        name: 'my-design-mcp',
        version
    }, {
        capabilities: {
            tools: {},
            resources: {}
        }
    });
    server.setRequestHandler(ListToolsRequestSchema, async ()=>({
            tools: tools
        }));
    server.setRequestHandler(CallToolRequestSchema, async (request)=>{
        const { name, arguments: args } = request.params;
        const handler = toolHandlers[name];
        if (!handler) throw new Error(`未知的工具: ${name}`);
        return handler(args || {});
    });
    server.setRequestHandler(ListResourcesRequestSchema, async ()=>({
            resources: [
                {
                    uri: 'my-design://components',
                    name: 'my-design Components',
                    description: 'my-design 组件列表',
                    mimeType: 'application/json'
                },
                {
                    uri: 'my-design://tokens',
                    name: 'my-design Tokens',
                    description: 'my-design Design Token 列表',
                    mimeType: 'application/json'
                },
                {
                    uri: 'my-design://guidelines',
                    name: 'my-design Guidelines',
                    description: 'my-design 设计规范目录',
                    mimeType: 'application/json'
                }
            ]
        }));
    server.setRequestHandler(ReadResourceRequestSchema, async (request)=>{
        const { uri } = request.params;
        try {
            if ('my-design://components' === uri) {
                const components = getComponentList();
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify({
                                components: components.map((c)=>({
                                        name: c.name,
                                        category: c.category,
                                        status: c.status,
                                        aliases: c.aliases
                                    })),
                                count: components.length,
                                description: 'my-design 组件列表',
                                note: '使用 component_details 工具获取组件详细信息'
                            }, null, 2)
                        }
                    ]
                };
            }
            if ('my-design://tokens' === uri) return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify({
                            description: 'my-design Design Token',
                            note: '使用 theme_tokens 工具获取详细 token 信息',
                            availableTypes: [
                                'color',
                                'spacing',
                                'radius',
                                'font',
                                'shadow'
                            ],
                            availableThemes: [
                                'light',
                                'dark'
                            ]
                        }, null, 2)
                    }
                ]
            };
            if ('my-design://guidelines' === uri) {
                const index = readDocIndex();
                return {
                    contents: [
                        {
                            uri,
                            mimeType: 'application/json',
                            text: JSON.stringify({
                                guidelines: index.guidelines,
                                count: index.guidelines.length,
                                description: 'my-design 设计规范目录'
                            }, null, 2)
                        }
                    ]
                };
            }
            throw new Error(`未知的资源 URI: ${uri}`);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                contents: [
                    {
                        uri,
                        mimeType: 'application/json',
                        text: JSON.stringify({
                            error: errorMessage
                        }, null, 2)
                    }
                ]
            };
        }
    });
    return server;
}
const sessions = new Map();
let SESSION_TIMEOUT = 1800000;
function parseArgs() {
    const args = process.argv.slice(2);
    let port = 3000;
    let host = '0.0.0.0';
    let stateless = false;
    let timeout = 30;
    for(let i = 0; i < args.length; i++)if (('--port' === args[i] || '-p' === args[i]) && args[i + 1]) {
        port = parseInt(args[i + 1], 10);
        i++;
    } else if (('--host' === args[i] || '-h' === args[i]) && args[i + 1]) {
        host = args[i + 1];
        i++;
    } else if ('--stateless' === args[i]) stateless = true;
    else if (('--timeout' === args[i] || '-t' === args[i]) && args[i + 1]) {
        timeout = parseInt(args[i + 1], 10);
        i++;
    } else if ('--help' === args[i]) {
        console.log(`
my-design MCP Server (Streamable HTTP)

Usage: my-design-mcp-http [options]

Options:
  --port, -p PORT       指定监听端口 (默认: 3000)
  --host, -h HOST       指定监听地址 (默认: 0.0.0.0)
  --stateless           无状态模式，不生成 session ID
  --timeout, -t MINUTES 会话超时时间，单位分钟 (默认: 30)
  --help                显示帮助信息

Endpoints:
  POST /mcp         MCP 消息端点 (Streamable HTTP)
  GET  /mcp         SSE 流端点 (用于服务器推送)
  GET  /health      健康检查端点
`);
        process.exit(0);
    }
    return {
        port,
        host,
        stateless,
        timeout
    };
}
function cleanupSessions() {
    const now = Date.now();
    for (const [sessionId, info] of sessions)if (now - info.lastActivity > SESSION_TIMEOUT) sessions.delete(sessionId);
}
setInterval(cleanupSessions, 60000);
async function main() {
    const { port, host, stateless, timeout } = parseArgs();
    const version = getPackageVersion();
    SESSION_TIMEOUT = 60 * timeout * 1000;
    const server = createMCPServer();
    const httpServer = createServer(async (req, res)=>{
        const url = new URL(req.url || '/', `http://${req.headers.host}`);
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
        res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');
        if ('OPTIONS' === req.method) {
            res.writeHead(204);
            res.end();
            return;
        }
        if ('/health' === url.pathname && 'GET' === req.method) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                status: 'ok',
                name: 'my-design-mcp',
                version,
                transport: 'streamable-http',
                stateless,
                sessionTimeout: `${timeout} minutes`,
                activeSessions: sessions.size
            }));
            return;
        }
        if ('/mcp' === url.pathname) {
            const sessionId = req.headers['mcp-session-id'];
            let body = '';
            req.on('data', (chunk)=>{
                body += chunk.toString();
            });
            await new Promise((resolve)=>{
                req.on('end', async ()=>{
                    try {
                        let transport;
                        if (stateless) {
                            transport = new StreamableHTTPServerTransport({
                                sessionIdGenerator: void 0
                            });
                            await server.connect(transport);
                        } else if (sessionId && sessions.has(sessionId)) {
                            transport = sessions.get(sessionId).transport;
                            sessions.get(sessionId).lastActivity = Date.now();
                        } else {
                            const newSessionId = sessionId || crypto.randomUUID();
                            transport = new StreamableHTTPServerTransport({
                                sessionIdGenerator: ()=>newSessionId
                            });
                            await server.connect(transport);
                            sessions.set(newSessionId, {
                                transport,
                                lastActivity: Date.now()
                            });
                        }
                        if ('GET' === req.method) {
                            transport.handleRequest(req, res).catch(()=>{});
                            resolve();
                            return;
                        }
                        let parsedBody;
                        if (body.trim()) try {
                            parsedBody = JSON.parse(body);
                        } catch  {
                            parsedBody = void 0;
                        }
                        await transport.handleRequest(req, res, parsedBody);
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        if (!res.headersSent) {
                            res.writeHead(500, {
                                'Content-Type': 'application/json'
                            });
                            res.end(JSON.stringify({
                                jsonrpc: '2.0',
                                error: {
                                    code: -32000,
                                    message: errorMessage
                                },
                                id: null
                            }));
                        }
                    }
                    resolve();
                });
            });
            return;
        }
        if ('/' === url.pathname && 'GET' === req.method) {
            res.writeHead(200, {
                'Content-Type': 'application/json'
            });
            res.end(JSON.stringify({
                name: 'my-design-mcp',
                version,
                description: 'my-design MCP Server (Streamable HTTP)',
                transport: 'streamable-http',
                stateless,
                sessionTimeout: `${timeout} minutes`,
                endpoints: {
                    mcp: {
                        POST: '/mcp',
                        GET: '/mcp (SSE)'
                    },
                    health: '/health'
                },
                tools: [
                    'component_list',
                    'component_search',
                    'component_details',
                    'component_examples',
                    'theme_tokens',
                    'changelog_query'
                ]
            }, null, 2));
            return;
        }
        console.log(`[404] 未知端点: ${req.method} ${url.pathname}`);
        res.writeHead(404, {
            'Content-Type': 'application/json'
        });
        res.end(JSON.stringify({
            error: 'Unknown endpoint',
            path: url.pathname,
            method: req.method
        }));
    });
    httpServer.listen(port, host, ()=>{
        console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           my-design MCP Server (Streamable HTTP) v${version.padEnd(10)}      ║
╠══════════════════════════════════════════════════════════════════════╣
║  监听地址: http://${host}:${port}                                      
║  模式: ${stateless ? '无状态 (Stateless)' : '有状态 (Stateful) '}                                        
║  会话超时: ${String(timeout).padEnd(3)} 分钟                                              
║                                                                      ║
║  可用端点:                                                           ║
║    POST   /mcp      发送 MCP 请求                                    ║
║    GET    /mcp      SSE 流 (服务器推送)                              ║
║    GET    /health   健康检查                                         ║
║                                                                      ║
║  可用工具:                                                           ║
║    - component_list      获取组件列表                                ║
║    - component_search    搜索组件                                    ║
║    - component_details   获取组件详情                                ║
║    - component_examples  获取组件示例                                ║
║    - theme_tokens        获取 Design Token                           ║
║    - changelog_query     查询变更日志                                ║
╚══════════════════════════════════════════════════════════════════════╝
`);
    });
    const shutdown = async ()=>{
        console.log('\n正在关闭服务器...');
        for (const [, info] of sessions)try {
            await info.transport.close();
        } catch  {}
        sessions.clear();
        httpServer.close(()=>{
            console.log('服务器已关闭');
            process.exit(0);
        });
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
}
main().catch((error)=>{
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`my-design MCP Server (Streamable HTTP) 启动失败: ${errorMessage}`);
    process.exit(1);
});
