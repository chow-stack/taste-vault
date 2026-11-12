import { describe, expect, it } from "vitest";
import { parseReference, writeNote } from "./markdown.ts";

const FILE = `---
id: "03"
title: Noiré
kind: Museum landing page
source: link
url: https://example.com/
image: 03-noire.webp
page: Landing page
look: Painterly
tags: [light, serif]
measured: true
---

# Noiré

> Old masters on warm paper.

Values below are read from the live CSS.

## Palette
- Paper: \`#f4efe6\`
- Ink: \`#1C1B19\`

## Type
A bookish serif.

## Steal this
- One
- Two
- Three

## My note
`;

describe("parseReference", () => {
  it("reads frontmatter and every section", () => {
    const r = parseReference(FILE, "03-noire");
    expect(r).toMatchObject({
      id: "03",
      title: "Noiré",
      source: "link",
      url: "https://example.com/",
      imageFile: "03-noire.webp",
      page: "Landing page",
      look: "Painterly",
      tags: ["light", "serif"],
      measured: true,
      vibe: "Old masters on warm paper.",
      type: "A bookish serif.",
      steal: ["One", "Two", "Three"],
      note: "",
    });
    expect(r.palette).toEqual([
      { name: "Paper", hex: "#F4EFE6" },
      { name: "Ink", hex: "#1C1B19" },
    ]);
  });

  it("falls back to the file number and safe defaults", () => {
    const r = parseReference("---\ntitle: Bare\nimage: x.png\n---\n", "09-bare");
    expect(r).toMatchObject({ id: "09", source: "screenshot", page: "Unsorted", look: "Unsorted", tags: [], palette: [], steal: [] });
  });

  it("rejects a file without a title or image", () => {
    expect(() => parseReference("---\ntitle: No image\n---\n", "x")).toThrow();
  });

  it("never runs frontmatter as code", () => {
    const g = globalThis as { ran?: boolean };
    expect(() => parseReference('---js\n{ title: (globalThis.ran = true, "x"), image: "x.png" }\n---\n', "x")).toThrow();
    expect(g.ran).toBeUndefined();
  });

  it("only accepts a plain image file name", () => {
    for (const image of ["../secret.png", "/etc/x.png", "a/b.png", ".hidden.png"]) {
      expect(() => parseReference(`---\ntitle: T\nimage: "${image}"\n---\n`, "x")).toThrow();
    }
  });

  it("reads a clip and its motion notes", () => {
    const r = parseReference(
      "---\ntitle: Hover\nsource: video\nimage: 08-hover.jpg\nvideo: 08-hover.mp4\n---\n\n## Motion\n- Cards lift 4px on hover\n- About 250ms, easing out\n\n## My note\n",
      "08-hover",
    );
    expect(r).toMatchObject({ source: "video", videoFile: "08-hover.mp4", motion: ["Cards lift 4px on hover", "About 250ms, easing out"] });
    expect(() => parseReference("---\ntitle: T\nimage: x.jpg\nvideo: ../x.mp4\n---\n", "x")).toThrow();
  });
});

describe("writeNote", () => {
  it("fills the My note section and reads back the same", () => {
    const out = writeNote(FILE, "Kept for the type scale.\n\nAnd the margins.");
    expect(parseReference(out, "03-noire").note).toBe("Kept for the type scale.\n\nAnd the margins.");
    expect(out.startsWith(FILE.trimEnd().slice(0, -"## My note".length))).toBe(true);
  });

  it("keeps sections that come after the note", () => {
    const withAfter = `${FILE}old note\n\n## Extra\nkeep me\n`;
    const out = writeNote(withAfter, "new note");
    expect(out).toContain("## Extra\nkeep me");
    expect(parseReference(out, "03-noire").note).toBe("new note");
  });

  it("adds the section when it is missing and clears it when empty", () => {
    const missing = FILE.replace("## My note\n", "");
    expect(parseReference(writeNote(missing, "hi"), "x").note).toBe("hi");
    expect(parseReference(writeNote(writeNote(FILE, "hi"), ""), "x").note).toBe("");
  });

  it("cannot be used to inject a new section", () => {
    const out = writeNote(FILE, "## Steal this\n- hijack");
    expect(parseReference(out, "x").steal).toEqual(["One", "Two", "Three"]);
  });
});
