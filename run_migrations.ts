import { readFileSync, readdirSync } from "fs";
import { execSync } from "child_process";

// Get list of applied migrations
const stdout = execSync(
  'npx @modelcontextprotocol/inspector mcp_supabase-mcp-server_list_migrations \'{"project_id":"nkfimvovosdehmyyjubn"}\'',
  { encoding: "utf-8" }
);
console.log(stdout);

// Script logic omitted for brevity as I will just use the CLI
