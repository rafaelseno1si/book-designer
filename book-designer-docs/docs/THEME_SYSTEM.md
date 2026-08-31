# Theme System

## Current library-backed category

Theme elements has five items: Chapter opening, First paragraph, Typography, Ornamental break, and **Blockquote**. The first four retain their existing presets. Blockquote selects compatible presets from the separate, project-independent **Elements** library; its catalog links to Manage elements rather than duplicating package CRUD.

Themes store `design.elements.blockquote = { elementId, presetId, settingsOverrides }`. Defaults, preset values, then overrides determine effective settings. The selected assignment decorates every semantic Markdown blockquote in the book. Catalog/settings use a labeled sample even without manuscript quotations. Authored controls are embedded in isolation; React owns preset selection, diagnostics, Reset, Apply and Cancel. Apply saves the custom theme; Apply theme to book is still a separate action. Cancel/navigation discard the draft and restore the applied project preview.

Custom/imported element code belongs to the element library, never a theme manifest. See [Element system](ELEMENT_SYSTEM.md) and [Element authoring](ELEMENT_AUTHORING.md). The conceptual theme asset formats below remain future design notes, not supported import formats.

## Goal

Themes should give authors polished book designs without requiring CSS expertise.

A theme controls book appearance while preserving semantic manuscript structure.

---

## Theme concept

Possible structure:

```text
themes/
  classic/
    theme.json
    ebook.css
    print.css
    assets/

  modern/
    theme.json
    ebook.css
    print.css
    assets/
```

Built-in themes may initially be compiled into the plugin rather than stored as arbitrary folders.

---

## Theme manifest

Example:

```json
{
  "id": "classic",
  "name": "Classic",
  "version": 1,
  "supports": {
    "ebook": true,
    "print": false
  },
  "defaults": {
    "chapterHeadingStyle": "centered",
    "sceneBreakStyle": "asterisms",
    "firstParagraphStyle": "no-indent"
  }
}
```

---

## Design tokens

Use meaningful tokens.

Example:

```ts
interface EbookThemeTokens {
  bodyFontFamily: string;
  headingFontFamily: string;

  paragraphIndent: string;
  paragraphSpacing: string;
  lineHeight: number;

  chapterTitleAlignment: "left" | "center";
  chapterTopSpacing: string;

  sceneBreakSpacing: string;
}
```

Avoid exposing every CSS property as a setting.

---

## Theme variants

A theme can expose controlled variants.

Example:

```text
Chapter heading
○ Minimal
● Ornament
○ Large number

First paragraph
● No indent
○ Drop cap
○ Small caps

Scene break
● * * *
○ ❦
○ ◆
```

The renderer translates these semantic preferences into classes/tokens.

---

## Overrides

Project-specific overrides may sit on top of a theme.

```ts
interface BookDesignConfig {
  themeId: string;
  overrides: {
    bodyFontFamily?: string;
    chapterHeadingStyle?: string;
    sceneBreakStyle?: string;
    firstParagraphStyle?: string;
  };
}
```

Avoid copying the entire theme into every project.

---

## Fonts

Font handling requires special care.

Questions for later implementation:

- Is the font bundled?
- Is its license compatible with embedding?
- Is the font available on mobile?
- Should EPUB embed the font?
- Can the reader override publisher fonts?
- What happens if font embedding is disabled?

Initial implementation can use safe built-in/fallback font stacks while the font asset pipeline is designed.

---

## Custom themes

Do not prioritize user-installable themes for v0.1.

But architect themes so future support is possible.

Future possibilities:

- install theme ZIP
- theme manifest validation
- theme preview thumbnails
- theme export
- community theme repository
- custom ornaments/assets

Security matters if themes can include files. Never allow arbitrary executable code in themes.

---

## Ebook and print themes

A named theme can have both ebook and print expressions:

```text
Classic
 ├── ebook.css
 └── print.css
```

But do not assume the rules are identical.

Example:

- ebook margins are reader-controlled
- print margins are publication-controlled
- ebook page numbers generally do not exist
- print page numbers do
- ebook layout reflows
- print layout paginates

Keep shared visual identity while respecting output differences.
