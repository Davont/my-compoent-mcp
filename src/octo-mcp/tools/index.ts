import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getDesignDataTool, handleGetDesignData } from './process-design.js';

export const tools: Tool[] = [getDesignDataTool];

export const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<CallToolResult>
> = {
  [getDesignDataTool.name]: handleGetDesignData,
};

export { getDesignDataTool, handleGetDesignData };
