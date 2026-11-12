/** Reading and writing a reference's notes file. The format is documented in CLAUDE.md. */
import matter from "gray-matter";
import { z } from "zod";
import type { Reference, Swatch } from "../shared/types.ts";

const list = z.preprocess((v) => (v == null ? [] : Array.isArray(v) ? v : [v]), z.array(z.coerce.string()));

const Frontmatter = z.object({
  id: z.coerce.string().optional(),
  title: z.string().min(1),
  kind: z.string().default(""),
  source: z.enum(["screenshot", "link"]).default("screenshot"),
  url: z.url().optional(),
  // a plain file name next to the notes, never a path
  image: z.string().regex(/^[\w.-]+$/).refine((f) => !f.startsWith("."), "The image must be a file name."),
  page: z.string().default("Unsorted"),
  look: z.string().default("Unsorted"),
  tags: list.default([]),
  measured: z.boolean().default(false),
});

export type ParsedReference = Omit<Reference, "image" | "ratio" | "file"> & { imageFile: string };

/** Splits the body into its "## Heading" sections. Text before the first heading is under "". */
function sections(body: string): Map<string, string> {
  const out = new Map<string, string>();
  let name = "";
  let lines: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const heading = /^##\s+(.+?)\s*$/.exec(line);
    if (heading?.[1]) {
      out.set(name, lines.join("\n").trim());
      name = heading[1].toLowerCase();
      lines = [];
    } else lines.push(line);
  }
  out.set(name, lines.join("\n").trim());
  return out;
}

const bullets = (text = "") =>
  text
    .split("\n")
    .map((l) => /^\s*[-*]\s+(.*)$/.exec(l)?.[1]?.trim())
    .filter((l): l is string => !!l);

function palette(text = ""): Swatch[] {
  return bullets(text).flatMap((line) => {
    const m = /^(.*?):?\s*`?(#[0-9a-f]{3,8})`?/i.exec(line);
    return m?.[2] ? [{ name: m[1]?.trim() || m[2], hex: m[2].toUpperCase() }] : [];
  });
}

// gray-matter runs "---js" frontmatter as code. Notes files may come from other people, so only YAML is read.
const refuse = () => {
  throw new Error("Only YAML frontmatter is allowed.");
};
const YAML_ONLY = { engines: { js: refuse, javascript: refuse, coffee: refuse, coffeescript: refuse, cson: refuse } };

export function parseReference(text: string, slug: string): ParsedReference {
  const { data, content } = matter(text, YAML_ONLY);
  const fm = Frontmatter.parse(data);
  const s = sections(content);
  const intro = s.get("") ?? "";
  return {
    id: fm.id ?? /^(\d+)/.exec(slug)?.[1] ?? slug,
    slug,
    title: fm.title,
    kind: fm.kind,
    source: fm.source,
    ...(fm.url ? { url: fm.url } : {}),
    imageFile: fm.image,
    page: fm.page,
    look: fm.look,
    tags: fm.tags,
    measured: fm.measured,
    vibe: /^>\s*(.+)$/m.exec(intro)?.[1]?.trim() ?? "",
    palette: palette(s.get("palette")),
    type: s.get("type") ?? "",
    steal: bullets(s.get("steal this")),
    note: s.get("my note") ?? "",
  };
}

/** Returns the file text with the "## My note" section replaced, keeping everything else as it was. */
export function writeNote(text: string, note: string): string {
  const clean = note.replace(/\r\n/g, "\n").trim();
  // a line that starts with "## " would become a new section, so indent it
  const safe = clean.replace(/^##/gm, " ##");
  const block = `## My note\n${safe ? `\n${safe}\n` : ""}`;
  const at = /^## My note[ \t]*$/m.exec(text);
  if (!at) return `${text.replace(/\s*$/, "")}\n\n${block}`;
  const rest = text.slice(at.index + at[0].length);
  const next = /^## /m.exec(rest);
  const after = next ? `\n${rest.slice(next.index)}` : "";
  return text.slice(0, at.index) + block + after;
}
