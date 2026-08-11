# Roadmap

This roadmap is ordered to prove the core product before expanding into publishing edge cases.

---

# Phase 0 — Foundation

Goal: clean plugin architecture.

Tasks:

- start from official Obsidian sample plugin
- establish TypeScript strictness
- add React to custom view
- create Book Designer workspace view
- create basic settings
- create module structure
- add unit-test setup
- document development commands

Deliverable:

```text
Book Designer opens as an Obsidian view.
```

---

# Phase 1 — Manuscript loading

Goal: load a real manuscript into a semantic model.

Tasks:

- folder source adapter
- ordered Markdown file discovery
- manual reorder UI if needed
- Markdown parser
- basic Book Model
- heading/paragraph/emphasis/strong
- scene-break recognition
- manuscript navigator
- source change refresh

Deliverable:

```text
Select folder → chapters appear in Book Designer.
```

---

# Phase 2 — First ebook renderer

Goal: render the manuscript independently of Obsidian Reading View.

Tasks:

- semantic XHTML/HTML renderer
- isolated CSS
- one built-in theme
- chapter heading
- paragraphs
- scene breaks
- images
- stable IDs
- preview navigation

Deliverable:

```text
The whole manuscript can be visually previewed.
```

---

# Phase 3 — Reader simulation

Goal: make preview genuinely useful for ebooks.

Tasks:

- phone preset
- e-reader preset
- tablet preset
- custom viewport
- orientation
- reader font-size simulation
- reader line spacing
- reader margins
- publisher-font toggle
- light/dark/sepia simulation

Deliverable:

```text
Users can stress-test book reflow live.
```

---

# Phase 4 — Book Designer UI

Goal: Vellum-like visual book configuration.

Tasks:

- theme picker
- typography panel
- chapter-heading variants
- first-paragraph style
- scene-break styles
- book metadata
- project persistence
- several built-in themes

Deliverable:

```text
Design changes update the preview immediately.
```

---

# Phase 5 — Longform integration

Goal: work naturally alongside Longform.

Tasks:

- detect Longform
- project selector
- ordered manuscript loading
- map Longform structure
- handle multi-scene chapters where practical
- graceful fallback

Deliverable:

```text
Open Longform project → Book Designer preview.
```

---

# Phase 6 — Native EPUB

Goal: publication-ready native EPUB generation.

Tasks:

- EPUB package writer
- metadata
- navigation
- spine
- assets
- cover
- CSS
- XHTML documents
- internal links
- export UI
- diagnostics
- automated validation tests

Deliverable:

```text
Export a valid EPUB using the same renderer as preview.
```

---

# Phase 7 — EPUB polish

Tasks:

- footnotes
- richer front/back matter
- embedded fonts
- font licensing metadata strategy
- image sizing controls
- accessibility metadata
- language handling
- TOC configuration
- more validation
- external Kindle Previewer shortcut on desktop

---

# Phase 8 — Print designer

Goal: fixed-layout print workflow.

Tasks:

- print renderer
- trim presets
- margins/gutter
- single-page/spread preview
- chapter recto starts
- page numbers
- running heads
- widow/orphan strategies
- print themes
- PDF pipeline

Deliverable:

```text
6×9 print preview and PDF export.
```

---

# Phase 9 — Optional desktop integrations

Possible:

- Pandoc
- Calibre
- Kindle Previewer
- EPUBCheck
- external PDF engines

These must remain optional.

---

# Phase 10 — Ecosystem

Only after core quality is strong:

- user themes
- theme import/export
- theme marketplace/repository
- custom ornaments
- reusable book templates
- shared theme package format

---

## Prioritization rule

When deciding between:

```text
more export formats
```

and:

```text
better preview + renderer correctness
```

prefer renderer correctness.

The central product advantage is trustworthy visual book design.
