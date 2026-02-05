/**
 * doc/ 目录读取工具
 *
 * 读取随 MCP Server 包发布的 doc/ 目录中的数据
 */
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
/**
 * 读取 index.json 索引文件
 */
export declare function readDocIndex(): DocIndex;
/**
 * 读取组件文档
 * @param componentName - 组件名称（如 Button）
 * @returns 文档内容（Markdown 格式）
 */
export declare function readComponentDoc(componentName: string): string | null;
/**
 * 解析组件文档的 frontmatter
 * @param content - Markdown 内容
 */
export declare function parseFrontmatter(content: string): {
    frontmatter: ComponentFrontmatter | null;
    body: string;
};
/**
 * 提取组件文档的指定章节
 * @param content - Markdown 内容
 * @param sectionName - 章节名称（如 "Props"、"Examples"）
 */
export declare function extractSection(content: string, sectionName: string): string | null;
/**
 * 读取 tokens.json
 */
export declare function readTokens(): TokensFile;
/**
 * 读取 themes.json
 */
export declare function readThemes(): ThemesFile;
/**
 * 读取规范文档
 * @param guidelineName - 规范名称（如 "layout"、"typography"）
 */
export declare function readGuidelineDoc(guidelineName: string): string | null;
/**
 * 读取 changelog
 */
export declare function readChangelog(): string | null;
/**
 * 获取所有组件列表
 */
export declare function getComponentList(): ComponentIndexEntry[];
/**
 * 搜索组件
 * @param query - 搜索关键词
 */
export declare function searchComponents(query: string): ComponentIndexEntry[];
