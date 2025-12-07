#!/usr/bin/env node

import MailerLite from "@mailerlite/mailerlite-nodejs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

// Initialize MailerLite client
const mailerLite = new MailerLite({
  api_key: process.env.MAILERLITE_API_TOKEN,
});

const server = new Server(
  {
    name: "mailerlite-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define MCP tools for MailerLite
server.setRequestHandler("tools/list", async () => {
  return {
    tools: [
      {
        name: "get_subscribers",
        description: "Get list of subscribers",
        inputSchema: {
          type: "object",
          properties: {
            limit: {
              type: "number",
              description: "Number of subscribers to return (max 1000)",
              default: 50,
            },
            offset: {
              type: "number",
              description: "Number of subscribers to skip",
              default: 0,
            },
          },
        },
      },
      {
        name: "create_subscriber",
        description: "Create a new subscriber",
        inputSchema: {
          type: "object",
          properties: {
            email: {
              type: "string",
              description: "Subscriber email address",
            },
            name: {
              type: "string",
              description: "Subscriber name (optional)",
            },
            fields: {
              type: "object",
              description: "Custom fields for subscriber",
            },
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
            offset: {
              type: "number",
              description: "Number of campaigns to skip",
              default: 0,
            },
            filter: {
              type: "string",
              description: "Filter campaigns by status (sent, draft, outbox, etc.)",
            },
          },
        },
      },
      {
        name: "create_campaign",
        description: "Create a new email campaign",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Campaign name",
            },
            subject: {
              type: "string",
              description: "Email subject line",
            },
            from: {
              type: "object",
              properties: {
                name: {
                  type: "string",
                  description: "Sender name",
                },
                email: {
                  type: "string",
                  description: "Sender email",
                },
              },
              required: ["email"],
            },
            content: {
              type: "string",
              description: "Email HTML content",
            },
          },
          required: ["name", "subject", "from", "content"],
        },
      },
      {
        name: "send_campaign",
        description: "Send a campaign",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: {
              type: "string",
              description: "Campaign ID to send",
            },
          },
          required: ["campaign_id"],
        },
      },
      {
        name: "get_campaign_stats",
        description: "Get campaign statistics",
        inputSchema: {
          type: "object",
          properties: {
            campaign_id: {
              type: "string",
              description: "Campaign ID",
            },
          },
          required: ["campaign_id"],
        },
      },
    ],
  };
});

server.setRequestHandler("tools/call", async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_subscribers":
        const subscribers = await mailerLite.subscribers.get({
          limit: args.limit || 50,
          offset: args.offset || 0,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(subscribers, null, 2),
            },
          ],
        };

      case "create_subscriber":
        const newSubscriber = await mailerLite.subscribers.create({
          email: args.email,
          name: args.name,
          fields: args.fields || {},
        });
        return {
          content: [
            {
              type: "text",
              text: `Subscriber created successfully: ${JSON.stringify(newSubscriber, null, 2)}`,
            },
          ],
        };

      case "get_campaigns":
        const campaigns = await mailerLite.campaigns.get({
          limit: args.limit || 50,
          offset: args.offset || 0,
          filter: args.filter ? { status: args.filter } : undefined,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(campaigns, null, 2),
            },
          ],
        };

      case "create_campaign":
        const campaign = await mailerLite.campaigns.create({
          name: args.name,
          subject: args.subject,
          from: args.from,
          content: args.content,
          type: "regular",
        });
        return {
          content: [
            {
              type: "text",
              text: `Campaign created successfully: ${JSON.stringify(campaign, null, 2)}`,
            },
          ],
        };

      case "send_campaign":
        const sentCampaign = await mailerLite.campaigns.send(args.campaign_id);
        return {
          content: [
            {
              type: "text",
              text: `Campaign sent successfully: ${JSON.stringify(sentCampaign, null, 2)}`,
            },
          ],
        };

      case "get_campaign_stats":
        const stats = await mailerLite.campaigns.getStats(args.campaign_id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`,
        },
      ],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MailerLite MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
