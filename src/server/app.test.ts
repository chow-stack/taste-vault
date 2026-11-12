import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { VaultState } from "../shared/types.ts";
import { createApp } from "./app.ts";
import { Vault } from "./vault.ts";

// a 1x1 PNG
const PNG = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
  (c) => c.charCodeAt(0),
);
const ORIGIN = "http://localhost";

let dir: string;
let app: ReturnType<typeof createApp>;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "taste-vault-"));
  const vault = new Vault(dir);
  await vault.init();
  await writeFile(path.join(dir, "references", "01-one.md"), "---\ntitle: One\nimage: 01-one.png\npage: Portfolio\nlook: Painterly\n---\n\n# One\n\n> A vibe.\n\n## My note\n");
  await writeFile(path.join(dir, "references", "01-one.png"), PNG);
  app = createApp(vault);
});
afterEach(() => rm(dir, { recursive: true, force: true }));

const state = async () => (await (await app.request("/api/vault")).json()) as VaultState;
const post = (url: string, body: BodyInit, headers: Record<string, string> = {}) =>
  app.request(url, { method: "POST", body, headers: { origin: ORIGIN, ...headers } });

describe("the vault API", () => {
  it("lists references with image proportions", async () => {
    const { references } = await state();
    expect(references).toHaveLength(1);
    expect(references[0]).toMatchObject({ slug: "01-one", title: "One", ratio: 1, image: "/files/references/01-one.png" });
  });

  it("saves a note into the file", async () => {
    const res = await app.request("/api/references/01-one/note", {
      method: "PUT",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ note: "Keep the margins." }),
    });
    expect(res.status).toBe(204);
    expect(await readFile(path.join(dir, "references", "01-one.md"), "utf8")).toContain("## My note\n\nKeep the margins.\n");
  });

  it("refuses unknown or unsafe slugs", async () => {
    const res = await app.request("/api/references/..%2F..%2Fetc/note", {
      method: "PUT",
      headers: { origin: ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ note: "x" }),
    });
    expect(res.status).toBe(404);
  });

  it("puts screenshots and links in the inbox, and removes them", async () => {
    const form = new FormData();
    form.append("files", new File([PNG], "shot.png", { type: "image/png" }));
    expect((await post("/api/inbox", form)).status).toBe(201);
    expect((await post("/api/inbox/link", JSON.stringify({ url: "linear.app" }), { "content-type": "application/json" })).status).toBe(201);
    const dupe = await post("/api/inbox/link", JSON.stringify({ url: "https://linear.app/" }), { "content-type": "application/json" });
    expect(dupe.status).toBe(409);

    const { inbox } = await state();
    expect(inbox.map((i) => [i.source, i.name])).toEqual(
      expect.arrayContaining([
        ["screenshot", "shot.png"],
        ["link", "https://linear.app/"],
      ]),
    );
    for (const i of inbox) expect((await app.request(`/api/inbox/${i.id}`, { method: "DELETE", headers: { origin: ORIGIN } })).status).toBe(204);
    expect(await readdir(path.join(dir, "inbox"))).toEqual([]);
  });

  it("rejects files that are not images", async () => {
    const form = new FormData();
    form.append("files", new File(["hi"], "notes.txt", { type: "text/plain" }));
    const res = await post("/api/inbox", form);
    expect(res.status).toBe(400);
  });

  it("takes video clips, and refuses files that only claim to be one", async () => {
    // the start of an MP4: a box size, then "ftyp" and a brand
    const mp4 = Uint8Array.from([0, 0, 0, 24, ...new TextEncoder().encode("ftypisom"), 0, 0, 2, 0]);
    const form = new FormData();
    form.append("files", new File([mp4], "hover.mp4", { type: "video/mp4" }));
    expect((await post("/api/inbox", form)).status).toBe(201);
    const [clip] = (await state()).inbox;
    expect(clip).toMatchObject({ source: "video", name: "hover.mp4" });
    expect(clip?.video).toMatch(/^\/files\/inbox\/.+\.mp4$/);
    expect((await app.request(clip!.video!)).status).toBe(200);

    const fake = new FormData();
    fake.append("files", new File(["<script>alert(1)</script>"], "fake.webm", { type: "video/webm" }));
    expect((await post("/api/inbox", fake)).status).toBe(400);
  });

  it("refuses writes from other sites", async () => {
    const res = await post("/api/inbox/link", "url=linear.app", { origin: "https://evil.example", "content-type": "application/x-www-form-urlencoded" });
    expect(res.status).toBe(403);
  });

  it("rejects files that only claim to be images", async () => {
    const form = new FormData();
    form.append("files", new File(["<script>alert(1)</script>"], "fake.png", { type: "image/png" }));
    expect((await post("/api/inbox", form)).status).toBe(400);
  });

  it("only answers when addressed as localhost, so other sites cannot rebind to it", async () => {
    expect((await app.request("http://127.0.0.1:4174/api/vault")).status).toBe(200);
    expect((await app.request("http://evil.example:4174/api/vault")).status).toBe(403);
    const write = await app.request("http://evil.example:4174/api/inbox/link", {
      method: "POST",
      headers: { origin: "http://evil.example:4174", "content-type": "application/json" },
      body: JSON.stringify({ url: "linear.app" }),
    });
    expect(write.status).toBe(403);
  });

  it("serves images but not the notes files", async () => {
    expect((await app.request("/files/references/01-one.png")).status).toBe(200);
    expect((await app.request("/files/references/01-one.md")).status).toBe(404);
  });
});
