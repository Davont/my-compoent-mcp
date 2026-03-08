/**
 * Octo MCP 配置
 */

export const SERVER_NAME = 'octo-mcp';
export const SERVER_DISPLAY_NAME = 'Octo Design';

export const ENV_OCTO_DIR = 'OCTO_DIR';
export const ENV_OCTO_API_BASE = 'OCTO_API_BASE';
export const ENV_OCTO_TOKEN = 'OCTO_TOKEN';

export const FETCH_TIMEOUT = 30_000;

export type OutputMode = 'dsl' | 'html' | 'vue';
export const DEFAULT_OUTPUT_MODE: OutputMode = 'html';
