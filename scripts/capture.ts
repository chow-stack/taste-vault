/**
 * Captures a live site for the vault: a 1440x900 screenshot plus the real CSS values in use.
 *
 *   npm run capture -- <inbox id>     capture a link waiting in vault/inbox
 *   npm run capture -- <url>          capture any address into vault/inbox
 *
 * Writes vault/inbox/<id>.jpg (also shown as the inbox thumbnail) and vault/inbox/<id>.capture.json,
 * which Claude Code reads to write the reference's notes with measured values.
 */
import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { normalizeLink } from "../src/shared/links.ts";
import { VAULT_DIR } from "../src/server/config.ts";

const INBOX = path.join(VAULT_DIR, "inbox");
const arg = process.argv[2];
if (!arg) {
  console.error("Usage: npm run capture -- <inbox id | url>");
  process.exit(1);
}

async function target(): Promise<{ id: string; url: string; meta: Record<string, unknown> }> {
  if (/^\d{8}-\d{6}-[a-f0-9]{4}$/.test(arg!)) {
    const meta = JSON.parse(await readFile(path.join(INBOX, `${arg}.json`), "utf8")) as Record<string, unknown>;
    if (meta.source !== "link" || typeof meta.name !== "string") throw new Error(`${arg} is not a link.`);
    const link = normalizeLink(meta.name);
    if ("error" in link) throw new Error(link.error);
    return { id: arg!, url: link.url, meta };
  }
  const link = normalizeLink(arg!);
  if ("error" in link) throw new Error(link.error);
  const now = new Date();
  const stamp = now.toISOString().replace(/\D/g, "").slice(0, 14);
  const id = `${stamp.slice(0, 8)}-${stamp.slice(8)}-${randomBytes(2).toString("hex")}`;
  return { id, url: link.url, meta: { id, source: "link", name: link.url, added: now.toISOString() } };
}

/** Runs in the page: tallies the fonts, colours and radii actually rendered. */
function measure() {
  const hex = (c: string) => {
    const m = c.match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const [r, g, b, a = "1"] = m[1]!.split(/[\s,/]+/).filter(Boolean);
    if (Number(a) < 0.5) return null;
    return `#${[r, g, b].map((v) => Math.round(Number(v)).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
  };
  const tally = () => new Map<string, number>();
  const add = (m: Map<string, number>, k: string | null, w: number) => k && w > 0 && m.set(k, (m.get(k) ?? 0) + w);
  const top = (m: Map<string, number>, n: number) => {
    const total = [...m.values()].reduce((a, b) => a + b, 0) || 1;
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([value, w]) => ({ value, share: Math.round((w / total) * 100) }));
  };
  const fonts = tally(), sizes = tally(), weights = tally(), text = tally(), bg = tally(), radii = tally();
  const vh = innerHeight * 3;

  for (const el of document.querySelectorAll<HTMLElement>("body *")) {
    const box = el.getBoundingClientRect();
    if (!box.width || !box.height || box.top > vh) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.opacity === "0") continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent?.trim() ?? "").join(" ").trim();
    if (own) {
      const w = own.length;
      add(fonts, s.fontFamily.split(",")[0]!.replace(/["']/g, "").trim(), w);
      add(sizes, s.fontSize, w);
      add(weights, s.fontWeight, w);
      add(text, hex(s.color), w);
    }
    add(bg, hex(s.backgroundColor), Math.min(box.width * box.height, innerWidth * innerHeight));
    if (s.borderRadius && s.borderRadius !== "0px") add(radii, s.borderRadius, 1);
  }
  add(bg, hex(getComputedStyle(document.body).backgroundColor) ?? hex(getComputedStyle(document.documentElement).backgroundColor), innerWidth * innerHeight);

  const root = getComputedStyle(document.documentElement);
  const custom: Record<string, string> = {};
  for (const name of root) {
    if (!name.startsWith("--")) continue;
    const value = root.getPropertyValue(name).trim();
    if (/#[0-9a-f]{3,8}\b|rgb|hsl|oklch|px|rem|em\b/i.test(value) && value.length < 80) custom[name] = value;
    if (Object.keys(custom).length >= 80) break;
  }

  return {
    title: document.title,
    fonts: top(fonts, 6),
    fontSizes: top(sizes, 10),
    fontWeights: top(weights, 5),
    textColours: top(text, 8),
    backgroundColours: top(bg, 8),
    radii: top(radii, 6),
    customProperties: custom,
  };
}

const { id, url, meta } = await target();
console.log(`Capturing ${url}`);
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  // tsx compiles measure() with a __name helper that does not exist inside the page
  await page.addInitScript({ content: "window.__name = (fn) => fn;" });
  await page.goto(url, { waitUntil: "load", timeout: 45_000 });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => undefined);
  await page.waitForTimeout(1_200); // let entrance animations settle
  const image = `${id}.jpg`;
  await page.screenshot({ path: path.join(INBOX, image), type: "jpeg", quality: 88 });
  const css = await page.evaluate(measure);
  const capture = { url, finalUrl: page.url(), capturedAt: new Date().toISOString(), viewport: "1440x900", ...css };
  await writeFile(path.join(INBOX, `${id}.capture.json`), `${JSON.stringify(capture, null, 2)}\n`);
  await writeFile(path.join(INBOX, `${id}.json`), `${JSON.stringify({ ...meta, file: image }, null, 2)}\n`);
  console.log(`Saved vault/inbox/${image} and vault/inbox/${id}.capture.json`);
} finally {
  await browser.close();
}
