import { useEffect, useRef, useState, type FormEvent } from "react";
import { normalizeLink } from "../../shared/links.ts";
import { api } from "../lib/api.ts";
import { Arrow } from "./icons.tsx";
import "./AddZone.css";

/** A grainy light-leak, drawn once, so the drop zone feels like film rather than a dashed box. */
function Grain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext("2d");
    if (!c || !ctx) return;
    const { width: W, height: H } = c;
    const img = ctx.createImageData(W, H);
    const d = img.data;
    let i = 0;
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const a = (x / W) * 1.1 + (y / H) * 0.8;
        const o1 = a - 0.55 - 0.06 * Math.sin(y / 14);
        const o2 = a - 1.25;
        let b = 0.04 + 0.8 * Math.exp((-o1 * o1) / 0.02) + 0.5 * Math.exp((-o2 * o2) / 0.05);
        b = b / (1 + b * 0.7) + (Math.random() - 0.5) * (0.2 + b * 0.5);
        b = Math.max(0, Math.min(1, b));
        d[i++] = 240 * b;
        d[i++] = 246 * b;
        d[i++] = 255 * b;
        d[i++] = 255;
      }
    ctx.putImageData(img, 0, 0);
  }, []);
  return <canvas ref={ref} width={236} height={133} aria-hidden="true" />;
}

interface Props {
  onFiles: (files: FileList) => void;
  onAdded: () => void;
  error: string;
  onError: (message: string) => void;
}

export function AddZone({ onFiles, onAdded, error, onError }: Props) {
  const [over, setOver] = useState(false);
  const [link, setLink] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    const checked = normalizeLink(link);
    if ("error" in checked) return onError(checked.error);
    try {
      await api.addLink(checked.url);
      setLink("");
      onError("");
      onAdded();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <>
      <label
        className={`drop${over ? " over" : ""}`}
        onDragEnter={() => setOver(true)}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={() => setOver(false)}
      >
        <Grain />
        <input
          type="file"
          accept="image/*"
          multiple
          aria-label="Choose screenshots to add"
          onChange={(e) => {
            if (e.target.files?.length) onFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <span>
          Drop a screenshot<small>or click to choose a file</small>
        </span>
      </label>
      <form className="link" onSubmit={submit}>
        <input
          type="text"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="or paste a link"
          aria-label="Paste a link to a website"
          autoComplete="off"
          spellCheck={false}
        />
        <button className="pill" aria-label="Add this link">
          <Arrow />
        </button>
      </form>
      <p className="err" role="alert">
        {error}
      </p>
    </>
  );
}
