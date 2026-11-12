import type { InboxItem, Reference, Source } from "../../shared/types.ts";
import { groups, pad2, type Filters } from "../lib/vault.ts";
import { AddZone } from "./AddZone.tsx";
import { Inbox } from "./Inbox.tsx";
import "./Rail.css";

interface Props {
  refs: Reference[];
  inbox: InboxItem[];
  root: string;
  filters: Filters;
  onFilter: (f: Filters) => void;
  onFiles: (files: FileList | File[]) => void;
  onChanged: () => void;
  error: string;
  onError: (message: string) => void;
}

function FilterButton({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button className="f" aria-pressed={active} disabled={!count} onClick={onClick}>
      <span>{label}</span>
      <span>{pad2(count)}</span>
    </button>
  );
}

export function Rail({ refs, inbox, root, filters, onFilter, onFiles, onChanged, error, onError }: Props) {
  const toggle = <K extends "page" | "look" | "source">(key: K, value: Filters[K]) =>
    onFilter({ ...filters, [key]: filters[key] === value ? "" : value });
  const sources: Source[] = ["screenshot", "link", "video"];
  const none = !filters.page && !filters.look && !filters.source;

  return (
    <aside className="rail">
      <div>
        <h1 className="mark">taste vault.</h1>
        <p className="tally lab">{pad2(refs.length)} frames on file</p>
      </div>

      <nav className="nav" aria-label="Filters">
        <FilterButton label="All frames" count={refs.length} active={none} onClick={() => onFilter({ ...filters, page: "", look: "", source: "" })} />
        <h2 className="lab">Kind of page</h2>
        {groups(refs, "page").map(([name, n]) => (
          <FilterButton key={name} label={name} count={n} active={filters.page === name} onClick={() => toggle("page", name)} />
        ))}
        <h2 className="lab">Look</h2>
        {groups(refs, "look").map(([name, n]) => (
          <FilterButton key={name} label={name} count={n} active={filters.look === name} onClick={() => toggle("look", name)} />
        ))}
        <h2 className="lab">Came in as</h2>
        {sources.map((s) => (
          <FilterButton key={s} label={s} count={refs.filter((r) => r.source === s).length} active={filters.source === s} onClick={() => toggle("source", s)} />
        ))}
      </nav>

      <div className="add">
        <AddZone onFiles={onFiles} onAdded={onChanged} error={error} onError={onError} />
        <Inbox items={inbox} root={root} onChanged={onChanged} />
      </div>
    </aside>
  );
}
