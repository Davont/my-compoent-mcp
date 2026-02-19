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
/** 示例条目 */
export interface ExampleEntry {
    name: string;
    description: string;
    content: string;
}
/**
 * 从 Examples 章节中解析出所有示例条目
 * 按 ### 三级标题拆分，每个子标题为一个示例
 */
export declare function parseExamples(examplesContent: string): ExampleEntry[];
/**
 * 提取文档中所有代码块
 */
export declare function extractCodeBlocks(content: string): string[];
/**
 * 将大文档中的代码块替换为编号占位符
 * 配合 get_code_block 工具使用
 */
export declare function replaceCodeBlocksWithPlaceholders(content: string, componentName: string): string;
/**
 * 判断文档是否为大文档（超过阈值行数）
 */
export declare function isLargeDocument(content: string): boolean;
/**
 * 从 Props Markdown 表格中过滤出指定属性
 */
export declare function filterProps(propsContent: string, propNames: string[]): string;
/**
 * 从文档内容中提取组件描述（# 标题后的第一段）
 */
export declare function extractDescription(body: string): string;
/**
 * 从 Props 表格中提取所有属性名列表
 */
export declare function extractPropNames(propsContent: string): string[];
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
