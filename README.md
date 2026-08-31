# Book Designer

Book Designer is an Obsidian community plugin for visually designing and previewing manuscripts as books.

The plugin currently provides:

- A restrained **Book Designer** project-management workspace with a collapsible navigation rail
- A searchable, paginated **Themes** workspace with responsive chapter-preview cards
- Non-persistent hover/selection previews shared with the separate Preview tab
- Persistent custom theme duplicates with modular chapter opening, first paragraph, typography, and ornamental-break presets
- A project-independent **Elements** library for externally authored HTML packages, with Blockquote as the fifth theme category
- Authored controls in approved isolated sessions, producing static quotation XHTML/CSS shared by catalog, book preview, and the publication-fragment boundary
- A staged **Print settings** workbench for trim, physical margins, typography, chapter flow, printer guidance, and preview indicators
- Folder-backed projects with automatic internal persistence through Obsidian plugin data
- Create, select, rename, duplicate with **Save as**, and delete operations that never modify manuscript notes
- Portable `.book-designer.json` import/export for one project configuration
- Validated, collision-safe imports with explicit replace/copy/cancel choices
- A separate, shared-state **Book Preview** tab with live manuscript refresh and device simulation
- Browser-compatible TypeScript and vault API I/O for desktop and mobile Obsidian

Project management, themes, the vault-wide element library, and print production live in distinct Designer sections. Metadata, design, element assignments, print, and durable Preview settings remain part of each project and continue to drive Preview.

The **Themes** section is the focused design surface. Hovering a theme or element preset temporarily overrides the Preview tab without changing the project. Selecting keeps that temporary preview active while other choices are hovered. **Apply** persists the selected theme or preset; **Cancel** restores the book's applied design. **Edit duplicate** creates a custom theme copy before opening the modular element editor.

The **Print settings** section stages physical-edition changes until **Apply** is selected, while valid drafts render temporarily in the separate Preview tab. It supports preset and custom trim sizes, printer-safe and content margins, running header/footer zones, print-only type adjustments, recto chapter openings, folio start, color mode, and persistent margin indicators drawn over the actual print pages. Printer profiles are local advisory data and never block custom values.

## Project persistence and files

**Elements** imports single HTML files from the vault without modifying the source. Its library supports local metadata, duplication, disable/enable, usage-protected deletion, explicit global replacement, and one-package backup recovery. Preview execution requires content-bound local approval for imported code. The built-in Basic blockquote includes Classic rule and Plain quotation presets; it uses the same contract as imported packages. Markdown `>` quotations, including nested/list quotations, are styled semantically; ordinary quotation marks are not.

Read the [element system](book-designer-docs/docs/ELEMENT_SYSTEM.md) and [external authoring guide](book-designer-docs/docs/ELEMENT_AUTHORING.md). V1 has no source editor, ZIP/assets support, automatic updater, or publication packaging. Isolation does not guarantee CPU/memory limits or total network containment; approve only code you trust.

Book Designer automatically saves the internal project registry in plugin data. This autosave is the normal working state and does not create files in the manuscript folder.

- **Save as** duplicates the selected internal project with a new stable ID. It preserves its source and durable configuration while resetting page, section, and scroll position.
- **Open/import** reads a vault-local `.book-designer.json` file as untrusted input, validates it, and selects the imported project. ID collisions require an explicit replace, copy, or cancel decision.
- **Export** writes one portable, versioned project configuration to a vault-relative path. It contains no manuscript text, rendered HTML, runtime Book Model, global plugin settings, or unrelated mockups.
- New exports use project-file **v3**, including only referenced element packages. Imports support v1/v2/v3, remap independent package identities, and never transfer execution approval or package backups.
- Publication export (EPUB, PDF, or rendered book output) is a separate future feature.

Deleting a project removes only its configuration. It never deletes or edits the referenced folder or notes.

## Development

Install dependencies:

```bash
npm install
```

Run the esbuild watcher:

```bash
npm run dev
```

Create a production build:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

Run tests:

```bash
npm test
```

Run the real Chromium integration harness (including authored controls, library operations, sandbox checks, static output with scripting disabled, and reader reflow):

```bash
npx playwright install chromium
npm run test:browser
```

The harness uses a test-only Obsidian API adapter. It does not establish Obsidian/Electron or mobile security/visual compatibility. See the [host verification checklist](book-designer-docs/docs/TESTING.md).

## Manual testing

This repository is intended to live inside an Obsidian vault at:

```text
<Vault>/.obsidian/plugins/book-designer/
```

After building, reload Obsidian 1.7.2 or later and enable **Book Designer** in **Settings -> Community plugins**.

Use the **Book Designer** ribbon button or **Book Designer: Open** to open the project workspace. Select **Project file**, **Themes**, **Elements**, or **Print settings**, or select **Open preview** to reveal the active project in the separate Preview tab. Because both are normal Obsidian tabs, they can be arranged beside Markdown, Longform, or each other.

## Release artifacts

Obsidian loads these files from the plugin folder:

- `main.js`
- `manifest.json`
- `styles.css`

`main.js` is generated by esbuild and should not be committed to source control.
