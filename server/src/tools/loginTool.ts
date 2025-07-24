import { z } from "zod";
import { ToolService } from '../services/toolService';

const APP_BASE_URL = "https://app-mcpim.dev-vm3-03.signatureit.app";

async function fetchJson(baseUrl: string, path: string, body: any = {}, contentType: string = "application/json", isGet: boolean = false) {
  // This function is duplicated from mcpRouter.ts; you may want to refactor to share it.
  // For now, keep it here for loginTool.
  const SIGSID = undefined; // sessionStore is not available here; pass SIGSID if needed
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

export const loginTool = {
  name: "login",
  getDescription: () => ToolService.getInstance().getToolDescription('login') || "Authenticate and save SIGSID session",
  schema: {
    username: z.string(),
    password: z.string(),
  },
  handler: async (args: any) => {
    const { username, password } = args;
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
    // sessionStore.set('SIGSID', sessionId); // Not available here; set in router if needed
    return {
      content: [
        { type: "text", text: `✅ Login successful.` },
        { type: "text", text: `Session ID: ${sessionId}` },
      ],
    };
  }
}; 