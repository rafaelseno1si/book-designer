# Export Strategy

## Philosophy

Export is important, but the initial product should prove the visual design and preview workflow first.

The export system should package the same renderer output used by preview.

---

# EPUB

## Target

Native EPUB 3 export is the preferred first publication format.

Conceptual structure:

```text
book.epub
├── mimetype
├── META-INF/
│   └── container.xml
└── EPUB/
    ├── package.opf
    ├── nav.xhtml
    ├── styles/
    │   └── book.css
    ├── text/
    │   ├── title.xhtml
    │   ├── chapter-001.xhtml
    │   └── chapter-002.xhtml
    └── images/
```

The exact structure may evolve while remaining EPUB compliant.

---

## EPUB packaging pipeline

```text
Book Model
   ↓
Ebook Renderer
   ↓
RenderedBook
   ↓
EPUB Packager
   ↓
metadata
navigation
spine
manifest
assets
XHTML
CSS
   ↓
ZIP with EPUB rules
   ↓
.epub
```

---

## Validation

Eventually integrate validation into the export workflow.

Possible UX:

```text
Export complete

✓ package created
✓ navigation generated
✓ assets resolved
✓ metadata present

Validation:
0 errors
2 warnings
```

Desktop EPUBCheck integration may be optional if it requires external runtime tooling.

A pure JS validation layer may catch common errors even without official external validation.

---

## Internal links

Export must eventually resolve:

- internal Markdown links
- heading anchors
- image embeds
- footnote links

Do not simply copy Obsidian wiki-link syntax into XHTML.

---

## Images

Exporter responsibilities:

- resolve source asset
- determine media type
- copy into EPUB
- rewrite references
- ensure safe file names
- preserve alt text where possible

Image optimization can be a later feature.

---

# PDF

## Later phase

PDF should follow the print renderer, not the ebook renderer.

```text
Book Model
   ↓
Print Renderer
   ↓
paginated HTML/CSS
   ↓
PDF engine
```

Print requirements are substantially different.

Do not block early ebook work on PDF architecture.

---

## Potential PDF engines

Evaluate later based on:

- fidelity
- CSS paged media support
- mobile support requirements
- licensing
- bundle size
- deterministic output

Desktop-only PDF generation is acceptable if the core preview remains cross-platform.

---

# Pandoc

Pandoc is an optional desktop integration.

Potential use cases:

- DOCX
- ODT
- LaTeX
- extra conversion formats

Do not require Pandoc for live preview.

Do not make Pandoc the canonical rendering engine unless future requirements clearly justify it.

---

# Calibre

Calibre is an optional desktop integration.

Potential use cases:

- additional ebook conversions
- library workflows
- compatibility tooling

Book Designer should not depend on Calibre to function.

---

# Kindle Previewer

Potential desktop workflow:

```text
Export EPUB
   ↓
Open in Kindle Previewer
```

Useful as an external validation/inspection tool.

Do not claim Book Designer's internal preview is a perfect Kindle emulator.
