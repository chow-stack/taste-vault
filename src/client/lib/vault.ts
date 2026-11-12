/** Pure helpers for sorting, searching and describing references. */
import type { InboxItem, Reference, Source } from "../../shared/types.ts";

export interface Filters {
  page: string;
  look: string;
  source: Source | "";
  q: string;
}

export const NO_FILTERS: Filters = { page: "", look: "", source: "", q: "" };

/** Counts per value, biggest group first. */
export function groups(refs: Reference[], key: "page" | "look"): [string, number][] {
  const counts = new Map<string, number>();
  refs.forEach((r) => counts.set(r[key], (counts.get(r[key]) ?? 0) + 1));
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export function filterRefs(refs: Reference[], f: Filters): Reference[] {
  const words = f.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return refs.filter((r) => {
    if (f.page && r.page !== f.page) return false;
    if (f.look && r.look !== f.look) return false;
    if (f.source && r.source !== f.source) return false;
    if (!words.length) return true;
    const text = [r.title, r.kind, r.vibe, r.type, r.page, r.look, ...r.tags, ...r.motion, r.note].join(" ").toLowerCase();
    return words.every((w) => text.includes(w));
  });
}

/** Deals frames into columns left to right, so a short list fills the first row instead of stacking. */
export function deal<T>(items: T[], columns: number): T[][] {
  const out: T[][] = Array.from({ length: Math.max(1, columns) }, () => []);
  items.forEach((item, i) => out[i % out.length]!.push(item));
  return out;
}

/** How many columns fit, given the most wanted and the narrowest a frame may get. */
export function columnCount(width: number, wanted: number, gap: number, minFrame = 150): number {
  return Math.max(1, Math.min(wanted, Math.floor((width + gap) / (minFrame + gap))));
}

/** The text copied for Claude from the inspector. */
export function brief(r: Reference, root: string): string {
  const estimated = r.measured ? "read from the live CSS" : r.source === "video" ? "estimated from a clip" : "estimated from a screenshot";
  return [
    `# ${r.title} (${r.kind || r.page}, from a ${r.source})`,
    `Notes file: ${root}/references/${r.slug}.md`,
    ...(r.url ? [`Live site: ${r.url}`] : []),
    ...(r.video ? [`Clip: ${root}/references/${decodeURIComponent(r.video.split("/").pop()!)}`] : []),
    "",
    `> ${r.vibe}`,
    "",
    `Palette (${estimated}): ${r.palette.map((p) => `${p.name} ${p.hex}`).join(", ")}`,
    `Type: ${r.type}`,
    "Steal this:",
    ...r.steal.map((s) => `- ${s}`),
    ...(r.motion.length ? ["Motion:", ...r.motion.map((m) => `- ${m}`)] : []),
    ...(r.note.trim() ? ["", `My note: ${r.note.trim()}`] : []),
  ].join("\n");
}

/** The text copied for Claude from the inbox. */
export function inboxRequest(items: InboxItem[], root: string): string {
  const shots = items.filter((i) => i.source === "screenshot");
  const links = items.filter((i) => i.source === "link");
  const clips = items.filter((i) => i.source === "video");
  return [
    `Process my Taste Vault inbox (${root}/inbox): write the notes for each item and file it into the references.`,
    ...(shots.length ? ["", "Screenshots:", ...shots.map((s) => `- ${s.name}`)] : []),
    ...(links.length ? ["", "Links:", ...links.map((l) => `- ${l.name}`)] : []),
    ...(clips.length ? ["", "Clips (write up the motion too):", ...clips.map((c) => `- ${c.name}`)] : []),
  ].join("\n");
}

export const pad2 = (n: number) => String(n).padStart(2, "0");
