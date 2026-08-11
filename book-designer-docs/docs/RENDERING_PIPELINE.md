# Rendering Pipeline

## Main principle

The preview and export paths must share the same renderer.

This is the most important technical principle in the project.

---

## Ebook path

```text
Markdown
   ↓
Parser
   ↓
Book Model
   ↓
EbookRenderer
   ↓
RenderedBook
   ├── XHTML documents
   ├── CSS
   ├── assets
   ├── navigation data
   └── metadata
       │
       ├── Preview Host
       └── EPUB Packager
```

---

## RenderedBook proposal

```ts
export interface RenderedBook {
  documents: RenderedDocument[];
  stylesheets: RenderedStylesheet[];
  assets: RenderedAsset[];
  navigation: RenderedNavItem[];
  metadata: RenderedMetadata;
}

export interface RenderedDocument {
  id: string;
  href: string;
  title?: string;
  content: string;
  spineOrder: number;
}
```

This output should be usable without Obsidian APIs.

---

## Why not render Obsidian Reading View?

Because Obsidian Reading View is affected by:

- active Obsidian theme
- user CSS snippets
- other plugins
- Obsidian-specific markup
- Obsidian-specific DOM behavior

Those are not guaranteed to match EPUB readers.

Book Designer needs controlled markup.

---

## XHTML compatibility

When targeting EPUB, generated content should remain compatible with XHTML requirements and EPUB constraints.

Avoid preview-only DOM that gets accidentally exported.

If the preview needs additional wrappers, keep them outside the canonical rendered documents.

---

## CSS layers

Think of ebook CSS as layers:

```text
1. reset / normalization
2. structural book CSS
3. theme CSS
4. project design overrides
5. simulated reader overrides (preview only)
```

Reader overrides must never be written into the EPUB as publisher styles.

Example:

```text
Theme:
body { font-family: "EB Garamond"; }

Preview simulation:
.reader-simulation {
  --simulated-user-font-size: ...
}
```

Keep these concepts separate.

---

## Render determinism

Rendering should be deterministic.

Do not generate random IDs each time if they affect anchors or navigation.

Prefer stable IDs derived from:

- section ID
- source path
- normalized slug
- deterministic counters

---

## Escaping and sanitization

Generated XHTML must escape user content.

Markdown parsing must not permit arbitrary unsafe HTML to execute inside the plugin preview.

If raw HTML support is added:

- sanitize it
- document supported elements
- strip scripts
- strip event handlers
- block dangerous URLs

---

## Render diagnostics

Renderer should be able to return warnings.

Example:

```ts
interface RenderDiagnostic {
  level: "info" | "warning" | "error";
  code: string;
  message: string;
  source?: SourceReference;
}
```

Examples:

```text
IMAGE_MISSING_ALT
BROKEN_INTERNAL_LINK
UNSUPPORTED_MARKDOWN_BLOCK
DUPLICATE_HEADING_ID
MISSING_BOOK_TITLE
```

Display these in a future validation panel.

---

## Performance

Do not rerender the entire manuscript unnecessarily on every small UI interaction.

Possible levels:

1. parse cache per source file
2. Book Model cache
3. rendered chapter cache
4. theme invalidation
5. preview-only reader overrides via CSS variables

Example:

Changing simulated reader font size should ideally not reparse Markdown.

Changing scene-break design should rerender/re-style affected output but not reread vault files.

---

## Navigation

Render stable navigation anchors so the preview can support:

- chapter sidebar
- next/previous chapter
- table of contents
- jump from source note to preview section
- later EPUB navigation document

---

## Print renderer

Print must be a separate renderer sharing semantic input, not a giant conditional inside `EbookRenderer`.

```text
Book Model
  ├── EbookRenderer
  └── PrintRenderer
```

Both may share utilities such as:

- semantic block rendering
- typography tokens
- asset resolution
- heading formatting

But output constraints differ enough to justify separate renderers.
