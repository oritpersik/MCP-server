import { Router } from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { LoginTool } from '../tools/loginTool';

export const mcpRouter = Router();

// Create MCP server instance
const server = new Server(
  {
    name: 'mcp-tool-server',
    version: '1.0.0',
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: LoginTool.getName(),
        description: LoginTool.getDescription(),
        inputSchema: LoginTool.getInputSchema(),
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case 'login':
      try {
        const result = await LoginTool.execute(args as any);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing login tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// MCP endpoint - handle MCP protocol over HTTP
mcpRouter.post('/', async (req, res) => {
  try {
    // In a real implementation, you'd set up proper transport handling
    // For now, we'll provide a simple endpoint that demonstrates MCP integration
    const { method, params } = req.body;

    if (method === 'tools/list') {
      const response = await server.request({ method: 'tools/list' }, ListToolsRequestSchema);
      res.json(response);
    } else if (method === 'tools/call') {
      const response = await server.request(
        { method: 'tools/call', params },
        CallToolRequestSchema
      );
      res.json(response);
    } else {
      res.status(400).json({ error: 'Unsupported method' });
    }
  } catch (error) {
    console.error('MCP request error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available tools via HTTP
mcpRouter.get('/tools', async (req, res) => {
  try {
    const tools = [
      {
        name: LoginTool.getName(),
        description: LoginTool.getDescription(),
        inputSchema: LoginTool.getInputSchema(),
      },
    ];
    res.json({ tools });
  } catch (error) {
    console.error('Error fetching tools:', error);
    res.status(500).json({ error: 'Failed to fetch tools' });
  }
});