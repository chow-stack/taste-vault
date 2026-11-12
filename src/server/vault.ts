/** Everything that touches the vault folder on disk.
 *
 *  vault/references/<slug>.md   the written notes, one file per reference
 *  vault/references/<image>     its image
 *  vault/inbox/<id>.json        something waiting for Claude Code to write its notes
 *  vault/inbox/<id>.<ext>       the dropped screenshot, for screenshot items
 */
import { randomBytes } from "node:crypto";
import { watch, type FSWatcher } from "node:fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { imageSize } from "image-size";
import { z } from "zod";
import { normalizeLink } from "../shared/links.ts";
import type { InboxItem, Reference, VaultState } from "../shared/types.ts";
import { IMAGE_TYPES, MAX_UPLOAD_BYTES } from "./config.ts";
import { parseReference, writeNote } from "./markdown.ts";

export class VaultError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409 | 413 = 400) {
    super(message);
  }
}

const SLUG = /^[\w-]+$/;
const INBOX_ID = /^\d{8}-\d{6}-[a-f0-9]{4}$/;

const InboxFile = z.object({
  id: z.string().regex(INBOX_ID),
  source: z.enum(["screenshot", "link"]),
  name: z.string(),
  file: z.string().optional(),
  added: z.string(),
});

const NOT_AN_IMAGE = "Only image files can go in. Try a PNG, JPG or WebP screenshot.";
const DETECTED: Record<string, string> = { png: ".png", jpg: ".jpg", webp: ".webp", gif: ".gif", heif: ".avif" };

/** The file extension that matches what the bytes actually are, or undefined if they are not a known image. */
function imageExt(bytes: Uint8Array) {
  try {
    const { type } = imageSize(bytes);
    return type ? DETECTED[type] : undefined;
  } catch {
    return undefined;
  }
}

/** Writes to a temporary file first, so a reader never sees half a file. */
async function writeAtomic(file: string, data: string | Uint8Array) {
  const tmp = `${file}.${randomBytes(3).toString("hex")}.tmp`;
  await writeFile(tmp, data);
  await rename(tmp, file);
}

function newInboxId(now = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `${date}-${time}-${randomBytes(2).toString("hex")}`;
}

export class Vault {
  readonly refsDir: string;
  readonly inboxDir: string;
  private ratios = new Map<string, { mtime: number; ratio: number }>();

  constructor(readonly root: string) {
    this.refsDir = path.join(root, "references");
    this.inboxDir = path.join(root, "inbox");
  }

  async init() {
    await mkdir(this.refsDir, { recursive: true });
    await mkdir(this.inboxDir, { recursive: true });
  }

  async state(): Promise<VaultState> {
    const [references, inbox] = await Promise.all([this.references(), this.inbox()]);
    return { references, inbox, root: this.root };
  }

  async references(): Promise<Reference[]> {
    const files = (await readdir(this.refsDir)).filter((f) => f.endsWith(".md")).sort();
    const out = await Promise.all(
      files.map(async (f) => {
        const slug = f.slice(0, -3);
        try {
          const parsed = parseReference(await readFile(path.join(this.refsDir, f), "utf8"), slug);
          const { imageFile, ...rest } = parsed;
          return {
            ...rest,
            image: `/files/references/${encodeURIComponent(imageFile)}`,
            ratio: await this.ratio(path.join(this.refsDir, imageFile)),
            file: path.relative(path.dirname(this.root), path.join(this.refsDir, f)),
          } satisfies Reference;
        } catch (err) {
          console.warn(`Skipping ${f}: ${err instanceof Error ? err.message : err}`);
          return null;
        }
      }),
    );
    return out.filter((r) => r !== null);
  }

  /** Image proportions, cached until the file changes. Missing or unreadable images fall back to 4:3. */
  private async ratio(file: string) {
    try {
      const { mtimeMs } = await stat(file);
      const hit = this.ratios.get(file);
      if (hit?.mtime === mtimeMs) return hit.ratio;
      const { width, height } = imageSize(await readFile(file));
      const ratio = width && height ? width / height : 4 / 3;
      this.ratios.set(file, { mtime: mtimeMs, ratio });
      return ratio;
    } catch {
      return 4 / 3;
    }
  }

  async inbox(): Promise<InboxItem[]> {
    const files = (await readdir(this.inboxDir)).filter((f) => f.endsWith(".json") && !f.endsWith(".capture.json")).sort();
    const items = await Promise.all(
      files.map(async (f) => {
        try {
          const item = InboxFile.parse(JSON.parse(await readFile(path.join(this.inboxDir, f), "utf8")));
          return {
            id: item.id,
            source: item.source,
            name: item.name,
            added: item.added,
            ...(item.file ? { image: `/files/inbox/${encodeURIComponent(item.file)}` } : {}),
          } satisfies InboxItem;
        } catch {
          return null;
        }
      }),
    );
    return items.filter((i) => i !== null);
  }

  async addScreenshot(file: File): Promise<InboxItem> {
    const claimed = IMAGE_TYPES[file.type];
    if (!claimed) throw new VaultError(NOT_AN_IMAGE);
    if (file.size > MAX_UPLOAD_BYTES) throw new VaultError("That image is over 25 MB. Try a smaller screenshot.", 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    // the browser's file type is only a claim: check the bytes really are that kind of image
    if (imageExt(bytes) !== claimed) throw new VaultError(NOT_AN_IMAGE);
    const id = newInboxId();
    const name = path.basename(file.name || `screenshot${claimed}`).slice(0, 200);
    const meta = { id, source: "screenshot" as const, name, file: `${id}${claimed}`, added: new Date().toISOString() };
    await writeAtomic(path.join(this.inboxDir, meta.file), bytes);
    await writeAtomic(path.join(this.inboxDir, `${id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    return { id, source: "screenshot", name, added: meta.added, image: `/files/inbox/${meta.file}` };
  }

  async addLink(raw: string): Promise<InboxItem> {
    const result = normalizeLink(raw);
    if ("error" in result) throw new VaultError(result.error);
    const [inbox, refs] = await Promise.all([this.inbox(), this.references()]);
    if (inbox.some((i) => i.name === result.url)) throw new VaultError("That link is already waiting.", 409);
    if (refs.some((r) => r.url === result.url)) throw new VaultError("That site is already in the vault.", 409);
    const meta = { id: newInboxId(), source: "link" as const, name: result.url, added: new Date().toISOString() };
    await writeAtomic(path.join(this.inboxDir, `${meta.id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
    return meta;
  }

  async removeInbox(id: string) {
    if (!INBOX_ID.test(id)) throw new VaultError("Unknown item.", 404);
    const files = (await readdir(this.inboxDir)).filter((f) => f.startsWith(`${id}.`));
    if (!files.length) throw new VaultError("That item is no longer waiting.", 404);
    await Promise.all(files.map((f) => rm(path.join(this.inboxDir, f), { force: true })));
  }

  async setNote(slug: string, note: string) {
    if (!SLUG.test(slug)) throw new VaultError("Unknown reference.", 404);
    const file = path.join(this.refsDir, `${slug}.md`);
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      throw new VaultError("That reference is no longer in the vault.", 404);
    }
    await writeAtomic(file, writeNote(text, note));
  }

  /** Calls back (debounced) whenever anything in the vault changes, including edits by Claude Code. */
  watch(onChange: () => void): FSWatcher {
    let timer: NodeJS.Timeout | undefined;
    return watch(this.root, { recursive: true }, (_event, name) => {
      if (name?.endsWith(".tmp")) return;
      clearTimeout(timer);
      timer = setTimeout(onChange, 120);
    });
  }
}
