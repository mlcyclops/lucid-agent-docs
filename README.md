# LUCID Agent Docs

Source of [docs.lucid-agents.com](https://docs.lucid-agents.com): the task-first manual for the LUCID Agent desktop app ([mlcyclops/lucidagentide](https://github.com/mlcyclops/lucidagentide)). Plan and rules: ADR-0660 in that repo's DECISIONS.md.

Found a typo or a step that no longer matches the app? Open a pull request; every page has an "Edit page" link.

## Work on it

```sh
bun install
bun run dev      # http://localhost:4321
bun run check    # build, then fail on missing alt text or captions, em dashes, a missing sitemap or shot
```

Pages are MDX under `src/content/docs/`. Writing rules: one task per page, plain words, numbered steps, every term defined on first use and linked to the glossary, no em dashes, no prices.

## Screenshots

Never taken by hand. `desktop/scripts/docs_capture_p_docs_1.mjs` in the app repo boots an isolated QA engine (temp home, scripted fake agent, demo data only), drives the real UI in headless Chrome and writes `public/shots/<id>.webp` plus `src/shots/<module>.json` (image size and the named boxes a page annotates) into a checkout of this repo next to it:

```sh
bun desktop/scripts/docs_capture_p_docs_1.mjs            # every module in desktop/scripts/docs_shots/
bun desktop/scripts/docs_capture_p_docs_1.mjs connect    # one module
```

Pages show them with `<Shot id="..." alt="..." callouts={[{ box: "...", label: "..." }]} />`; callouts are drawn as an SVG layer, so their text stays searchable. A step that cannot find its element fails the capture.

## Deploys

Pull requests deploy to a Firebase Hosting preview channel (link in a PR comment); a merge to `main` deploys the live site (Firebase project `lucid-agent`, site `lucid-agent-docs`). CI signs in keylessly through GitHub OIDC; no secrets are stored here.

Copyright (c) 2026 TechLead 187 LLC.
