# Architecture Decision Log

Use this file for significant decisions.

Keep entries short.

---

## ADR-001 — Use Obsidian as the host

**Status:** Accepted

Book Designer begins as an Obsidian plugin rather than a standalone Electron application.

Reasons:

- Obsidian already provides cross-platform application shell
- filesystem/vault management exists
- Markdown authoring already exists
- Longform ecosystem exists
- scope can focus on book design and preview

A reusable core should preserve the option of a future standalone frontend.

---

## ADR-002 — Use TypeScript

**Status:** Accepted

The plugin and reusable core are written in TypeScript.

Reasons:

- native fit for Obsidian plugins
- suitable for browser-compatible rendering
- strong ecosystem for Markdown/XHTML/CSS
- good fit for Codex-assisted development

---

## ADR-003 — React for the main designer view

**Status:** Accepted

Use React for complex Book Designer UI.

Do not require React for every simple Obsidian settings surface.

---

## ADR-004 — Keep official esbuild-style plugin workflow

**Status:** Accepted

Do not introduce Vite initially.

Obsidian is the host application and the sample-plugin build flow is sufficient.

Revisit only if a clear development limitation emerges.

---

## ADR-005 — Longform is optional

**Status:** Accepted

Longform is a source adapter, not a dependency.

Users must be able to create a book from an ordinary folder/manual source.

---

## ADR-006 — Preview and export share a renderer

**Status:** Accepted

This is foundational.

Do not build separate formatting implementations for preview and EPUB.

---

## ADR-007 — Ebook and print are separate renderers

**Status:** Accepted

Both consume the same Book Model, but reflowable EPUB and paginated print have different constraints.

---

## ADR-008 — Core remains browser-compatible

**Status:** Accepted

Avoid Node-only APIs in:

- model
- parser
- theme system
- ebook renderer
- preview core

Desktop-only tooling belongs in optional integrations.

---

## ADR-009 — Native EPUB is preferred over mandatory Pandoc

**Status:** Direction accepted; implementation later

Pandoc may be supported as an optional desktop integration.

Native EPUB export better preserves the same-renderer principle and mobile potential.

---

## ADR-010 — No exact Kindle emulation promise

**Status:** Accepted

Device presets are reflow simulations.

Real reading systems may override publisher styling and paginate differently.
