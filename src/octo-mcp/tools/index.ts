import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getDesignDataTool, handleGetDesignData } from './process-design.js';
import { generateArkuiTool, handleGenerateArkui } from './generate-arkui.js';

export const tools: Tool[] = [getDesignDataTool, generateArkuiTool];

export const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<CallToolResult>
> = {
  [getDesignDataTool.name]: handleGetDesignData,
  [generateArkuiTool.name]: handleGenerateArkui,
};
