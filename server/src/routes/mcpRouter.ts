import { Router } from 'express';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { randomUUID } from "node:crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { ToolService } from '../services/toolService';
import { taxonomyTools } from '../tools/taxonomyTools';
import { loginTool } from '../tools/loginTool';

export const mcpRouter = Router();

const sessionStore = new Map(); // Replace with Redis for production

const server = new McpServer({
  name: "signeo-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {},
    tools: {
      listChanged: true,
    },
  },
});

async function fetchJson(baseUrl: string, path: string, body: any = {}, contentType: string = "application/json", isGet: boolean = false) {
  const SIGSID = sessionStore.get('SIGSID');
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": contentType,
      ...(SIGSID ? { Cookie: `SIGSID=${SIGSID}` } : {}),
    },
    body: isGet ? undefined : JSON.stringify(body),
    credentials: "include",
  });
  return res;
}

// Combine all tool configs
const allToolsData = [loginTool, ...taxonomyTools];
let allServerTools: any[] = [];

// Register all tools in a loop
(async () => {
  // await ToolService.getInstance().loadToolDescriptions();
  for (const tool of allToolsData) {
    // Special handling for login tool to set SIGSID in sessionStore
    if (tool.name === 'login') {
      // @ts-ignore
      allServerTools.push(server.tool(
        tool.name,
        tool.getDescription(),
        tool.schema,
        async (args: any) => {
          const result = await tool.handler(args);
          // Set SIGSID in sessionStore if login is successful
          if (result && result.content && Array.isArray(result.content)) {
            const sessionIdLine = result.content.find((c: any) => typeof c.text === 'string' && c.text.startsWith('Session ID: '));
            if (sessionIdLine) {
              const sessionId = sessionIdLine.text.replace('Session ID: ', '').trim();
              sessionStore.set('SIGSID', sessionId);
            }
          }
          return result;
        }
      ));
    } else {
      // @ts-ignore
      allServerTools.push(server.tool(
        tool.name,
        tool.getDescription(),
        tool.schema,
        tool.handler
      ));
    }
  }
})();

ToolService.getInstance().eventEmitter.on('tool-upserted', async () => {
  try {
    await updateAllToolsWithLatestDescriptions();
  } catch (err) {
    console.error('Failed to reload tool descriptions after upsert:', err);
  }
});

async function updateAllToolsWithLatestDescriptions() {
  await ToolService.getInstance().loadToolDescriptions();
  for (let i = 0; i < allServerTools.length; i++) {
    const serverTool = allServerTools[i];
    const toolData = allToolsData[i];
    serverTool.update({ description: toolData.getDescription() });
  }
}

// Map to store transports by session ID
const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

// Handle POST requests for client-to-server communication
mcpRouter.post('/', async (req, res) => {
  // Check for existing session ID
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  if (sessionId && transports[sessionId]) {
    // Reuse existing transport
    transport = transports[sessionId];
  } else if (!sessionId && isInitializeRequest(req.body)) {
    // New initialization request
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        // Store the transport by session ID
        transports[sessionId] = transport;
      },
      // DNS rebinding protection is disabled by default for backwards compatibility. If you are running this server
      // locally, make sure to set:
      // enableDnsRebindingProtection: true,
      // allowedHosts: ['127.0.0.1'],
    });

    // Clean up transport when closed
    transport.onclose = () => {
      if (transport.sessionId) {
        delete transports[transport.sessionId];
      }
    };
    // Connect to the existing MCP server with all tools
    await server.connect(transport);
  } else {
    // Invalid request
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  // Handle the request
  await transport.handleRequest(req, res, req.body);
});

// Reusable handler for GET and DELETE requests
const handleSessionRequest = async (req: express.Request, res: express.Response) => {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !transports[sessionId]) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }
  
  const transport = transports[sessionId];
  await transport.handleRequest(req, res);
};

// Handle GET requests for server-to-client notifications via SSE
mcpRouter.get('/', handleSessionRequest);

// Handle DELETE requests for session termination
mcpRouter.delete('/', handleSessionRequest);
