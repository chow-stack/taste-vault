import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { CLIENT_PORT, SERVER_PORT } from "./src/server/config.ts";

const server = `http://127.0.0.1:${SERVER_PORT}`;

export default defineConfig({
  root: "src/client",
  plugins: [react()],
  build: { outDir: "../../dist", emptyOutDir: true },
  server: {
    host: "127.0.0.1",
    port: CLIENT_PORT,
    strictPort: true,
    // the API and the vault's images come from the Hono server
    proxy: { "/api": server, "/files": server },
  },
});
