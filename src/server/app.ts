import path from "node:path";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { csrf } from "hono/csrf";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { streamSSE } from "hono/streaming";
import { z } from "zod";
import { IMAGE_TYPES, MAX_UPLOAD_BYTES } from "./config.ts";
import { Vault, VaultError } from "./vault.ts";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const IMAGE_EXT =new Set(Object.values(IMAGE_TYPES).concat(".jpeg"));
const LinkBody = z.object({ url: z.string().max(2000) });
const NoteBody = z.object({ note: z.string().max(20000) });

export interface AppOptions {
  /** Folder with the built client, served in production. */
  clientDir?: string;
}

export function createApp(vault: Vault, options: AppOptions = {}) {
  const app = new Hono();
  const listeners = new Set<() => void>();
  vault.watch(() => listeners.forEach((fn) => fn()));

  app.onError((err, c) => {
    if (err instanceof VaultError) return c.json({ error: err.message }, err.status);
    if (err instanceof HTTPException) return c.json({ error: err.message || "That request was refused." }, err.status);
    if (err instanceof z.ZodError) return c.json({ error: "That request was not understood." }, 400);
    console.error(err);
    return c.json({ error: "Something went wrong on the vault server." }, 500);
  });

  // The server only listens on 127.0.0.1, but a web page in the browser can still reach it.
  // A site that points its own domain at 127.0.0.1 (DNS rebinding) would look same-origin, so only
  // answer requests addressed to this machine by name.
  app.use("*", async (c, next) => {
    // the Node adapter builds the request URL from the Host header
    if (!LOCAL_HOSTS.has(new URL(c.req.url).hostname)) return c.json({ error: "Taste Vault only answers on localhost." }, 403);
    return next();
  });
  app.use("*", secureHeaders({ crossOriginResourcePolicy: "same-origin", referrerPolicy: "no-referrer" }));
  // Refuse writes that do not come from the app itself.
  app.use("/api/*", csrf());

  app.get("/api/vault", async (c) => c.json(await vault.state()));

  app.post(
    "/api/inbox",
    bodyLimit({ maxSize: MAX_UPLOAD_BYTES * 10, onError: (c) => c.json({ error: "Those files are too large together." }, 413) }),
    async (c) => {
      const form = await c.req.formData();
      const files = form.getAll("files").filter((f): f is File => f instanceof File);
      if (!files.length) throw new VaultError("Only image files can go in. Try a PNG, JPG or WebP screenshot.");
      const added = [];
      for (const f of files) added.push(await vault.addScreenshot(f));
      return c.json({ added }, 201);
    },
  );

  app.post("/api/inbox/link", async (c) => {
    const { url } = LinkBody.parse(await c.req.json());
    return c.json({ added: await vault.addLink(url) }, 201);
  });

  app.delete("/api/inbox/:id", async (c) => {
    await vault.removeInbox(c.req.param("id"));
    return c.body(null, 204);
  });

  app.put("/api/references/:slug/note", async (c) => {
    const { note } = NoteBody.parse(await c.req.json());
    await vault.setNote(c.req.param("slug"), note);
    return c.body(null, 204);
  });

  /** Tells open tabs to reload whenever a file in the vault changes. */
  app.get("/api/events", (c) =>
    streamSSE(c, async (stream) => {
      const send = () => void stream.writeSSE({ event: "change", data: "" });
      listeners.add(send);
      stream.onAbort(() => void listeners.delete(send));
      while (!stream.aborted) {
        await stream.writeSSE({ event: "ping", data: "" });
        await stream.sleep(25_000);
      }
    }),
  );

  // images only: the notes are read through the API
  app.use("/files/*", async (c, next) => {
    if (!IMAGE_EXT.has(path.extname(c.req.path).toLowerCase())) return c.notFound();
    return next();
  });
  app.use(
    "/files/*",
    serveStatic({
      root: path.relative(process.cwd(), vault.root),
      rewriteRequestPath: (p) => p.replace(/^\/files/, ""),
    }),
  );

  if (options.clientDir) {
    const root = path.relative(process.cwd(), options.clientDir);
    app.use("/*", serveStatic({ root }));
    app.get("*", serveStatic({ root, path: "index.html" }));
  }

  return app;
}
