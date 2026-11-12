import { useEffect, useState, type ReactNode } from "react";
import { copyText } from "../lib/hooks.ts";

interface Props {
  text: string;
  /** What the button says for a moment after copying. */
  done?: string;
  className?: string;
  title?: string;
  children: ReactNode;
}

export function CopyButton({ text, done = "Copied", className = "", title, children }: Props) {
  const [said, setSaid] = useState<string | null>(null);
  useEffect(() => {
    if (said === null) return;
    const t = setTimeout(() => setSaid(null), 1500);
    return () => clearTimeout(t);
  }, [said]);
  return (
    <button
      type="button"
      className={`${className}${said ? " done" : ""}`}
      title={title}
      onClick={async () => setSaid((await copyText(text)) ? done : "Could not copy")}
    >
      {said ?? children}
    </button>
  );
}
