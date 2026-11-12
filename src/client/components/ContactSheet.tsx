import type { SyntheticEvent } from "react";
import type { Reference } from "../../shared/types.ts";
import { deal } from "../lib/vault.ts";
import "./ContactSheet.css";

interface Props {
  refs: Reference[];
  columns: number;
  selected: string | null;
  onPick: (slug: string) => void;
}

const calm = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Clips show their still and play while the pointer (or focus) is on them. The video sits over the still
 *  and only shows once it is actually playing, so leaving goes back to the chosen still, not the clip's
 *  first frame (often an intro). */
function play(e: SyntheticEvent<HTMLElement>) {
  if (!calm()) void e.currentTarget.querySelector("video")?.play().catch(() => undefined);
}
function stop(e: SyntheticEvent<HTMLElement>) {
  const v = e.currentTarget.querySelector("video");
  if (!v) return;
  v.pause();
  v.currentTime = 0;
  v.classList.remove("on");
}

/** The frames, dealt into columns left to right like prints laid on a light table. */
export function ContactSheet({ refs, columns, selected, onPick }: Props) {
  return (
    <div className="frames">
      {deal(refs, columns).map((column, c) => (
        <div className="col" key={c}>
          {column.map((r) => (
            <button
              key={r.slug}
              className="frame"
              data-slug={r.slug}
              aria-pressed={r.slug === selected}
              onClick={() => onPick(r.slug)}
              {...(r.video ? { onMouseEnter: play, onFocus: play, onMouseLeave: stop, onBlur: stop } : {})}
            >
              <span className="im">
                {r.video ? (
                  <>
                    <img src={r.image} alt={`${r.title}, clip`} loading="lazy" />
                    <video
                      src={r.video}
                      muted
                      loop
                      playsInline
                      preload="none"
                      aria-hidden="true"
                      onPlaying={(e) => e.currentTarget.classList.add("on")}
                    />
                    <span className="tag lab">Clip</span>
                  </>
                ) : (
                  <img src={r.image} alt={`${r.title}, ${(r.kind || r.page).toLowerCase()}`} loading="lazy" />
                )}
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
