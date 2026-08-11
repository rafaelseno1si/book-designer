# Security and Compatibility

## Threat model

Book Designer processes user-authored Markdown and may eventually import raw HTML, images, theme assets, and external tool output.

Treat rendered manuscript content as untrusted input from the perspective of executable UI code.

---

## HTML

If raw HTML from Markdown is supported:

Never allow:

- `<script>`
- inline event handlers
- javascript: URLs
- arbitrary executable embeds

Prefer sanitization or a conservative supported-element policy.

---

## Preview isolation

An iframe or shadow root may be used to isolate the rendered book.

If using iframe content:

- carefully control scripts
- use sandboxing where practical
- avoid exposing privileged Obsidian APIs to the rendered document
- normalize asset URLs safely

Book content should never execute plugin-privileged code.

---

## File paths

Never trust manuscript links to be valid.

Normalize and validate vault paths.

Prevent export packaging from creating unsafe relative paths such as:

```text
../../something
```

Generated EPUB paths should be internal controlled paths.

---

## External tools

Desktop integrations such as Pandoc and Calibre involve spawning executables.

Rules:

- user explicitly configures or selects tool path
- never construct a shell command by string concatenation with manuscript content
- prefer argument arrays
- validate paths
- clearly mark desktop-only functionality
- show actionable errors
- do not silently install external software

---

## Theme safety

Future third-party themes should contain declarative assets/styles only.

Do not allow themes to ship executable JavaScript.

Sanitize/validate theme manifests.

---

## Mobile compatibility

Avoid Node/Electron imports in the cross-platform core.

Keep desktop code in clearly named modules.

A module imported on mobile must not transitively import Node-only code.

---

## Obsidian theme compatibility

Plugin UI should work in light and dark Obsidian modes.

Book preview styling must remain independent.

Test with:

- default theme
- a dark third-party theme
- a heavily customized theme if practical
