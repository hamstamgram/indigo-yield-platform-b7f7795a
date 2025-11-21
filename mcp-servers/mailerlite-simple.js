#!/usr/bin/env node

import MailerLite from "@mailerlite/mailerlite-nodejs";
import { createReadStream, createWriteStream } from "fs";
import { stdin, stdout, stderr } from "process";
import { createInterface } from "readline";

// Initialize MailerLite client
const mailerLite = new MailerLite({
  api_key: process.env.MAILERLITE_API_TOKEN,
});

// Create readline interface for stdin/stdout communication
const rl = createInterface({
  input: stdin,
  output: stdout,
  terminal: false,
});

// Helper to send JSON-RPC response
function sendResponse(id, result) {
  const response = {
    jsonrpc: "2.0",
    id: id,
    result: result,
  };
  stdout.write(JSON.stringify(response) + "\n");
}

// Helper to send JSON-RPC error
function sendError(id, error) {
  const response = {
    jsonrpc: "2.0",
    id: id,
    error: {
      code: -1,
      message: error.message || error,
    },
  };
  stdout.write(JSON.stringify(response) + "\n");
}

// Handle incoming JSON-RPC messages
rl.on("line", async (line) => {
  try {
    const message = JSON.parse(line);

    if (message.method === "initialize") {
      sendResponse(message.id, {
        capabilities: {
          tools: {},
        },
        serverInfo: {
          name: "mailerlite-server",
          version: "0.1.0",
        },
      });
      return;
    }

    if (message.method === "initialized") {
      // Just acknowledge, no response needed
      return;
    }

    if (message.method === "tools/list") {
      sendResponse(message.id, {
        tools: [
          {
            name: "get_subscribers",
            description: "Get list of subscribers",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Number of subscribers to return",
                  default: 50,
                },
                page: { type: "number", description: "Page number", default: 1 },
              },
            },
          },
          {
            name: "create_subscriber",
            description: "Create a new subscriber",
            inputSchema: {
              type: "object",
              properties: {
                email: { type: "string", description: "Subscriber email address" },
                name: { type: "string", description: "Subscriber name (optional)" },
                fields: { type: "object", description: "Custom fields for subscriber" },
              },
              required: ["email"],
            },
          },
          {
            name: "get_campaigns",
            description: "Get list of campaigns",
            inputSchema: {
              type: "object",
              properties: {
                limit: {
                  type: "number",
                  description: "Number of campaigns to return",
                  default: 50,
                },
                page: { type: "number", description: "Page number", default: 1 },
              },
            },
          },
        ],
      });
      return;
    }

    if (message.method === "tools/call") {
      const { name, arguments: args } = message.params;

      try {
        let result;

        switch (name) {
          case "get_subscribers":
            result = await mailerLite.subscribers.get({
              limit: args.limit || 50,
              page: args.page || 1,
            });
            break;

          case "create_subscriber":
            result = await mailerLite.subscribers.createOrUpdate({
              email: args.email,
              name: args.name,
              fields: args.fields || {},
            });
            break;

          case "get_campaigns":
            result = await mailerLite.campaigns.get({
              limit: args.limit || 50,
              page: args.page || 1,
            });
            break;

          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        sendResponse(message.id, {
          content: [
            {
              type: "text",
              text: JSON.stringify(result.data || result, null, 2),
            },
          ],
        });
      } catch (error) {
        stderr.write(`Tool execution error: ${error.message}\n`);
        sendResponse(message.id, {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        });
      }
      return;
    }

    // Unknown method
    sendError(message.id, `Unknown method: ${message.method}`);
  } catch (error) {
    stderr.write(`Message processing error: ${error.message}\n`);
    if (line) {
      try {
        const msg = JSON.parse(line);
        sendError(msg.id, error.message);
      } catch (e) {
        // Can't parse message, send generic error
        stderr.write(`Failed to parse message: ${line}\n`);
      }
    }
  }
});

// Handle process termination
process.on("SIGINT", () => {
  stderr.write("MailerLite MCP server shutting down\n");
  process.exit(0);
});

// Log startup
stderr.write("MailerLite MCP server started\n");
