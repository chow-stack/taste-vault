import type { RefObject } from "react";
import { Moon, Search, Sun } from "./icons.tsx";
import "./Toolbar.css";

interface Props {
  searchRef: RefObject<HTMLInputElement | null>;
  query: string;
  onQuery: (q: string) => void;
  shown: number;
  total: number;
  large: boolean;
  onLarge: (large: boolean) => void;
  theme: "dark" | "light";
  onTheme: () => void;
}

export function Toolbar({ searchRef, query, onQuery, shown, total, large, onLarge, theme, onTheme }: Props) {
  const other = theme === "dark" ? "light" : "dark";
  return (
    <div className="bar">
      <label className="search">
        <Search />
        <input
          ref={searchRef}
          type="search"
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder="Search titles, looks, tags"
          aria-label="Search the vault"
        />
      </label>
      <span className="count lab" aria-live="polite">
        {shown} of {total} frames
      </span>
      <div className="dens lab" role="group" aria-label="Frame size">
        <button aria-pressed={!large} onClick={() => onLarge(false)}>
          Small
        </button>
        <button aria-pressed={large} onClick={() => onLarge(true)}>
          Large
        </button>
      </div>
      <button className="tool" onClick={onTheme} aria-label={`Switch to ${other} mode`} title={`${other[0]!.toUpperCase()}${other.slice(1)} mode (L)`}>
        {theme === "dark" ? <Sun /> : <Moon />}
      </button>
    </div>
  );
}
