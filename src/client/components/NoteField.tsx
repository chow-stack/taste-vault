import { useEffect, useRef, useState, type CSSProperties } from "react";
import { api } from "../lib/api.ts";

const SAVE_AFTER_MS = 600;

/** The owner's own note, saved into the "My note" section of the reference's file as they type. */
export function NoteField({ slug, initial, className, k }: { slug: string; initial: string; className: string; k: number }) {
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState("");
  const pending = useRef<{ timer: ReturnType<typeof setTimeout>; text: string } | null>(null);

  async function save(text: string) {
    pending.current = null;
    try {
      await api.saveNote(slug, text);
      setStatus(text.trim() ? "Saved to the notes file" : "");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Could not save");
    }
  }

  // switching to another reference saves what was typed instead of dropping it
  useEffect(
    () => () => {
      if (!pending.current) return;
      clearTimeout(pending.current.timer);
      void api.saveNote(slug, pending.current.text);
    },
    [slug],
  );

  return (
    <div className={`note ${className}`} style={{ "--k": k } as CSSProperties}>
      <label className="lab" htmlFor={`note-${slug}`}>
        <span>My note</span>
        <span>{status}</span>
      </label>
      <textarea
        id={`note-${slug}`}
        value={value}
        placeholder="Why did you keep this one? Claude reads this too."
        onChange={(e) => {
          const text = e.target.value;
          setValue(text);
          setStatus("Saving…");
          if (pending.current) clearTimeout(pending.current.timer);
          pending.current = { timer: setTimeout(() => void save(text), SAVE_AFTER_MS), text };
        }}
      />
    </div>
  );
}
