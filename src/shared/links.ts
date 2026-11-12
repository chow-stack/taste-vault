/** Turns what someone pasted into a clean web address, or explains why it is not one. */
export function normalizeLink(raw: string): { url: string } | { error: string } {
  let value = raw.trim();
  if (!value) return { error: "Paste a web address first." };
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { error: "That does not look like a web address. Try something like linear.app." };
  }
  if (!/^[^.\s]+(\.[^.\s]+)+$/.test(url.hostname)) {
    return { error: "That does not look like a web address. Try something like linear.app." };
  }
  url.hash = "";
  return { url: url.href };
}
