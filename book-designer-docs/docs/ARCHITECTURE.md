# Architecture

## High-level architecture

```text
Obsidian Vault
     │
     ▼
Source Adapter
     │
     ▼
Normalized Manuscript Source
     │
     ▼
Markdown Parser / Semantic Normalizer
     │
     ▼
Book Model
     │
     ├───────────────┐
     ▼               ▼
Ebook Renderer    Print Renderer
     │               │
     ▼               ▼
XHTML + CSS       HTML + CSS
   │   │             │   │
   │   └─ EPUB       │   └─ PDF
   │                 │
   └─ Live Preview   └─ Print Preview
```

---

## Layers

### 1. Plugin shell

Obsidian-specific.

Responsibilities:

- plugin lifecycle
- commands
- views
- settings
- vault access
- project persistence
- notices
- feature discovery
- mobile/desktop capability detection

Should not contain book-rendering business logic.

---

### 2. Source adapters

Convert external manuscript organization into a common intermediate representation.

Examples:

```text
FolderSourceAdapter
ManualSelectionSourceAdapter
CurrentNoteSourceAdapter
LongformSourceAdapter
```

Output:

```ts
interface ManuscriptSource {
  id: string;
  title?: string;
  files: SourceDocument[];
}
```

No visual rendering at this layer.

---

### 3. Parser and semantic normalizer

Responsibilities:

- parse Markdown
- read YAML frontmatter where useful
- identify headings
- identify paragraphs
- identify blockquotes
- identify lists
- identify scene breaks
- resolve internal image references
- extract footnotes later
- normalize source differences

Output should be a domain-specific book model.

---

### 4. Book Model

Canonical representation used by all renderers.

Must remain independent of React and Obsidian.

See `BOOK_MODEL.md`.

---

### 5. Theme system

A theme is a named collection of design tokens and supported options.

Theme logic should describe intentional book design, not arbitrary page coordinates.

See `THEME_SYSTEM.md`.

---

### 6. Renderers

Render semantic book content into output-specific markup.

Initial:

```text
EbookRenderer
```

Later:

```text
PrintRenderer
```

Renderers should be deterministic.

Given the same:

- Book Model
- theme
- render settings

they should produce the same output.

---

### 7. Preview layer

The preview embeds renderer output into an isolated preview environment.

Responsibilities:

- viewport size
- reader simulation
- navigation
- zoom
- user-reader overrides
- preview state

Preview should not modify the canonical Book Model.

---

### 8. Export layer

Takes renderer output and packages it.

For EPUB:

```text
Book Model
  ↓
Ebook Renderer
  ↓
XHTML/CSS/assets
  ↓
EPUB Packager
  ↓
.epub
```

For print:

```text
Book Model
  ↓
Print Renderer
  ↓
paginated HTML/CSS
  ↓
PDF Engine
```

---

## Suggested source tree

```text
src/
├── main.ts
│
├── plugin/
│   ├── settings.ts
│   ├── commands.ts
│   ├── project-store.ts
│   └── capabilities.ts
│
├── views/
│   ├── BookDesignerView.ts
│   └── SettingsTab.ts
│
├── components/
│   ├── BookDesignerApp.tsx
│   ├── ManuscriptNavigator.tsx
│   ├── PreviewToolbar.tsx
│   ├── PreviewFrame.tsx
│   ├── ThemePanel.tsx
│   └── ExportDialog.tsx
│
├── core/
│   ├── model/
│   ├── sources/
│   ├── parser/
│   ├── renderer/
│   ├── themes/
│   ├── preview/
│   └── export/
│
├── integrations/
│   ├── longform/
│   └── desktop/
│
└── utils/
```

This is a direction, not a rigid requirement.

---

## State boundaries

Prefer three distinct categories of state.

### Project state

Persisted:

- selected manuscript source
- file order
- book metadata
- chosen theme
- design options
- ebook settings
- print settings later

### Preview state

Usually not publication metadata:

- current chapter
- current scroll/page
- selected simulated device
- preview zoom
- temporary reader font size
- light/dark/sepia reader simulation

### Application state

Plugin-global:

- defaults
- feature flags
- paths to optional desktop tools
- last opened project
- telemetry preference if ever introduced

Do not mix these categories into one giant settings object.

---

## Mobile-compatible architecture

The following should be browser-compatible:

```text
Book Model
Markdown parsing
Theme system
Ebook renderer
Preview renderer
EPUB packaging where feasible
```

Desktop-only adapters may use Node APIs.

Example:

```ts
interface OptionalDesktopTools {
  pandoc?: PandocAdapter;
  calibre?: CalibreAdapter;
  kindlePreviewer?: KindlePreviewerAdapter;
}
```

The core must work without these adapters.

---

## Rendering isolation

The rendered book must be shielded from Obsidian theme CSS.

Potential techniques:

- iframe
- shadow DOM
- strongly scoped CSS

Evaluate security and compatibility before choosing.

The architecture should support deterministic CSS injection for each preview.

---

## Persistence

Prefer storing Book Designer project metadata in plugin-managed JSON, or a documented lightweight project file.

Do not rewrite the user's manuscript unless explicitly requested.

If metadata is stored in manuscript frontmatter later, it should be optional and narrowly scoped.

---

## Dependency policy

Avoid dependency sprawl.

Potentially reasonable dependency categories:

- Markdown parser / AST utilities
- HTML sanitization
- ZIP generation for EPUB
- XML generation
- React
- lightweight schema validation

Before introducing a large publishing framework, document why it is needed.
