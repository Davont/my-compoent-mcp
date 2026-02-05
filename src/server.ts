/**
 * my-design MCP Server 共享配置
 * 
 * 这个模块导出 MCP 服务器的配置和处理器注册逻辑，
 * 可以被 stdio 和 HTTP 两种入口共用
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { tools, toolHandlers } from './tools/index.js';
import { getComponentList, readDocIndex } from './utils/doc-reader.js';

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * 读取 package.json 获取版本号
 */
function getPackageVersion(): string {
  try {
    // 生产环境：dist/server.js -> ../package.json
    const packageJsonPath = join(__dirname, '../package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson.version;
  } catch {
    try {
      // 开发环境：src/server.ts -> ../../package.json
      const packageJsonPath = join(__dirname, '../../package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      return packageJson.version;
    } catch {
      return '0.1.0';
    }
  }
}

/**
 * 创建并配置 MCP 服务器实例
 */
export function createMCPServer(): Server {
  const version = getPackageVersion();
  
  // 创建 MCP 服务器实例
  const server = new Server(
    {
      name: 'my-design-mcp',
      version,
    },
    {
      capabilities: {
        tools: {},
        resources: {},
      },
    }
  );

  // ============ Tools 处理器 ============

  // 注册工具列表处理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools,
    };
  });

  // 注册工具调用处理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const handler = toolHandlers[name];
    if (!handler) {
      throw new Error(`未知的工具: ${name}`);
    }

    return handler(args || {});
  });

  // ============ Resources 处理器 ============

  // 注册资源列表处理器
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: 'my-design://components',
          name: 'my-design Components',
          description: 'my-design 组件列表',
          mimeType: 'application/json',
        },
        {
          uri: 'my-design://tokens',
          name: 'my-design Tokens',
          description: 'my-design Design Token 列表',
          mimeType: 'application/json',
        },
        {
          uri: 'my-design://guidelines',
          name: 'my-design Guidelines',
          description: 'my-design 设计规范目录',
          mimeType: 'application/json',
        },
      ],
    };
  });

  // 注册资源读取处理器
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      // 组件列表资源
      if (uri === 'my-design://components') {
        const components = getComponentList();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  components: components.map(c => ({
                    name: c.name,
                    category: c.category,
                    status: c.status,
                    aliases: c.aliases,
                  })),
                  count: components.length,
                  description: 'my-design 组件列表',
                  note: '使用 component_details 工具获取组件详细信息',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // Token 资源
      if (uri === 'my-design://tokens') {
        // 简化返回，详细信息通过 theme_tokens 工具获取
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  description: 'my-design Design Token',
                  note: '使用 theme_tokens 工具获取详细 token 信息',
                  availableTypes: ['color', 'spacing', 'radius', 'font', 'shadow'],
                  availableThemes: ['light', 'dark'],
                },
                null,
                2
              ),
            },
          ],
        };
      }

      // 规范资源
      if (uri === 'my-design://guidelines') {
        const index = readDocIndex();
        return {
          contents: [
            {
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  guidelines: index.guidelines,
                  count: index.guidelines.length,
                  description: 'my-design 设计规范目录',
                },
                null,
                2
              ),
            },
          ],
        };
      }

      throw new Error(`未知的资源 URI: ${uri}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(
              {
                error: errorMessage,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  });

  return server;
}

export { getPackageVersion };
