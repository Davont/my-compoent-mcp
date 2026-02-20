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
  getCodeBlockTool,
  handleGetCodeBlock,
  getComponentFileListTool,
  handleGetComponentFileList,
  getFileCodeTool,
  handleGetFileCode,
  getFunctionCodeTool,
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
