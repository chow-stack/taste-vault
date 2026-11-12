import type { CSSProperties, Ref } from "react";
import type { Reference } from "../../shared/types.ts";
import { brief } from "../lib/vault.ts";
import { CopyButton } from "./CopyButton.tsx";
import { Arrow, Cross } from "./icons.tsx";
import { NoteField } from "./NoteField.tsx";
import { Swatch } from "./Swatch.tsx";
import "./Inspector.css";

/** Position in the follow-in sequence when the panel opens. */
const k = (n: number) => ({ "--k": n }) as CSSProperties;

interface Props {
  ref: Ref<HTMLElement>;
  open: boolean;
  /** Stays set while closing, so the contents slide away with the panel. */
  reference: Reference | null;
  root: string;
  onClose: () => void;
  onStep: (by: number) => void;
}

/** A reference's style sheet. Grows in from the right edge and pushes the contact sheet aside. */
export function Inspector({ ref, open, reference: r, root, onClose, onStep }: Props) {
  return (
    <aside ref={ref} className={`insp${open ? " open" : ""}`} aria-label="Reference details" tabIndex={-1} aria-hidden={!open}>
      {r && (
        <div className="insp-in">
          <div className="ihead st" style={k(0)}>
            <span className="lab">{r.file}</span>
            <div>
              <button className="pill" aria-label="Previous frame" onClick={() => onStep(-1)}>
                <Arrow back />
              </button>
              <button className="pill" aria-label="Next frame" onClick={() => onStep(1)}>
                <Arrow />
              </button>
              <button className="pill" aria-label="Close details" title="Close (Esc)" onClick={onClose}>
                <Cross />
              </button>
            </div>
          </div>

          <figure className="st" style={k(1)}>
            <img src={r.image} alt={`${r.title}, ${(r.kind || r.page).toLowerCase()}`} style={{ aspectRatio: r.ratio }} />
          </figure>
          <h2 className="title st" style={k(2)}>
            {r.title}
          </h2>
          {r.url && (
            <a className="live lab st" href={r.url} target="_blank" rel="noreferrer" style={k(3)}>
              {r.url.replace(/^https?:\/\//, "").replace(/\/$/, "")} ↗
            </a>
          )}
          <p className="vibe st" style={k(3)}>
            {r.vibe}
          </p>

          <dl className="spec st" style={k(4)}>
            <dt className="lab">Palette</dt>
            <dd>
              <div className="pal">
                {r.palette.map((p) => (
                  <Swatch key={p.hex + p.name} {...p} />
                ))}
              </div>
              <span className="est">{r.measured ? "Read from the live CSS" : "Estimated from the image"}</span>
            </dd>
            <dt className="lab">Type</dt>
            <dd>{r.type}</dd>
            <dt className="lab">Steal this</dt>
            <dd>
              <ol className="steal">
                {r.steal.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            </dd>
            <dt className="lab">Filed under</dt>
            <dd>
              {r.page} · {r.look}
            </dd>
          </dl>

          <NoteField key={r.slug} slug={r.slug} initial={r.note} className="st" k={5} />
          <CopyButton className="btn copy st" text={brief(r, root)} done="Copied. Paste it into your project">
            Copy these notes for Claude
          </CopyButton>
        </div>
      )}
    </aside>
  );
}
