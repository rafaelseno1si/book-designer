# Testing Strategy

## Element-system verification

Run `npm test`, `npm run build`, and `npm run lint`. The initial baseline was 54 passing tests and nine existing lint errors in preview/mockup DOM styling. Element changes must not add lint failures. The expanded unit suite covers manifests/settings, unsafe/prototype keys, package limits, local approval, bridge envelopes, parsed CSS and XML output, nested/list quotations, static publication fragments, deep copying, runtime staleness, fallback, closed-project replacement, persistence failures, identity remapping and project migrations.

Run the real Chromium harness with:

```bash
npx playwright install chromium
npm run test:browser
```

It builds with esbuild, serves only loopback test fixtures, and drives the actual React library/theme/preview components through a test-only Obsidian API adapter. It exercises authored controls changing static output, closed-editor compilation, shared imported catalogs, Reset/Apply/Cancel, import/approval, metadata editing, duplicate, disable/enable, protected deletion, global replacement across two saved books, restore/duplicate backup, search, narrow library layout, large reader text, page navigation, and frame cleanup. It verifies output with JavaScript disabled, a real-browser isolation/self-navigation probe, and no forbidden resource requests reaching the loopback server. Screenshots go to ignored `dist/`. This adapter is **not an Obsidian host test**.

### Required manual host matrix (not yet verified)

- Obsidian desktop: verify approved authored controls work and unapproved/disabled output falls back; test the runtime isolation probe and child navigation/resources/forms/workers/popups/download denial under Electron, including a secondary app window.
- Restart the same vault to check local approval and persisted assignments; import into another vault/device and confirm approval is not transferred. On Obsidian 1.7.2–1.8.6 confirm session-only messaging and approval reset.
- Open two projects/themes referencing an import; replace while one is closed, preserve values, then restore. Simulate persistence failure and a concurrent registry edit; no partial replacement should be published.
- Edit/cancel/switch projects while compilation is pending; make live Markdown edits; confirm fallback/diagnostics, nested inline formatting, reader modes and virtualization remain correct.
- Check narrow panes, keyboard focus, light/dark/custom Obsidian UI themes, large reader sizes, theme changes, pagination, and unload/reload cleanup. Book typography/colors must not inherit UI CSS.
- Android and iOS: separate device testing is required. No mobile verification has been performed. Browser-compatible APIs alone are not proof of WebView/security/layout compatibility.

Never run an infinite-loop fixture in a live user's vault or claim deadlines can interrupt it. Testing publication fragments is not EPUB/PDF packaging verification.

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
