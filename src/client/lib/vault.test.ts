import { describe, expect, it } from "vitest";
import { normalizeLink } from "../../shared/links.ts";
import type { Reference } from "../../shared/types.ts";
import { NO_FILTERS, columnCount, deal, filterRefs, groups } from "./vault.ts";

const ref = (over: Partial<Reference>): Reference => ({
  id: "01", slug: "01-a", title: "A", kind: "", source: "screenshot", image: "", ratio: 1, page: "Landing page", look: "Painterly",
  tags: [], measured: false, vibe: "", palette: [], type: "", steal: [], note: "", file: "", ...over,
});

describe("deal", () => {
  it("fills the first row before starting the second", () => {
    expect(deal([1, 2, 3, 4], 3)).toEqual([[1, 4], [2], [3]]);
  });
});

describe("columnCount", () => {
  it("never goes past what is wanted, and drops columns before frames get too narrow", () => {
    expect(columnCount(2000, 3, 16)).toBe(3);
    expect(columnCount(400, 3, 16)).toBe(2);
    expect(columnCount(100, 3, 16)).toBe(1);
  });
});

describe("filterRefs and groups", () => {
  const refs = [ref({ slug: "a", title: "Noir", tags: ["dark"] }), ref({ slug: "b", title: "Bloom", page: "Poster", look: "Playful collage" })];
  it("filters by page and searches every word", () => {
    expect(filterRefs(refs, { ...NO_FILTERS, page: "Poster" }).map((r) => r.slug)).toEqual(["b"]);
    expect(filterRefs(refs, { ...NO_FILTERS, q: "noir dark" }).map((r) => r.slug)).toEqual(["a"]);
    expect(filterRefs(refs, { ...NO_FILTERS, q: "noir poster" })).toEqual([]);
  });
  it("counts groups biggest first", () => {
    expect(groups([...refs, ref({ slug: "c" })], "page")).toEqual([["Landing page", 2], ["Poster", 1]]);
  });
});

describe("normalizeLink", () => {
  it("adds https and drops the fragment", () => {
    expect(normalizeLink(" linear.app/#top ")).toEqual({ url: "https://linear.app/" });
  });
  it("explains what is wrong", () => {
    expect(normalizeLink("")).toHaveProperty("error");
    expect(normalizeLink("not a site")).toHaveProperty("error");
    expect(normalizeLink("localhost")).toHaveProperty("error");
  });
});
