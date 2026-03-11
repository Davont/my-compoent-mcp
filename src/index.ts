/**
 * MCP Server
 * 
 * 主导出文件
 */

// 导出 server 创建函数
export { createMCPServer, getPackageVersion } from './server.js';

// 导出所有工具
export {
  tools,
  toolHandlers,
  // 公开工具
  getContextBundleTool,
  handleGetContextBundle,
  componentSearchTool,
  handleComponentSearch,
  componentDetailsTool,
  handleComponentDetails,
  themeTokensTool,
  handleThemeTokens,
  changelogQueryTool,
  handleChangelogQuery,
  sourceInspectTool,
  handleSourceInspect,
  designToCodeTool,
  handleDesignToCode,
  fetchDesignDataTool,
  handleFetchDesignData,
  // 内部工具 handler
  handleComponentList,
  handleComponentExamples,
  handleGetRelatedComponents,
  handleGetCodeBlock,
  handleGetComponentFileList,
  handleGetFileCode,
  handleGetFunctionCode,
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
  parseExamples,
  extractCodeBlocks,
  replaceCodeBlocksWithPlaceholders,
  isLargeDocument,
  filterProps,
  extractDescription,
  extractPropNames,
} from './utils/doc-reader.js';

export {
  resolvePackageRoot,
  listComponentFiles,
  readSourceFile,
  listTopLevelDirectories,
} from './utils/source-code-reader.js';

export {
  findAllFunctions,
  removeFunctionBodies,
  extractFunction,
  getFunctionNames,
} from './utils/remove-function-body.js';

// 导出类型
export type {
  ComponentIndexEntry,
  GuidelineIndexEntry,
  DocIndex,
  ComponentFrontmatter,
  TokenDefinition,
  TokensFile,
  ThemesFile,
  ExampleEntry,
} from './utils/doc-reader.js';

export type { FunctionInfo } from './utils/remove-function-body.js';
