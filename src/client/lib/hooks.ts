import { useCallback, useEffect, useState, type RefObject } from "react";
import type { VaultState } from "../../shared/types.ts";
import { api } from "./api.ts";

/** The vault's contents, kept fresh as files change on disk. */
export function useVault() {
  const [state, setState] = useState<VaultState | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setState(await api.vault());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);
  useEffect(() => api.onChange(() => void reload()), [reload]);
  return { state, error, reload };
}

type Theme = "dark" | "light";
const THEME_KEY = "taste-vault:theme";
const root = document.documentElement;

/** Light or dark. Follows the system until you choose; the first paint is set in index.html. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => (root.dataset.theme === "light" ? "light" : "dark"));

  useEffect(() => {
    if (root.dataset.theme === theme) return;
    root.classList.add("theming");
    root.dataset.theme = theme;
    const t = setTimeout(() => root.classList.remove("theming"), 500);
    return () => clearTimeout(t);
  }, [theme]);

  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: light)");
    const follow = (e: MediaQueryListEvent) => {
      let saved: string | null = null;
      try {
        saved = localStorage.getItem(THEME_KEY);
      } catch {
        /* storage blocked: keep following the system */
      }
      if (!saved) setTheme(e.matches ? "light" : "dark");
    };
    media.addEventListener("change", follow);
    return () => media.removeEventListener("change", follow);
  }, []);

  const toggle = useCallback(() => {
    setTheme((t) => {
      const next = t === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        /* storage blocked: the choice lasts for this visit */
      }
      return next;
    });
  }, []);
  return { theme, toggle };
}

/** Width of an element, updated as it resizes. */
export function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => entry && setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

export function useMedia(query: string) {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const on = () => setMatches(m.matches);
    m.addEventListener("change", on);
    return () => m.removeEventListener("change", on);
  }, [query]);
  return matches;
}

/** Copies text, falling back to a hidden textarea where the clipboard API is blocked. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const t = Object.assign(document.createElement("textarea"), { value: text });
    t.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(t);
    t.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      /* no clipboard at all */
    }
    t.remove();
    return ok;
  }
}
