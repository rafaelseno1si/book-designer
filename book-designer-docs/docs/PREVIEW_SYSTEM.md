# Preview System

## Element compilation integration

Blockquote catalog/settings previews use labeled sample content. Selecting/editing a theme assignment also updates actual manuscript quotations through the shared runtime. Compilation is asynchronous, debounced, cached and generation-checked; the renderer remains synchronous. Valid same-project output stays visible during recompilation, but project switches/library invalidation do not reuse another project's artifact. Cancel/navigation restore the applied project's design.

Executable frames exist only for background compilation and the open authored editor, not for each quotation/card. Preview/publication XHTML contains no package script, bridge, editor control or authoring frame. Existing live source refresh, continuous virtualization, and paged virtualization consume the resulting static document. See [Element system](ELEMENT_SYSTEM.md) and the [verification checklist](TESTING.md).

## Product goal

Provide immediate visual feedback while preserving the reality that reflowable ebooks are adaptive.

The preview should answer:

- Does my book design look good?
- Does the text reflow safely?
- Are chapter openings readable?
- Do scene breaks work?
- How does the design respond to large text?
- What happens on a narrow phone?
- What happens on a tablet?

---

## Ebook preview

Suggested UI:

```text
┌─────────────────────────────────────────────────────────┐
│ Device: E-reader 6"  │ Portrait │ Aa ━━━●━━ │ 100%    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│                 CHAPTER FOUR                            │
│                                                         │
│                 The Visitor                             │
│                     ❦                                   │
│                                                         │
│  It had been seven years since Michael returned to      │
│  the city. Nothing appeared to have changed...          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Device presets

Do not market presets as exact hardware emulation unless proven.

Prefer generic labels initially:

```text
Phone Narrow
Phone
E-reader 6"
E-reader Large
Tablet
Custom
```

Example model:

```ts
interface PreviewDevicePreset {
  id: string;
  label: string;
  width: number;
  height: number;
  defaultFontSize: number;
  category: "phone" | "ereader" | "tablet" | "custom";
}
```

Dimensions are simulation inputs, not publishing metadata.

---

## Reader controls

Preview-only controls may include:

- font size
- line height
- margins
- orientation
- publisher font enabled/disabled
- reader color theme

These represent user-controlled reader settings.

They must not accidentally modify the book's publisher CSS.

---

## Book design controls vs reader controls

This distinction must be obvious.

### Book design

Changes export output:

```text
Theme
Chapter heading style
Scene break ornament
Body font preference
First paragraph style
Image treatment
```

### Reader simulation

Does not change export output:

```text
Reader font size
Reader margins
Viewport
Orientation
Light/dark simulation
```

This is an important UX concept.

---

## Preview navigation

Early version:

- chapter list/sidebar
- previous/next section
- current section title
- scroll position preservation

Later:

- table of contents
- search
- source sync
- "edit this section" action
- split source/preview view

---

## Real-time behavior

Desired:

```text
Edit Markdown note
      ↓
debounce
      ↓
reparse changed file
      ↓
update Book Model
      ↓
rerender affected section
      ↓
preview updates
```

Do not rebuild every source file when only one chapter changed unless simplicity is necessary for the first prototype.

---

## Isolation

Preview rendering must not inherit arbitrary Obsidian note styles.

Candidates:

### iframe

Pros:

- strong CSS isolation
- natural document viewport
- easy device sizing

Cons:

- communication complexity
- security/CSP considerations
- asset URL handling

### Shadow DOM

Pros:

- simpler app communication
- CSS isolation

Cons:

- not identical to standalone document behavior
- CSS/book tooling may need adaptation

Choose after a prototype. Do not hard-code architecture assumptions before testing both.

---

## Preview fidelity statement

For ebooks:

> The preview simulates reflow and publisher styling. Actual rendering can vary by reading app, device, and reader settings.

For print:

> The print preview should eventually use the same page geometry and layout rules as PDF export.

---

## Mock preview vs real preview

Avoid building a pure visual mock unrelated to export markup.

The ideal preview is:

```text
actual rendered book content
+
simulated reader environment
```

not:

```text
React components that resemble an ebook
```

This distinction is fundamental.
