# Development Workflow

## Repository

The plugin repository should live directly in a test vault during development when convenient.

Example:

```text
TestVault/
└── .obsidian/
    └── plugins/
        └── book-designer/
            ├── .git/
            ├── src/
            ├── manifest.json
            ├── package.json
            └── styles.css
```

Use a dedicated development vault rather than an important personal vault.

---

## Initial commands

Typical sample-plugin workflow:

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Use the actual scripts defined in `package.json` if they differ.

---

## Development loop

```text
VS Code / Codex
     ↓
edit TypeScript / React / CSS
     ↓
esbuild watch
     ↓
main.js
     ↓
reload plugin / Obsidian
     ↓
test in development vault
```

---

## React setup

Use React for the main complex custom view.

Do not rebuild simple Obsidian settings controls in React unless it provides a clear benefit.

React component tree might begin as:

```text
BookDesignerApp
├── ManuscriptSidebar
├── PreviewWorkspace
│   ├── PreviewToolbar
│   └── PreviewFrame
└── DesignSidebar
```

---

## First development milestone

Do not start with EPUB packaging.

Start with:

1. register a custom Book Designer view
2. mount React
3. select a folder
4. display ordered `.md` files
5. parse one chapter
6. render isolated preview HTML
7. refresh after source changes

That proves the plugin architecture.

---

## Suggested branches

Simple workflow:

```text
main
feature/preview-view
feature/book-model
feature/folder-source
feature/theme-system
feature/epub-export
```

Small projects can also work directly with short-lived feature branches.

---

## Codex task style

Good Codex task:

```text
Implement Phase 1 folder manuscript loading according to
docs/ARCHITECTURE.md and docs/BOOK_MODEL.md.

Requirements:
- do not add Node-only filesystem APIs
- keep source adapter independent from renderer
- add tests
- run build/typecheck/tests
```

Poor task:

```text
Build the whole Vellum clone.
```

Prefer one coherent architecture slice at a time.

---

## Debugging

Add optional debug logging behind a setting or development flag.

Useful diagnostics:

- source adapter selected
- source files discovered
- parse duration
- number of sections
- render duration
- unresolved assets
- renderer warnings

Do not leave noisy console output enabled by default.

---

## Release preparation

Community plugin packaging normally needs the plugin's distributable files such as:

```text
main.js
manifest.json
styles.css
```

Follow current Obsidian community-plugin submission requirements when release work begins.

Do not optimize release automation before the plugin provides useful functionality.
