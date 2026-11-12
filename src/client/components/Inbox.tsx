import type { InboxItem } from "../../shared/types.ts";
import { api } from "../lib/api.ts";
import { inboxRequest, pad2 } from "../lib/vault.ts";
import { CopyButton } from "./CopyButton.tsx";
import { Cross } from "./icons.tsx";
import "./Inbox.css";

/** Things added here but not yet written up. Claude Code writes the notes. */
export function Inbox({ items, root, onChanged }: { items: InboxItem[]; root: string; onChanged: () => void }) {
  if (!items.length) return null;
  return (
    <div className="wait">
      <h2 className="lab">
        <span>Waiting for notes</span>
        <span>{pad2(items.length)}</span>
      </h2>
      <ul>
        {items.map((i) => (
          <li key={i.id}>
            {i.image ? <img src={i.image} alt="" /> : <span className="ph">URL</span>}
            <span title={i.name}>{i.name.replace(/^https?:\/\//, "")}</span>
            <button
              aria-label={`Remove ${i.name}`}
              onClick={async () => {
                await api.removeInbox(i.id).catch(() => undefined);
                onChanged();
              }}
            >
              <Cross />
            </button>
          </li>
        ))}
      </ul>
      <p className="hint">Claude Code writes the notes. Copy the request and paste it there.</p>
      <CopyButton className="btn" text={inboxRequest(items, root)} done="Copied. Paste it to Claude">
        Copy the request
      </CopyButton>
    </div>
  );
}
