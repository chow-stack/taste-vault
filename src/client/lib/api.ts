import type { VaultState } from "../../shared/types.ts";

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Can't reach the vault server. Is npm run dev still running?");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `The vault server answered ${res.status}.`);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  vault: () => call<VaultState>("/api/vault"),
  addFiles(files: File[]) {
    const form = new FormData();
    files.forEach((f) => form.append("files", f));
    return call<unknown>("/api/inbox", { method: "POST", body: form });
  },
  addLink: (url: string) => call<unknown>("/api/inbox/link", json("POST", { url })),
  removeInbox: (id: string) => call<void>(`/api/inbox/${encodeURIComponent(id)}`, { method: "DELETE" }),
  saveNote: (slug: string, note: string) => call<void>(`/api/references/${encodeURIComponent(slug)}/note`, json("PUT", { note })),
  /** Calls back whenever the vault folder changes on disk. Returns a function that stops listening. */
  onChange(fn: () => void) {
    let events: EventSource | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const connect = () => {
      events = new EventSource("/api/events");
      events.addEventListener("change", fn);
      // on every (re)connect, catch up on anything missed while away
      events.addEventListener("open", fn);
      // EventSource gives up for good if the server answers with an error (e.g. while it restarts), so start over
      events.addEventListener("error", () => {
        if (events?.readyState !== EventSource.CLOSED || stopped) return;
        retry = setTimeout(connect, 2000);
      });
    };
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      events?.close();
    };
  },
};
