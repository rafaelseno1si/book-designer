# Testing Strategy

## Goals

Book Designer needs tests for both software correctness and rendering stability.

Publishing bugs are often subtle.

Examples:

- missing chapter
- wrong order
- broken internal link
- dropped italics
- duplicated IDs
- missing image
- scene break rendered as literal Markdown
- malformed EPUB navigation

---

## Unit tests

Best candidates:

### Source normalization

```text
folder files → deterministic order
frontmatter → metadata
scene markers → semantic scene breaks
```

### Parser

Markdown fixture → expected Book Model.

### Theme resolution

Theme + overrides → resolved theme tokens.

### Renderer

Book Model → deterministic XHTML.

### EPUB utilities

- MIME types
- file-name normalization
- manifest generation
- spine generation
- navigation generation

---

## Fixture-based testing

Create:

```text
test-fixtures/
  minimal-novel/
  headings/
  scene-breaks/
  images/
  links/
  unicode/
  front-matter/
  malformed/
```

Each fixture should exercise realistic book content.

---

## Snapshot tests

Snapshot testing can be useful for:

- generated XHTML
- generated CSS
- navigation documents
- package metadata

Avoid giant unreadable snapshots.

Prefer one logical rendered unit per snapshot.

---

## Rendering tests

Eventually add browser visual tests for:

- chapter opening
- first paragraph
- scene break
- narrow viewport
- large user font size
- dark reader simulation
- tablet viewport

Visual snapshots should complement, not replace, semantic tests.

---

## EPUB validation tests

For exporter phase, create small generated books and validate that:

- required files exist
- manifest references resolve
- spine order matches sections
- navigation references resolve
- all XHTML is well-formed
- asset media types match files

If official EPUBCheck is available in CI later, run it against fixture exports.

---

## Cross-platform testing

At minimum consider:

```text
Desktop:
Windows
macOS
Linux

Mobile:
Android
iOS
```

Early development may focus on desktop, but avoid introducing architectural blockers to mobile without documenting them.

---

## Manual test checklist

For each meaningful UI milestone:

1. Open plugin.
2. Select manuscript.
3. Navigate chapters.
4. Modify a source note.
5. Confirm preview refresh.
6. Change theme.
7. Change simulated device.
8. Increase reader font size.
9. Confirm text reflows.
10. Restart Obsidian.
11. Confirm project settings persist.
12. Test plugin with a different Obsidian theme.

The final check is important: book styling must remain unchanged by Obsidian theme.
