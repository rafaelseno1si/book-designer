# AGENTS.md — Book Designer for Obsidian

## Purpose

This repository contains **Book Designer**, an Obsidian community plugin for visually designing, previewing, and eventually exporting book manuscripts.

The product goal is to provide a Vellum-like formatting layer inside Obsidian:

1. Authors write in normal Markdown notes.
2. Manuscript structure may come from a folder, manually selected files, or an optional Longform project.
3. Book Designer converts the source into an internal semantic book model.
4. A theme renderer turns that model into isolated book HTML/XHTML + CSS.
5. The same rendering rules are used for preview and export.
6. The user can preview reflowable ebook layouts at multiple simulated screen sizes.
7. The user can later preview fixed print layouts and export publication files.

The plugin is **not intended to replace Obsidian, Longform, Pandoc, Calibre, or a full word processor**.

---

## Read these docs before making architectural changes

Start with:

- `README.md`
- `docs/PRODUCT.md`
- `docs/ARCHITECTURE.md`
- `docs/BOOK_MODEL.md`
- `docs/RENDERING_PIPELINE.md`
- `docs/PREVIEW_SYSTEM.md`
- `docs/THEME_SYSTEM.md`
- `docs/OBSIDIAN_INTEGRATION.md`
- `docs/LONGFORM_INTEGRATION.md`
- `docs/EXPORTS.md`
- `docs/TESTING.md`
- `docs/ROADMAP.md`

---

## Core architectural rule

**The preview renderer and export renderer must not become separate formatting implementations.**

Desired pipeline:

```text
Markdown / manuscript source
        ↓
Source adapters
        ↓
Semantic Book Model
        ↓
Theme + renderer
        ↓
Book XHTML/HTML + CSS
        ├── Preview
        └── Export packaging
```

For EPUB, preview should use the same semantic markup and theme CSS that will be packaged into the EPUB whenever practical.

For print, preview and PDF generation should also share the same print renderer.

Do not implement a visual preview by merely restyling Obsidian's own Reading View. That would make the preview dependent on the user's Obsidian theme and would diverge from exported output.

---

## Technology direction

Preferred stack:

- TypeScript
- Obsidian Plugin API
- React for complex custom views
- esbuild from the official Obsidian sample plugin
- HTML/XHTML + CSS for book rendering
- Browser-compatible TypeScript for the cross-platform core
- Minimal dependencies unless they clearly reduce complexity

Do **not** add Vite, Electron, Next.js, or a separate web server without a compelling architectural reason.

Obsidian itself is the host application.

---

## Cross-platform rule

The core preview and native EPUB path should be designed to work on:

- Windows
- macOS
- Linux
- Android
- iOS

Avoid Node-only APIs inside reusable core modules.

Node/Electron-dependent integrations such as:

- Pandoc
- Calibre
- Kindle Previewer
- shell commands

must live behind optional desktop-only adapters.

Never make these tools mandatory for basic preview functionality.

---

## Product scope

### Initial scope

Focus on:

- selecting a manuscript
- ordering chapters
- parsing Markdown
- semantic book model
- visual ebook preview
- simulated reader sizes
- reader font-size/reflow controls
- basic themes
- typography controls
- scene-break styles
- chapter-opening styles
- front matter basics
- native EPUB export when the renderer is stable

### Explicitly out of scope for the first implementation

Do not prematurely build:

- a replacement Markdown editor
- collaboration
- cloud sync
- AI writing features
- DRM
- MOBI/AZW generation
- Scrivener clone features
- publishing marketplace
- advanced PDF prepress
- InDesign-level layout
- arbitrary CSS visual editor
- complex nested plugin ecosystem
- account/login system

---

## UI principles

Book Designer should feel native to Obsidian while keeping book content isolated from Obsidian styling.

Application controls should generally use Obsidian variables and conventions.

The rendered book must have its own style scope.

Never allow the active Obsidian theme to accidentally change:

- body font
- paragraph indents
- chapter headings
- margins
- scene breaks
- book colors
- page geometry

---

## Code organization

Prefer clear module boundaries such as:

```text
src/
  main.ts
  plugin/
  views/
  components/
  core/
    model/
    sources/
    parser/
    renderer/
    themes/
    preview/
    export/
  integrations/
    longform/
    desktop/
  utils/
```

Do not place all logic inside `main.ts`.

`main.ts` should primarily:

- initialize the plugin
- register commands/views/settings
- load/save plugin settings
- wire services together

---

## Coding guidelines

- Use strict TypeScript.
- Prefer explicit domain types over loose objects.
- Avoid `any` unless unavoidable at an external integration boundary.
- Keep Obsidian-specific types outside the reusable core where possible.
- Prefer pure functions for parsing and rendering.
- Make render output deterministic.
- Validate persisted configuration before using it.
- Keep generated IDs stable when possible.
- Escape all user-provided text inserted into generated XHTML.
- Treat imported Markdown and HTML as untrusted content.
- Do not use `innerHTML` with unsanitized input in UI components.

---

## Book semantics over visual formatting

The internal model should represent meaning, not arbitrary pixels.

Good:

```ts
{
  type: "chapter",
  title: "The Arrival",
  blocks: [...]
}
```

Avoid making the canonical model:

```ts
{
  fontSize: 23,
  marginTop: 71,
  x: 44,
  y: 102
}
```

Appearance belongs to themes/render configuration.

---

## EPUB philosophy

EPUB is reflowable.

Do not promise pixel-perfect page numbers across Kindle, Kobo, Apple Books, phones, tablets, or reader settings.

The preview should communicate:

- approximate device dimensions
- reader font size
- reader line spacing
- reader margins
- publisher font on/off
- orientation

The purpose is to test reflow and design robustness, not claim exact pagination.

---

## Print philosophy

Print is fixed-layout output.

Print preview may eventually aim for near-WYSIWYG behavior because trim size, margins, headers, page numbers, and pagination are controlled.

Keep ebook and print design configuration separate where their constraints differ.

---

## Dependencies

Before adding a dependency, ask:

1. Is it browser/mobile compatible?
2. Does it materially reduce complexity?
3. Is it actively maintained?
4. Is its license compatible with this project?
5. Can the required behavior be implemented simply without it?

Document significant dependency decisions in `docs/ARCHITECTURE.md`.

---

## Development behavior for Codex

When implementing a feature:

1. Read the relevant project docs.
2. Inspect existing code before introducing new architecture.
3. Preserve current behavior unless the task explicitly changes it.
4. Make the smallest coherent change.
5. Add or update tests.
6. Run typecheck/build/tests.
7. Summarize changed files and important tradeoffs.

If docs and implementation disagree, do not silently choose one. Point out the mismatch and prefer the current explicit user requirement.

---

## Definition of a good first release

A user should be able to:

1. Open an Obsidian vault.
2. Choose a folder containing a novel.
3. See its chapters in order.
4. Open Book Preview.
5. Choose a built-in theme.
6. Switch between phone / 6-inch reader / tablet simulations.
7. Change reader font size and see text reflow immediately.
8. Change book design options and see the preview update.
9. Save those settings with the project.
10. Export a valid EPUB once native export reaches the roadmap phase.

That is enough to prove the core product.
