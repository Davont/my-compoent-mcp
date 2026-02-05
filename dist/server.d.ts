/**
 * my-design MCP Server 共享配置
 *
 * 这个模块导出 MCP 服务器的配置和处理器注册逻辑，
 * 可以被 stdio 和 HTTP 两种入口共用
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
/**
 * 读取 package.json 获取版本号
 */
declare function getPackageVersion(): string;
/**
 * 创建并配置 MCP 服务器实例
 */
export declare function createMCPServer(): Server;
export { getPackageVersion };
