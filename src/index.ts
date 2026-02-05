/**
 * my-design MCP Server
 * 
 * 主导出文件
 */

// 导出 server 创建函数
export { createMCPServer, getPackageVersion } from './server.js';

// 导出所有工具
export { 
  tools, 
  toolHandlers,
  componentListTool,
  handleComponentList,
  componentSearchTool,
  handleComponentSearch,
  componentDetailsTool,
  handleComponentDetails,
  componentExamplesTool,
  handleComponentExamples,
  themeTokensTool,
  handleThemeTokens,
  changelogQueryTool,
  handleChangelogQuery,
} from './tools/index.js';

// 导出 utils
export {
  readDocIndex,
  readComponentDoc,
  readTokens,
  readThemes,
  readChangelog,
  readGuidelineDoc,
  getComponentList,
  searchComponents,
  parseFrontmatter,
  extractSection,
} from './utils/doc-reader.js';

// 导出类型
export type {
  ComponentIndexEntry,
  GuidelineIndexEntry,
  DocIndex,
  ComponentFrontmatter,
  TokenDefinition,
  TokensFile,
  ThemesFile,
} from './utils/doc-reader.js';
