import type { Reference } from "../../shared/types.ts";
import { deal } from "../lib/vault.ts";
import "./ContactSheet.css";

interface Props {
  refs: Reference[];
  columns: number;
  selected: string | null;
  onPick: (slug: string) => void;
}

/** The frames, dealt into columns left to right like prints laid on a light table. */
export function ContactSheet({ refs, columns, selected, onPick }: Props) {
  return (
    <div className="frames">
      {deal(refs, columns).map((column, c) => (
        <div className="col" key={c}>
          {column.map((r) => (
            <button key={r.slug} className="frame" data-slug={r.slug} aria-pressed={r.slug === selected} onClick={() => onPick(r.slug)}>
              <span className="im">
                <img src={r.image} alt={`${r.title}, ${(r.kind || r.page).toLowerCase()}`} loading="lazy" />
              </span>
              <span className="lab">
                <span>
                  <i>[{r.id}]</i>
                  {r.title}
                </span>
              </span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
