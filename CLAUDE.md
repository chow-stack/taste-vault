# Taste Vault

A personal, local library of design references. Each reference is an image plus a short notes file that a coding agent can read. The web app displays and organizes them; Claude Code writes the notes. Product context is in `PRODUCT.md`.

## Using the vault for design work

When starting front-end work in any project, the references are plain files:

- `vault/references/<slug>.md`: frontmatter (title, kind, page, look, tags, measured) plus vibe, palette, type, three "steal this" notes, and the owner's own note.
- `vault/references/<slug>.<ext>`: the image. Read it to see the reference.

Pick references by `page` and `look`, read their notes, look at the images. The owner's note says why they kept it; give it the most weight.

## Adding references

New items wait in `vault/inbox/`. To process them, follow `.claude/skills/taste-vault/SKILL.md`, which also defines the notes format.

## Code

- `src/server/`: Hono API on Node. `vault.ts` owns all file access, `markdown.ts` parses and writes notes files, `app.ts` has the routes, `config.ts` the paths and ports. The server binds to 127.0.0.1, only answers requests addressed to localhost (against DNS rebinding), refuses cross-site writes, checks that uploads really are images, and reads YAML frontmatter only. Keep all of that when changing routes.
- `src/client/`: React app (Vite). `App.tsx` holds state; `components/` each have their own CSS file; `styles/tokens.css` is the design system (Light Table look, dark and light).
- `src/shared/`: types and helpers used by both sides.
- `scripts/capture.ts`: Playwright capture of a live site for link references.

Commands: `npm run dev` (app on http://localhost:4173, API on 4174), `npm run check` (types, lint, tests), `npm start` (build and serve on 4173), `npm run setup` (download the capture browser). `PORT`, `API_PORT` and `TASTE_VAULT_DIR` override the defaults.

## Conventions

- Keep the look: Archivo, near-black and paper, gold accent, 3px radii, hairline dividers, 4:3 frames. Colours come only from the tokens in `styles/tokens.css`.
- No extra features without the owner asking (see "Capabilities and Constraints" in `PRODUCT.md`).
- The notes files are the source of truth. Never keep vault data only in the browser.
