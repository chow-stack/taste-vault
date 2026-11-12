# Security

Taste Vault is a local app. Its server reads and writes files in your vault folder, so it is built to be reachable only from your own machine.

## What it does to stay local

- The server listens on `127.0.0.1` only, never on your network.
- It only answers requests addressed to `localhost`, `127.0.0.1` or `[::1]`. This blocks DNS rebinding, where a website points its own domain at your machine to get around the browser's same-origin rules.
- Writes (uploads, links, notes) are refused unless they come from the app's own page.
- Uploads must really be PNG, JPEG, WebP, GIF or AVIF images. The server checks the file's bytes, not only its name or the type the browser reports. SVG is not accepted.
- Only images are served from the vault folder. Notes files are read through the API.
- Notes files are parsed as YAML only. Frontmatter that would run code (`---js`) is rejected, so a notes file someone shares with you cannot run anything.
- Nothing is sent anywhere. There are no accounts, analytics or API keys. The capture script opens the address you pasted in a headless browser and saves a screenshot and the CSS it measured.

## Hosting it publicly

Don't. The app has no login and gives anyone who can reach it full read and write access to the vault. It is meant to run on your own computer.

## Reporting a problem

If you find a security issue, please open a private report through **Security → Report a vulnerability** on the GitHub repository rather than a public issue. Include steps to reproduce and what you expected to happen.
