import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ContactSheet } from "./components/ContactSheet.tsx";
import { Inspector } from "./components/Inspector.tsx";
import { Rail } from "./components/Rail.tsx";
import { Toolbar } from "./components/Toolbar.tsx";
import { api } from "./lib/api.ts";
import { useMedia, useTheme, useVault, useWidth } from "./lib/hooks.ts";
import { GAP, INSPECTOR_WIDTH, NARROW, PAD, RAIL_WIDTH } from "./lib/layout.ts";
import { NO_FILTERS, columnCount, filterRefs, type Filters } from "./lib/vault.ts";
import "./App.css";

const isTyping = (el: Element | null) => !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);

export function App() {
  const { state, error, reload } = useVault();
  const { theme, toggle: toggleTheme } = useTheme();
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [large, setLarge] = useState(false);
  /** The reference in the open inspector, or null when it is closed. */
  const [selected, setSelected] = useState<string | null>(null);
  /** What the inspector shows; kept after closing so it can slide away with its contents. */
  const [shown, setShown] = useState<string | null>(null);
  const [addError, setAddError] = useState("");

  const appRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const appWidth = useWidth(appRef);
  const narrow = useMedia(NARROW);

  const refs = useMemo(() => state?.references ?? [], [state]);
  const visible = useMemo(() => filterRefs(refs, filters), [refs, filters]);
  const open = selected !== null;
  const reference = refs.find((r) => r.slug === shown) ?? null;

  // Columns are worked out from the sheet's width once the inspector has finished moving,
  // so they change once, as it starts, rather than jumping during the slide.
  const sheetWidth = narrow ? appWidth : appWidth - RAIL_WIDTH - (open ? INSPECTOR_WIDTH + 1 : 0);
  const columns = columnCount(sheetWidth - 2 * PAD, large ? 2 : 3, GAP);

  const pick = useCallback(
    (slug: string) => {
      if (open && slug === selected) return setSelected(null);
      if (!open) inspectorRef.current?.focus({ preventScroll: true });
      setSelected(slug);
      setShown(slug);
    },
    [open, selected],
  );

  const close = useCallback(() => {
    if (!selected) return;
    setSelected(null);
    if (inspectorRef.current?.contains(document.activeElement)) {
      document.querySelector<HTMLElement>(`[data-slug="${CSS.escape(selected)}"]`)?.focus({ preventScroll: true });
    }
  }, [selected]);

  /** Changing filters closes the inspector if its reference drops off the sheet. */
  const updateFilters = useCallback(
    (update: (f: Filters) => Filters) => {
      const next = update(filters);
      setFilters(next);
      if (selected && !filterRefs(refs, next).some((r) => r.slug === selected)) setSelected(null);
    },
    [filters, refs, selected],
  );

  const step = useCallback(
    (by: number) => {
      if (!open || !visible.length) return;
      const i = visible.findIndex((r) => r.slug === selected);
      const next = visible[(i + by + visible.length) % visible.length]!;
      setSelected(next.slug);
      setShown(next.slug);
    },
    [open, selected, visible],
  );

  const addFiles = useCallback(
    async (list: FileList | File[]) => {
      const files = [...list].filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
      if (!files.length) return setAddError("Only images and video clips can go in. Try a screenshot, or an MP4, MOV or WebM clip.");
      try {
        await api.addFiles(files);
        setAddError("");
        await reload();
      } catch (err) {
        setAddError(err instanceof Error ? err.message : String(err));
      }
    },
    [reload],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTyping(document.activeElement)) {
        if (e.key === "Escape") (document.activeElement as HTMLElement).blur();
        return;
      }
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (e.key.toLowerCase() === "l") toggleTheme();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [close, step, toggleTheme]);

  // a screenshot or clip dropped anywhere on the window goes into the inbox
  useEffect(() => {
    const over = (e: DragEvent) => e.preventDefault();
    const drop = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer?.files.length) void addFiles(e.dataTransfer.files);
    };
    addEventListener("dragover", over);
    addEventListener("drop", drop);
    return () => {
      removeEventListener("dragover", over);
      removeEventListener("drop", drop);
    };
  }, [addFiles]);

  const vars = { "--rail-w": `${RAIL_WIDTH}px`, "--insp-w": `${INSPECTOR_WIDTH}px`, "--pad": `${PAD}px`, "--gap": `${GAP}px` } as CSSProperties;

  return (
    <div className="app" ref={appRef} style={vars}>
      <Rail
        refs={refs}
        inbox={state?.inbox ?? []}
        root={state?.root ?? ""}
        filters={filters}
        onFilter={(f) => updateFilters(() => f)}
        onFiles={addFiles}
        onChanged={reload}
        error={addError}
        onError={setAddError}
      />
      <main className="sheet" onClick={(e) => open && !(e.target as Element).closest(".frame, .bar") && close()}>
        <Toolbar
          searchRef={searchRef}
          query={filters.q}
          onQuery={(q) => updateFilters((f) => ({ ...f, q }))}
          shown={visible.length}
          total={refs.length}
          large={large}
          onLarge={setLarge}
          theme={theme}
          onTheme={toggleTheme}
        />
        {error ? (
          <div className="sheet-msg">
            <p>{error}</p>
            <button onClick={() => void reload()}>Try again</button>
          </div>
        ) : !state ? null : !refs.length ? (
          <div className="sheet-msg">
            <p>The vault is empty. Drop a screenshot or clip, or paste a link, to start it.</p>
          </div>
        ) : !visible.length ? (
          <div className="sheet-msg">
            <p>Nothing on the sheet matches that.</p>
            <button onClick={() => updateFilters(() => NO_FILTERS)}>Clear the search and filters</button>
          </div>
        ) : (
          <ContactSheet refs={visible} columns={columns} selected={open ? selected : null} onPick={pick} />
        )}
      </main>
      <Inspector
        ref={inspectorRef}
        open={open}
        reference={reference}
        root={state?.root ?? ""}
        onClose={close}
        onStep={step}
      />
    </div>
  );
}
