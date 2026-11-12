import path from "node:path";
import { serve } from "@hono/node-server";
import { createApp } from "./app.ts";
import { CLIENT_PORT, PROJECT_ROOT, SERVER_PORT, VAULT_DIR, isProduction } from "./config.ts";
import { Vault } from "./vault.ts";

const vault = new Vault(VAULT_DIR);
await vault.init();

const app = createApp(vault, isProduction ? { clientDir: path.join(PROJECT_ROOT, "dist") } : {});
const port = isProduction ? CLIENT_PORT : SERVER_PORT;

serve({ fetch: app.fetch, hostname: "127.0.0.1", port }, () => {
  console.log(isProduction ? `Taste Vault is open at http://localhost:${port}` : `Vault API listening on ${port}`);
  console.log(`Reading the vault from ${VAULT_DIR}`);
});
