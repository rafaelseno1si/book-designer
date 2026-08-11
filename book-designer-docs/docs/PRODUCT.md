# Product Definition

## Problem

Obsidian is excellent for writing and organizing Markdown, and plugins such as Longform improve long-form manuscript workflows.

Export tools can compile Markdown into EPUB, DOCX, PDF, HTML, and other formats.

The missing experience Book Designer targets is the visual stage between writing and export:

- What will my chapter opening look like?
- How does this theme feel?
- How does the manuscript reflow on a small e-reader?
- Are scene breaks obvious?
- Are first paragraphs styled correctly?
- Does changing font size break anything?
- How will the print edition differ from the ebook?

Authors currently often discover these things after compilation.

---

## Product statement

Book Designer is:

> A visual book-design, typesetting-preview, and publication-preparation layer for Obsidian manuscripts.

It is not primarily:

- a Markdown editor
- a manuscript organizer
- a format converter
- a replacement for Longform
- a replacement for Calibre
- a replacement for Pandoc
- a page-layout application like InDesign

---

## Target user

Primary target:

- fiction writers
- nonfiction writers
- independent authors
- Obsidian users writing books
- users who prefer Markdown
- authors who want a friendly visual formatter before publishing

Secondary target:

- technical writers
- academics with simple book layouts
- people exporting serial or long-form content

Not an initial target:

- magazines
- highly graphical textbooks
- children's fixed-layout books
- comics
- complex scientific publishing
- print books requiring advanced prepress

---

## Core user journey

```text
1. User writes manuscript in Obsidian.

2. User opens Book Designer.

3. User selects:
   - folder
   - ordered notes
   - Longform project

4. Plugin builds a semantic Book Model.

5. User chooses a book theme.

6. Plugin renders the manuscript.

7. User previews it at different ebook sizes.

8. User changes book design settings.

9. Preview updates immediately.

10. User saves project design settings.

11. User exports EPUB.

12. Later:
    user configures print edition and exports PDF.
```

---

## Product differentiation

The key differentiator is **design-before-export**.

Existing export tools are useful even if Book Designer exists. Book Designer should complement them where appropriate.

The strongest value proposition is:

```text
visual feedback
+
book-specific themes
+
reflow testing
+
same renderer for preview/export
+
Obsidian-native workflow
```

---

## Ebook reality

Reflowable EPUB does not have one canonical page layout.

Reader software can change:

- screen dimensions
- font family
- font size
- line spacing
- margins
- orientation
- theme
- accessibility preferences

Therefore the UI should never imply that a simulated page number will necessarily match a real Kindle or Kobo.

Use wording such as:

- "Ebook Preview"
- "Reader Simulation"
- "Viewport"
- "Reflow Test"

Avoid wording such as:

- "Exact Kindle page"
- "Guaranteed Kindle rendering"

---

## Print reality

Print output is fixed.

A future Print Designer can control:

- trim
- margins
- gutter
- page breaks
- running heads
- page numbers
- recto/verso
- widow/orphan handling
- chapter-opening pages

Print preview can therefore aim for much stronger WYSIWYG fidelity.

---

## Design philosophy

Authors choose semantic and stylistic preferences.

They should not normally manipulate arbitrary CSS or absolute coordinates.

Example:

```text
First paragraph:
[ No indent ]
[ Drop cap ]
[ Small caps ]
```

not:

```text
margin-left: 1.17em
font-size: 1.04rem
float: left
line-height: 0.83
```

Advanced custom CSS may come much later.

---

## Success criteria for early versions

A successful early version does not need every export format.

It succeeds if users can:

- load a realistic manuscript
- see the full manuscript as a designed book
- inspect chapters quickly
- simulate multiple ebook screen sizes
- change typography/design settings
- see changes immediately
- trust that the same styling path is intended for eventual EPUB export
