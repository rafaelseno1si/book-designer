# Semantic Book Model

## Why a Book Model exists

The plugin must not render directly from arbitrary Markdown into UI-specific HTML.

A semantic intermediate model gives us:

- predictable rendering
- multiple source adapters
- multiple output formats
- testability
- stable theme behavior
- separation between manuscript semantics and appearance

---

## Goals

The model should express:

- book metadata
- manuscript order
- sections
- chapters
- block-level content
- inline formatting
- images
- links
- scene breaks
- semantic front/back matter

It should not initially express arbitrary pixel layout.

---

## Proposed top-level model

```ts
export interface Book {
  id: string;
  metadata: BookMetadata;
  sections: BookSection[];
}

export interface BookMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  language: string;

  publisher?: string;
  isbn?: string;
  description?: string;

  cover?: BookAssetRef;
}
```

---

## Sections

```ts
export type BookSectionType =
  | "title-page"
  | "copyright"
  | "dedication"
  | "epigraph"
  | "toc"
  | "foreword"
  | "preface"
  | "introduction"
  | "part"
  | "chapter"
  | "interlude"
  | "epilogue"
  | "afterword"
  | "acknowledgements"
  | "about-author"
  | "other";
```

Suggested:

```ts
export interface BookSection {
  id: string;
  type: BookSectionType;
  title?: string;
  subtitle?: string;
  number?: number | string;
  source?: SourceReference;
  blocks: BookBlock[];
}
```

---

## Blocks

Keep the initial set small.

```ts
export type BookBlock =
  | ParagraphBlock
  | HeadingBlock
  | SceneBreakBlock
  | BlockquoteBlock
  | ImageBlock
  | ListBlock;
```

Later:

```text
FootnoteBlock
TableBlock
PoetryBlock
CodeBlock
FigureBlock
SidebarBlock
```

Do not implement everything before real manuscripts require it.

---

## Inline model

Example:

```ts
export type InlineNode =
  | TextNode
  | EmphasisNode
  | StrongNode
  | LinkNode
  | InlineCodeNode
  | LineBreakNode;
```

Footnote references may be added later.

---

## Scene breaks

Scene breaks should be semantic:

```ts
interface SceneBreakBlock {
  type: "scene-break";
}
```

Do not store:

```ts
{
  text: "* * *"
}
```

as the canonical meaning.

Themes can decide whether the scene break renders as:

```text
* * *
❦
◆
custom SVG/image
extra spacing
```

---

## First paragraph semantics

The renderer should be able to determine paragraph context.

Examples:

- first paragraph after chapter heading
- paragraph after scene break
- first paragraph after subheading

This is needed for options such as:

- no indent
- drop cap
- small caps
- standard indent

Avoid encoding these styles into the source Markdown.

---

## Source references

Keep traceability back to Obsidian.

```ts
export interface SourceReference {
  vaultPath: string;
  startLine?: number;
  endLine?: number;
}
```

This can later support:

- "Edit source"
- diagnostics
- error messages
- source synchronization
- navigation from preview to note

---

## Assets

Images should resolve to stable asset references.

```ts
export interface BookAssetRef {
  id: string;
  sourcePath: string;
  mediaType?: string;
  alt?: string;
}
```

The export packager can map these to safe EPUB-relative paths later.

---

## Part hierarchy

There are two possible strategies:

### Flat ordered sections

```text
Part I
Chapter 1
Chapter 2
Part II
Chapter 3
```

Advantages:

- simple renderer
- simple navigation
- natural EPUB spine

### Nested structure

```text
Part I
 ├ Chapter 1
 └ Chapter 2
```

Advantages:

- richer semantics

Recommended early approach:

Use a flat ordered spine with optional hierarchy metadata.

Do not make rendering depend on a deeply nested tree unless required.

---

## Validation

Before rendering, validate:

- IDs are unique
- title exists if required
- source paths resolve
- assets resolve
- section order is deterministic
- unsupported blocks are surfaced clearly

Rendering should not silently discard unsupported content.
