# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated ("you pick, best practice"). TypeScript throughout: a React app built with Vite, a small Hono server on Node that reads and writes the vault folder, and Playwright for capturing links. Runs locally with `npm run dev`.

## Users

One person per vault: the owner, who designs and builds websites and apps (landing pages, portfolios, dashboards, full apps, possibly mobile) for themself and for clients. The second "user" is an AI coding agent (Claude Code) that reads the vault when starting a front-end project.

## Product Purpose

Taste Vault is a personal, local library of design references. Each reference is saved with a short written breakdown so an AI agent can read the owner's taste instead of producing generic output. Success: starting any new design by pulling a few references from the vault rather than from a blank prompt.

## Positioning

It is the owner's own taste, not a public gallery. Every entry carries a plain-language style sheet that a coding agent can read from disk.

## Operating Context

- Two ways in: drop a screenshot (Pinterest, Dribbble, X; values are estimated from the image) or paste a URL (the live site is captured and its real CSS values are read).
- The analysis is written by Claude Code when the owner asks it to add references. The web app displays and organizes.
- Entries are stored as plain files (image plus a small text file) inside the project folder.
- Runs locally on the owner's computer (macOS, Windows or Linux). It is not a hosted service: the server only answers on localhost.

## Capabilities and Constraints

- Entry anatomy, deliberately light: image, one-line vibe, palette, fonts, three "steal this" notes, auto-assigned collection and tags, the owner's own note.
- Collections are sorted automatically, by type of page and by aesthetic.
- No extra features for now (no mix mode, no search by colour or font, no ratings).
- Undecided: motion-design references (a possible later addition).

## Brand Commitments

- Name: Taste Vault.
- The app should feel artistic, like a photographer's light table rather than a dashboard.
- Chosen direction: the Light Table, in dark and light modes. Archivo throughout, warm gold accent, frames in full colour with small 3px radii, an inspector panel that opens only when a reference is clicked and pushes the sheet aside.

## Evidence on Hand

- No testimonials, users, pricing or metrics exist. Do not invent any.

## Product Principles

1. Show, don't describe: a reference beats an adjective.
2. Written down for machines, pleasant for the human.
3. Light by default: only what a future project needs.
4. The references are the colour; the app stays out of their way.
