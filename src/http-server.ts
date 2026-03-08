/**
 * Ansvar Visualization MCP — Streamable HTTP transport.
 *
 * Runs as a standalone HTTP server for remote MCP access.
 * Default port: 3000 (configurable via PORT env var).
 */
import express from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { TOOL_DEFINITIONS, dispatch } from "./tools/registry.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

function createServer(): Server {
  const server = new Server(
    { name: "ansvar-visualization-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFINITIONS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    return dispatch(name, args ?? {});
  });

  return server;
}

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "ansvar-visualization-mcp", tools: TOOL_DEFINITIONS.length });
});

app.listen(PORT, () => {
  console.log(`Visualization MCP listening on port ${PORT}`);
});
