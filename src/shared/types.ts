/** Shapes shared by the server and the client. The server builds these from the files in vault/. */

export type Source = "screenshot" | "link" | "video";

export interface Swatch {
  name: string;
  hex: string;
}

export interface Reference {
  /** Two-digit number from the file name, shown as [01] on the sheet. */
  id: string;
  /** File name without extension, e.g. "01-noir-studio". */
  slug: string;
  title: string;
  /** Free description of what it is, e.g. "Studio portfolio". */
  kind: string;
  source: Source;
  /** The live address, for references that came in as a link. */
  url?: string;
  /** URL the browser can load the image from. For clips this is a still frame. */
  image: string;
  /** URL of the clip, for references that came in as a video. */
  video?: string;
  /** Width divided by height of the image. */
  ratio: number;
  /** Filed under: the kind of page (Landing page, Portfolio...) and the look (Painterly...). */
  page: string;
  look: string;
  tags: string[];
  /** True when the values were read from live CSS rather than estimated from an image. */
  measured: boolean;
  vibe: string;
  palette: Swatch[];
  type: string;
  steal: string[];
  /** What moves and how, for clips. Empty for stills. */
  motion: string[];
  note: string;
  /** Path of the notes file relative to the project, e.g. vault/references/01-noir-studio.md */
  file: string;
}

export interface InboxItem {
  id: string;
  source: Source;
  /** Original file name for screenshots, the address for links. */
  name: string;
  /** Preview image URL, for screenshots and captured links. */
  image?: string;
  /** Clip URL, for videos. */
  video?: string;
  added: string;
}

export interface VaultState {
  references: Reference[];
  inbox: InboxItem[];
  /** Absolute path of the vault folder, used in the text copied for Claude. */
  root: string;
}
