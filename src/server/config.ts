import path from "node:path";
import { fileURLToPath } from "node:url";

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/** Where the references live. Override with TASTE_VAULT_DIR to keep the vault somewhere else. */
export const VAULT_DIR = path.resolve(process.env.TASTE_VAULT_DIR ?? path.join(PROJECT_ROOT, "vault"));

/** npm start passes --production, so it works the same in every shell, Windows included. */
export const isProduction = process.env.NODE_ENV === "production" || process.argv.includes("--production");

function port(value: string | undefined, fallback: number) {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : fallback;
}

/** In development Vite serves the app on CLIENT_PORT and proxies to the API on SERVER_PORT.
 *  In production (npm start) the server serves everything on CLIENT_PORT. Override with PORT and API_PORT. */
export const CLIENT_PORT = port(process.env.PORT, 4173);
export const SERVER_PORT = port(process.env.API_PORT, CLIENT_PORT + 1);

export const IMAGE_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;
