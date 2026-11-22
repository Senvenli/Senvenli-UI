// Hosted mode: Streamable HTTP, stateless (every request gets a fresh server; no sessions to keep). The same server
// definition as stdio. `node dist/http.js` listens on HOST:PORT (default 127.0.0.1:8787) at /mcp; nginx in front at launch.
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "./server.js";

const MAX_BODY = 64 * 1024;

/** Handles one MCP request: a new server and transport per request (stateless), closed when the response ends. */
export async function handleMcpRequest(req: IncomingMessage, res: ServerResponse) {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  res.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res);
}

/** A tiny node:http server: POST /mcp only, a body size cap, CORS for browser-based clients. */
export function startHttpServer(port = Number(process.env.PORT ?? 8787), host = process.env.HOST ?? "127.0.0.1") {
  const http = createHttpServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept, Mcp-Protocol-Version");
    if (req.method === "OPTIONS") return void res.writeHead(204).end();
    if (req.url !== "/mcp" || req.method !== "POST") return void res.writeHead(req.url === "/mcp" ? 405 : 404).end();
    if (Number(req.headers["content-length"] ?? 0) > MAX_BODY) return void res.writeHead(413).end();
    try {
      await handleMcpRequest(req, res);
    } catch {
      if (!res.headersSent) res.writeHead(500).end();
    }
  });
  // Loopback only by default: the public way in is the proxy. HOST=0.0.0.0 opts in to every interface.
  http.listen(port, host);
  return http;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startHttpServer();
  console.log(`Senvenli UI MCP on http://${process.env.HOST ?? "127.0.0.1"}:${process.env.PORT ?? 8787}/mcp`);
}
