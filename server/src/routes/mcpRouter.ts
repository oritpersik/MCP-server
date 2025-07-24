import { Router } from 'express';
// import { Server } from '@modelcontextprotocol/sdk/server/index.js';
// import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
// import { LoginTool } from '../tools/loginTool';

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js"; // <-- use HTTP transport
import { z } from "zod";
import express from "express";
import { randomUUID } from "node:crypto";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js"
import { ToolService } from '../services/toolService';

// Type definitions for tool handlers
import { ZodTypeAny } from 'zod';

type LoginHandlerArgs = { username: string; password: string };
type CreateTaxonomyEntityTypeHandlerArgs = { SIGSID: string; tpc: string; name: string; id: string };
type GetTaxonomyTreeHandlerArgs = { SIGSID: string; tpc: string; entity_type_var: string };
type SetEntityPropertiesHandlerArgs = { SIGSID: string; tpc: string; id: string; name: string; entity_type_var: string };
type CreateTaxonomyNodeHandlerArgs = { SIGSID: string; tpc: string; entity_type_var: string; node_type_var: string; parent: string; lang_id: string | number; title: string; uri?: string; entity_tree_parent?: string };

type HandlerContext = { requestInfo?: any };

export const mcpRouter = Router();

const sessionStore = new Map(); // Replace with Redis for production

const APP_BASE_URL = "https://app-mcpim.dev-vm3-03.signatureit.app";
const SYS_BASE_URL = "https://sys-mcpim.dev-vm3-03.signatureit.app";

// Create MCP server instance
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

// Tool definitions as variables
const loginTool = {
  name: "login",
  getDescription: () => ToolService.getInstance().getToolDescription('login') || "Authenticate and save SIGSID session",
  schema: {
    username: z.string(),
    password: z.string(),
  },
  handler: async ({ username, password }: LoginHandlerArgs, { requestInfo }: HandlerContext) => {
    const res = await fetchJson(APP_BASE_URL, "/public/auth/login",
      { userName: username, userPassword: password }, "application/json", false);
    if (!res.ok) {
      return {
        content: [{ type: "text", text: "❌ Login failed: " + res.statusText }],
      };
    }

    const json = await res.json() as { session_id?: string };
    const sessionId = json.session_id;

    if (!sessionId) {
      return {
        content: [{ type: "text", text: "❌ Login failed: no session_id returned." }],
      };
    }

    sessionStore.set('SIGSID', sessionId);
    return {
      content: [
        { type: "text", text: `✅ Login successful.` },
        { type: "text", text: `Session ID: ${sessionId}` },
      ],
    };
  }
};

const createTaxonomyEntityTypeTool = {
  name: "create-taxonomy-entity-type",
  getDescription: () => ToolService.getInstance().getToolDescription('create-taxonomy-entity-type') || "Create a new taxonomy entity type",
  schema: {
    SIGSID: z.string().describe("Authentication cookie (SIGSID)"),
    tpc: z.string().describe("TPC token"),
    name: z.string().describe("Entity type name"),
    id: z.string().describe("Entity type ID"),
  },
  handler: async ({ SIGSID, tpc, name, id }: CreateTaxonomyEntityTypeHandlerArgs) => {
    const formData = new URLSearchParams({
      action: "newEntityType",
      type: "taxonomy",
      parent: "",
      is_block: "0",
      name,
      id,
      from_tree: "",
      from_entity_type_var: "Select",
      tpc,
    });

    const response = await fetch(`${SYS_BASE_URL}/entity_taxonomy.php`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Cookie": `SIGSID=${SIGSID}`,
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create taxonomy entity type. HTTP ${response.status}`,
          },
        ],
      };
    }

    const text = await response.text();
    return {
      content: [
        {
          type: "text",
          text: `Entity type created successfully.\n\n${text}`,
        },
      ],
    };
  }
};

const getTaxonomyTreeTool = {
  name: "get-taxonomy-tree",
  getDescription: () => ToolService.getInstance().getToolDescription('get-taxonomy-tree') || "Get taxonomy tree for a specific entity type",
  schema: {
    SIGSID: z.string().describe("Authentication cookie (SIGSID)"),
    tpc: z.string().describe("TPC token"),
    entity_type_var: z.string().describe("Taxonomy entity type (e.g. tax_catalogue, product_categories, etc.)"),
  },
  handler: async ({ SIGSID, tpc, entity_type_var }: GetTaxonomyTreeHandlerArgs) => {
    const formData = new FormData();
    formData.append("tpc", tpc);

    const url = `${SYS_BASE_URL}/entity_type.php?action=getEntityTreeAjax&entity_type_var=${encodeURIComponent(entity_type_var)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Cookie": `SIGSID=${SIGSID}`,
      },
      body: formData,
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to fetch taxonomy tree. HTTP status: ${response.status}`,
          },
        ],
      };
    }

    const result = await response.text();
    return {
      content: [
        {
          type: "text",
          text: `Successfully fetched taxonomy tree for \"${entity_type_var}\":\n\n${result}`,
        },
      ],
    };
  }
};

const setEntityPropertiesTool = {
  name: "set-entity-properties",
  getDescription: () => ToolService.getInstance().getToolDescription('set-entity-properties') || "Set entity type properties for taxonomy/catalogue",
  schema: {
    SIGSID: z.string().describe("Authentication cookie (SIGSID)"),
    tpc: z.string().describe("TPC token"),
    id: z.string().describe("Entity type ID"),
    name: z.string().describe("Entity type name"),
    entity_type_var: z.string().describe("Entity type variable (e.g. tax_catalogue)"),
  },
  handler: async ({ SIGSID, tpc, id, name, entity_type_var }: SetEntityPropertiesHandlerArgs) => {
    const formData = new FormData();
    formData.append("action", "setEproperties");
    formData.append("is_parent", "1");
    formData.append("solr_link", '');
    formData.append("es_settings[id]", id);
    formData.append("es_settings[name]", name);
    formData.append("es_settings[entity_type_var]", entity_type_var);
    formData.append("es_settings[hide_general_fields]", "1");
    formData.append("es_settings[use_taxonomy_as_catalog]", "1");
    formData.append("es_settings[container_related_type]", "entity_var");
    formData.append("es_settings[group_id]", "0");
    formData.append("tpc", tpc);

    const response = await fetch(`${SYS_BASE_URL}/entity_type.php`, {
      method: "POST",
      headers: {
        "Cookie": `SIGSID=${SIGSID}`,
      },
      body: formData,
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to set entity properties. HTTP status: ${response.status}`,
          },
        ],
      };
    }

    const result = await response.text();
    return {
      content: [
        {
          type: "text",
          text: `Entity properties updated successfully:\n\n${result}`,
        },
      ],
    };
  }
};

const createTaxonomyNodeTool = {
  name: "create-taxonomy-node",
  getDescription: () => ToolService.getInstance().getToolDescription('create-taxonomy-node') || "Create a new taxonomy node in a specified entity type",
  schema: {
    SIGSID: z.string().describe("Authentication cookie (SIGSID)"),
    tpc: z.string().describe("TPC token"),
    entity_type_var: z.string().describe("The taxonomy entity type (e.g., tax_catalogue)"),
    node_type_var: z.string().describe("Node type variable (e.g., tax_catalogue333)"),
    parent: z.string().describe("Parent node variable name (e.g., tax_catalogue)"),
    lang_id: z.union([z.string(), z.number()]).describe("Language ID (e.g., 1 for Hebrew)"),
    title: z.string().describe("Node title (in UTF-8 or native language)"),
    uri: z.string().optional().describe("Optional URI slug for the node"),
    entity_tree_parent: z.string().optional().describe("Parent node ID if relevant (default empty)"),
  },
  handler: async ({ SIGSID, tpc, entity_type_var, node_type_var, parent, lang_id, title, uri = "", entity_tree_parent = "" }: CreateTaxonomyNodeHandlerArgs) => {
    const formData = new FormData();
    formData.append("tpc", tpc);

    const url = `${SYS_BASE_URL}/entity_taxonomy.php?action=NewTaxonomyNode&` +
      `entity_type_var=${encodeURIComponent(entity_type_var)}` +
      `&entity_tree_parent=${encodeURIComponent(entity_tree_parent)}` +
      `&node_type_var=${encodeURIComponent(node_type_var)}` +
      `&parent=${encodeURIComponent(parent)}` +
      `&lang_id=${encodeURIComponent(lang_id)}` +
      `&title=${encodeURIComponent(title)}` +
      `&uri=${encodeURIComponent(uri)}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Cookie": `SIGSID=${SIGSID}`,
      },
      body: formData,
    });

    if (!response.ok) {
      return {
        content: [
          {
            type: "text",
            text: `Failed to create taxonomy node. HTTP status: ${response.status}`,
          },
        ],
      };
    }

    const result = await response.text();
    return {
      content: [
        {
          type: "text",
          text: `Taxonomy node created successfully:\n\n${result}`,
        },
      ],
    };
  }
};

// Array of all tool configs
const allToolsData = [
  loginTool,
  createTaxonomyEntityTypeTool,
  getTaxonomyTreeTool,
  setEntityPropertiesTool,
  createTaxonomyNodeTool,
];
let allServerTools = [];

// Register all tools in a loop
(async () => {
  await ToolService.getInstance().loadToolDescriptions();
  for (const tool of allToolsData) {
    allServerTools.push(server.tool(
      tool.name,
      tool.getDescription(),
      tool.schema,
      tool.handler
    ));
  }
})();

// Listen for tool-upserted event and reload tool descriptions with error handling
ToolService.getInstance().eventEmitter.on('tool-upserted', async () => {
  try {
    await updateAllToolsWithLatestDescriptions();
    console.log('Tool descriptions reloaded after upsert. Please restart the server to apply changes.');
  } catch (err) {
    console.error('Failed to reload tool descriptions after upsert:', err);
  }
});

async function updateAllToolsWithLatestDescriptions() {
  // Ensure tool descriptions are loaded before registering tools
  await ToolService.getInstance().loadToolDescriptions();

  // allServerTools and allToolsData are in the same order
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
