# Book Designer

**Book Designer** is an Obsidian plugin for visually designing and previewing manuscripts as real books.

The idea is simple:

> Write in Obsidian. Organize with normal folders or Longform. Design and preview the book with Book Designer.

The plugin aims to fill the gap between Markdown authoring and final book export.

---

## Product vision

Current writing workflows often look like:

```text
Markdown
  ↓
Compile
  ↓
Export EPUB/PDF
  ↓
Open another application
  ↓
Discover how it actually looks
```

Book Designer aims for:

```text
Markdown
  ↓
Semantic Book Model
  ↓
Book Design
  ↓
Live Preview
  ↓
Export using the same renderer
```

The project is inspired by the workflow quality of tools such as Vellum, but designed for Obsidian and cross-platform use.

---

## Planned manuscript sources

Book Designer should eventually support:

- current note
- selected folder
- manually selected ordered notes
- Longform project
- optional future source adapters

Longform should be an integration, not a mandatory dependency.

---

## Planned preview modes

### Ebook preview

Simulate reflowable reading environments such as:

- phone
- compact 6-inch e-reader
- larger e-reader
- tablet
- custom viewport

Reader controls may include:

- font size
- line spacing
- margins
- orientation
- publisher font enabled/disabled
- light/dark/sepia simulation

This is a **reflow simulation**, not a promise of identical pagination on every reading system.

### Print preview

Later phases should support:

- trim size
- margins
- gutter
- page spreads
- running heads
- page numbers
- recto chapter starts
- print typography
- PDF export

---

## Technology

Primary stack:

- TypeScript
- Obsidian Plugin API
- React
- esbuild
- HTML/XHTML
- CSS

The reusable rendering core should remain browser-compatible so the plugin can retain mobile support where possible.

Optional desktop integrations may later add:

- Pandoc
- Calibre
- Kindle Previewer

---

## Architectural principle

The preview and export path should share one renderer.

```text
Source Markdown
      ↓
   Book AST
      ↓
 Theme Renderer
      ↓
 XHTML / CSS
    ↙      ↘
Preview   EPUB
```

Do not use Obsidian's native note preview as the canonical book renderer.

---

## Documentation

See the `docs/` folder.

Recommended reading order:

1. `PRODUCT.md`
2. `ARCHITECTURE.md`
3. `BOOK_MODEL.md`
4. `RENDERING_PIPELINE.md`
5. `PREVIEW_SYSTEM.md`
6. `THEME_SYSTEM.md`
7. `OBSIDIAN_INTEGRATION.md`
8. `LONGFORM_INTEGRATION.md`
9. `EXPORTS.md`
10. `TESTING.md`
11. `ROADMAP.md`
12. `DEVELOPMENT.md`
