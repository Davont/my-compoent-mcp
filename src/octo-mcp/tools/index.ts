import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { getDesignDataTool, handleGetDesignData } from './process-design.js';
import { injectDesignCodeTool, handleInjectDesignCode } from './inject-design-code.js';

export const tools: Tool[] = [getDesignDataTool, injectDesignCodeTool];

export const toolHandlers: Record<
  string,
  (args: Record<string, unknown>) => Promise<CallToolResult>
> = {
  [getDesignDataTool.name]: handleGetDesignData,
  [injectDesignCodeTool.name]: handleInjectDesignCode,
};

export { getDesignDataTool, handleGetDesignData, injectDesignCodeTool, handleInjectDesignCode };
