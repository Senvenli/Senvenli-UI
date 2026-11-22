#!/usr/bin/env node
// Local mode: `npx @senvenli/mcp` starts the server on stdio for Claude Code, Cursor, VS Code and others.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

await createServer().connect(new StdioServerTransport());
