# Obsidian Integration

## Plugin host

Book Designer runs inside Obsidian.

Obsidian provides:

- vault access
- files
- notes
- application lifecycle
- workspace panes
- commands
- settings
- desktop/mobile host

The project should not introduce its own Electron wrapper.

---

## Plugin entry point

`src/main.ts` should remain thin.

Responsibilities:

```text
onload()
  register view
  register commands
  add ribbon icon if desired
  add settings tab
  initialize project store
  initialize source adapters

onunload()
  cleanup registered resources
```

Avoid parsing/rendering code directly inside plugin lifecycle methods.

---

## Custom view

Primary UI should be a custom Obsidian view, likely hosting a React root.

Conceptually:

```text
ItemView
   ↓
React root
   ↓
BookDesignerApp
```

The React application may provide:

```text
left:
  manuscript navigator

center:
  live preview

right:
  design controls
```

Do not assume a three-column layout is always viable on mobile.

---

## Commands

Possible commands:

```text
Book Designer: Open
Book Designer: Preview current note
Book Designer: Open folder as book
Book Designer: Refresh manuscript
Book Designer: Export EPUB
```

Only add commands once the underlying features exist.

---

## Vault access

Use Obsidian's vault APIs rather than direct filesystem access in cross-platform code.

Avoid top-level Node imports such as:

```ts
import fs from "fs";
import path from "path";
```

inside mobile-capable modules.

---

## Metadata cache

Use Obsidian's metadata services where helpful for:

- frontmatter
- links
- headings
- file changes

But keep the final book semantics under our own model.

---

## File change synchronization

Desired behavior:

```text
vault file modified
   ↓
is file part of open manuscript?
   ↓ yes
debounced refresh
   ↓
reparse changed source
   ↓
update preview
```

Avoid reacting to unrelated vault changes.

---

## Styling

Plugin chrome:

Use Obsidian theme variables where practical.

Book preview:

Must be isolated and controlled by Book Designer theme CSS.

Do not use the current Obsidian theme as the book theme.

---

## Mobile

UI must degrade gracefully:

Desktop:

```text
Navigator | Preview | Design panel
```

Mobile:

```text
Preview
[ Chapters ] [ Design ] [ Device ]
```

Use drawers/tabs rather than assuming permanent sidebars.

---

## Settings

Plugin-global settings might include:

- default theme
- default preview device
- auto-refresh preview
- desktop tool paths later
- debug mode

Project-specific book design should not be stored as global settings.

---

## Project storage

Potential initial direction:

Store plugin project definitions under the plugin's data store.

Each project references vault paths rather than copying manuscript content.

Do not mutate user notes just to persist view settings.
