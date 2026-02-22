import { execSync } from "child_process";
import { readFileSync, readdirSync } from "fs";
import path from "path";

const PROJECT_ID = "nkfimvovosdehmyyjubn";
const MIGRATIONS_DIR = path.resolve("./supabase/migrations");

function applyMigrations() {
  try {
    // 1. Get applied migrations
    const listOutput = execSync(
      `npx @modelcontextprotocol/inspector --server supabase-mcp-server --tool list_migrations '{"project_id": "${PROJECT_ID}"}'`
    );
    const appliedData = JSON.parse(listOutput.toString());
    const appliedVersions = new Set(appliedData.map((m) => m.version));

    // 2. Get local migrations
    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    // 3. Find unapplied migrations
    for (const file of files) {
      const match = file.match(/^(\d+)/);
      if (!match) continue;

      const version = match[1];
      if (!appliedVersions.has(version)) {
        console.log(`Applying missing migration: ${file}...`);
        const query = readFileSync(path.join(MIGRATIONS_DIR, file), "utf-8");

        // Use MCP to apply
        const applyCmd = `npx @modelcontextprotocol/inspector --server supabase-mcp-server --tool apply_migration '{"project_id": "${PROJECT_ID}", "name": "${file.replace(".sql", "")}", "query": ${JSON.stringify(query)}}'`;
        execSync(applyCmd);
        console.log(`Successfully applied: ${file}`);
      }
    }
  } catch (e) {
    console.error("Migration deployment failed:", e);
  }
}

applyMigrations();
