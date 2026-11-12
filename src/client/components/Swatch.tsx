import { useEffect, useState } from "react";
import type { Swatch as SwatchData } from "../../shared/types.ts";
import { copyText } from "../lib/hooks.ts";

/** One colour block in the palette strip. Clicking copies its hex. */
export function Swatch({ name, hex }: SwatchData) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(t);
  }, [copied]);
  return (
    <button type="button" className={`sw${copied ? " done" : ""}`} title={`${name}: copy ${hex}`} onClick={async () => setCopied(await copyText(hex))}>
      <b style={{ background: hex }} />
      <span>{copied ? "Copied" : hex}</span>
    </button>
  );
}
