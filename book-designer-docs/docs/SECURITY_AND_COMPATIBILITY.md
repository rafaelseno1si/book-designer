# Security and Compatibility

## Implemented element trust boundaries

1. Inert inspection uses parse5 and CSS Tree; importing a package does not execute it.
2. Explicit local approval is bound to the exact verified SHA-256 source digest. Built-in IDs are reserved; arbitrary imports cannot claim them.
3. Approved authoring runs inside an `allow-scripts`-only opaque child frame, itself inside a host-controlled opaque guard. Host CSP is inserted before package content and denies external resources, connections, workers, forms, embeds and child frame URLs. Sandbox flags deny same-origin privileges, popups, downloads and privileged/top navigation. The outer guard retains its policy beyond the package's reach and detects/blocks child self-navigation. Parent-origin strings are not used as authentication: sender-window checks bind a MessagePort, and bounded versioned messages validate session/request IDs and revisions.
4. Output is independently validated: strict XML parsing/allowlist reconstruction, exactly one semantic wrapper/empty slot, scoped parsed CSS, no scripts/handlers/controls/bridges/resources. Trusted semantic child content is inserted afterward.

Imported execution requires a runtime isolation probe checking parent-DOM denial, absence of exposed privileged globals, and outer-policy blocking of child self-navigation. If those essential checks fail, packages/assignments remain stored but imported execution is disabled. The probe and Chromium harness are defense in depth, not a complete security certification.

Do **not** claim hard CPU/memory isolation, total network containment, or reliable timer interruption of synchronous infinite loops. Authoring runs in the host browser engine; only approve trusted source. Timers/size/rate limits bound cooperative requests, not hostile CPU usage. The context excludes manuscript text, paths, credentials and host APIs. Host UI tokens are separate from publication tokens. No intentional network request or telemetry is introduced by the plugin's element services.

Vault-local approval storage uses optional Obsidian APIs introduced in 1.8.7; minimum 1.7.2 hosts have session-only approval with a notice. Real Chromium automated checks pass, but this implementation has **not been host-verified in Obsidian/Electron or on Android/iOS**. Follow [Testing](TESTING.md) before claiming host support verification. See [Element authoring](ELEMENT_AUTHORING.md) for exact limits.

## Threat model

Book Designer processes user-authored Markdown, inert imported mockups, and approved single-file element authoring packages. Images, packaged theme assets and external-tool output remain future extensions.

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

Themes may reference separately installed element-library packages, but only declarative assignments are stored in the theme. Element authoring code runs under the separate boundaries above and never enters publication output.

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
