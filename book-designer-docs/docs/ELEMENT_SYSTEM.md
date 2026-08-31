# Element system (v1)

Elements are reusable, vault-wide design packages. Themes remain declarative assignments; package code runs only in isolated authoring/compiler sessions. Book Preview and the static publication-fragment renderer consume validated XHTML/CSS, never authoring code.

## User surfaces

**Elements**, between Themes and Print settings, works without an active project. It offers search, pagination, labeled sample previews, usage information, and import, details, duplicate, enable/disable, replacement, and deletion. Create means importing an externally authored `.html` file from the vault. It does not create a starter, edit source, or watch for updates. The source file remains unchanged. Built-ins have reserved immutable IDs; they can be previewed or duplicated, but not edited, disabled, replaced, or deleted.

**Themes → Theme elements** has exactly five categories: Chapter opening, First paragraph, Typography, Ornamental break, and Blockquote. The first four keep their existing implementations. Blockquote lists library presets, identified by `(library ID, preset ID)`, with a Manage elements link. Disabled entries remain visible but unavailable. Unapproved previews show diagnostics and semantic fallback until approved in Elements.

Catalogs/settings always use a labeled quotation sample. Selection and valid settings changes also preview actual manuscript quotations. React owns the preset selector, diagnostics, Reset, Apply, and Cancel; the package owns its controls. Reset resolves the selected preset over package defaults. Apply saves the custom theme; applying that theme to the book is a separate, existing workflow. Leaving the editor or canceling discards the draft. Library Preview is temporary and does not change book/theme settings or package defaults.

## Boundaries

```text
Vault HTML importer → package abstraction → inert inspection
                                               ↓ approval
                                      isolated compilation
                                               ↓ validation
                                      reusable static artifact
                                               ↓
Markdown → semantic Book Model → synchronous shared renderer
                                      ├─ virtualized Book Preview
                                      └─ static publication fragment
```

- `src/core/elements`: package/settings validation, types, parsed CSS policy, XML allowlist reconstruction, assignment cloning/equality.
- `src/plugin/elements`: library identity, local approval, sandbox/bridge, shared compiler, runtime coordination, vault operations.
- `src/components/elements`: library, preset catalog, authored settings host and static previews.
- `src/elements/builtins/basic-blockquote.html`: the working package, loaded as text by esbuild and the Vitest HTML transform.
- `src/core/renderer/book-preview-renderer.ts`: recursive semantic rendering and `renderPublicationFragment`, sharing the same section renderer and publication CSS. EPUB/PDF packaging remains future work.

The parser already turns Markdown `>` into `BlockquoteBlock { blocks: [...] }`. The renderer recursively wraps every such node, including quotations inside lists and nested quotations. Paragraphs, emphasis, links, and lists remain trusted renderer output. Quotation marks inside ordinary paragraphs do not create blockquotes. No tags are inserted into notes and no rendered-text scanning is performed.

## Assignment and fallback

```ts
design.elements.blockquote = {
  elementId: 'element-<installed-id>',
  presetId: 'classic-rule',
  settingsOverrides: { inset: 1.5 }
};
```

Effective settings are **defaults → selected preset → assignment overrides**. `cloneDesign`, `parseAssignments`, `resolveElementSettings`, and `sameElements` centralize ownership/validation across persistence, duplicates, preview, and portability. Existing projects without assignments retain the standard blockquote rendering. Missing, disabled, unapproved, or failed packages retain their assignment and use readable semantic fallback, with diagnostics.

The compiler serializes background work, deduplicates identical requests, bounds the pending queue and artifact cache, and keys output by SHA-256 content, effective settings, canonical publication context, and output-validator version. Preview requests are debounced by 120 ms. The cache holds at most 64 artifacts, the parsed cache 32 packages, and the pending queue 32 compilations. There is no executable frame per card or quotation. Same-project valid output remains visible while recompiling; generation/revision checks reject stale results. Project switches, library changes, cancellation and unload invalidate relevant work. Source refresh and existing virtualization remain independent of compilation.

## Library identity and global replacement

Imported entries store an independently allocated ID, local display metadata, enabled state, package content, verified SHA-256 digest, and at most one previous package. Manifest IDs/version labels never identify an installed entry or trigger replacement. Runtime digest verification never substitutes for local approval. Import-as-new and duplication create independent entries.

Replacement is explicit and global: all saved project and custom-theme references are enumerated, including closed projects. The candidate is inspected without execution, must keep its category/contract, and must preserve every referenced preset and existing effective setting. Removed settings, missing presets, invalid existing values, or incompatible bounds block replacement and recommend import-as-new. New settings receive replacement defaults/preset values; overrides are recalculated to preserve old effective values.

Changed content requires explicit approval, and compilation must succeed before installation. The durable registry revision is rechecked around an awaited serialized save. Package, adjusted assignments, and backup are committed together; failed persistence does not publish the candidate in memory. Ordinary preview updates do not create false registry conflicts. Plugin settings and registry writes share a save queue. Restore uses the same compatibility/approval checks and swaps the previous package; Duplicate backup offers recovery if restoration is incompatible. Existing publication files are never touched.

Deletion is blocked while any saved project/theme references the entry, and usage is displayed in the library. Disable retains settings and references. The library is bounded to 200 custom entries.

## Approval and portability

Approval is exact-content, local, and separate from the package/registry. On hosts exposing `App.loadLocalStorage` / `App.saveLocalStorage` (Obsidian 1.8.7+), approval is vault-specific local storage. On older supported hosts it is session-only and the approval dialog says so. Minimum supported Obsidian remains 1.7.2. Unavailable isolation primitives fail closed for imported execution, not for package storage or semantic fallback.

Project-file v3 includes only packages referenced by the exported project and its custom theme. It excludes backups, approval, compiled output, unrelated entries, and manuscript text. v1/v2 remain importable. Import inspects packages without executing, recomputes their digests, reuses identical installed content, otherwise installs independent copies, and remaps only imported references. It never silently replaces installed packages or existing custom themes. Unresolved references remain with warnings and fallback; a missing portable package cannot accidentally bind to conflicting installed content.

## Future ingestion extension

V1 represents content as `{ entryPath: 'index.html', files: { 'index.html': source } }`. Only that one synthetic entry is accepted. The vault importer is separate from contract inspection and compilation.

A future ZIP importer can populate a generalized package-relative resource map without changing library IDs, assignments, authored bridge, or static renderer interfaces. Archive extraction, entry discovery, traversal/path validation, decompression limits, allowed asset types, and asset URL lifecycles must be designed at that boundary. They are **not implemented in v1**. There is no ZIP dependency, bundled asset loading, dependency resolution, automatic updater, source editor, or publication packager.

See [Element authoring](ELEMENT_AUTHORING.md), [Security](SECURITY_AND_COMPATIBILITY.md), and [Testing](TESTING.md).
