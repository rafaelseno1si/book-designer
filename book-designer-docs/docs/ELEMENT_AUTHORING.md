# Authoring an element (v1)

Develop a self-contained HTML file outside Book Designer. The complete working example is [`basic-blockquote.html`](../../src/elements/builtins/basic-blockquote.html): its manifest, two presets, HTML controls, CSS, interaction logic, and render function all live in that one file. No host-side special cases implement its visual design.

Copy/edit that example with your normal editor, place the result in the vault, then select **Elements → Create/import element**. Inspection does not execute code. Approve only code you trust; preview controls and the background compiler run it in isolated frames. Revisions to the source file are not automatically imported: use Replace element file or import-as-new explicitly.

## Manifest

Exactly one inline block is required:

```html
<script type="application/json" data-book-designer-manifest>
{
  "format": "book-designer-element",
  "version": 1,
  "apiVersion": 1,
  "id": "example.quotation",
  "name": "Example quotation",
  "packageVersion": "1.0.0",
  "description": "Optional package description",
  "category": "block.blockquote",
  "placement": "normal-flow",
  "contract": "wrap-content",
  "outputs": ["xhtml"],
  "defaults": { "italic": false },
  "settingsSchema": { "italic": { "type": "boolean" } },
  "presets": [
    { "id": "plain", "name": "Plain", "settings": {} }
  ]
}
</script>
```

All shown fields except description are required. Category, placement, rendering contract, and output target are distinct capabilities, not interchangeable labels. V1 supports only the values above. Unknown fields/capabilities are rejected. Package IDs are descriptive, not installed-library identities. Version labels are bounded display text, not dependency-resolution instructions.

IDs use letters/numbers/dots/underscores/hyphens, begin with a letter/number, and are at most 128 characters. Prototype-sensitive IDs/keys are rejected. Names are at most 200 characters, descriptions 2,000, version labels 64. Provide 1–32 presets, each with a unique ID, name, optional description and partial `settings` object.

## Settings schema

The schema validates data; it **does not generate controls**. Up to 32 scalar keys are allowed:

| Kind | Rule |
|---|---|
| Boolean | `{ "type": "boolean" }` |
| Number | `{ "type": "number", "minimum": 0, "maximum": 3 }` (finite inclusive bounds) |
| Bounded string | `{ "type": "string", "maxLength": 80 }` (1–2,000 maximum) |
| Enum | String rule plus `"enum": ["start", "center"]` (1–32 options) |
| Color or theme | `{ "type": "string", "maxLength": 7, "format": "color-or-theme" }` |

Color values are exactly `theme` or six-digit `#RRGGBB`. Objects, arrays, unknown keys, control characters and nonfinite numbers are not settings. Defaults must completely satisfy the schema. Presets and assignment overrides are validated partial settings. Never silently coerce invalid values. Prefer inherited typography and relative spacing that continues to work at large reader sizes.

## Authored controls and bridge

Register once from a classic inline script after creating the controls:

```js
BookDesignerElement.register({
  applySettings(settings, context) {
    document.getElementById('italic').checked = settings.italic;
  },
  readSettings() {
    return { italic: document.getElementById('italic').checked };
  },
  render({ settings, context }) {
    return {
      xhtml: '<blockquote><div data-book-designer-content-slot=""></div></blockquote>',
      css: ':scope{font-family:inherit;font-style:' +
        (settings.italic ? 'italic' : 'normal') + '}'
    };
  }
});
document.addEventListener('input', () => {
  BookDesignerElement.notifySettingsChanged();
});
```

`applySettings` initializes/reset controls; `readSettings` returns the complete current settings. Notify on user edits. Initialization suppresses change notifications. `render` may be asynchronous, but must use only its explicit settings/context inputs: it is called in a fresh background runner **without opening/initializing the editor**. Do not read form values, manuscript content, time/randomness, or persistent browser state to determine publication output. Returning the same validated artifact for the same inputs is the contract.

The host owns the versioned MessagePort protocol: protocol/session/request IDs, revisions, results/errors, settings-change events, height events, byte limits, rate limits and deadlines. Do not implement your own parent messaging. Sender-window checks authenticate the handshake; the opaque origin string `null` is not authentication. Stale replies are discarded. Host/editor teardown closes ports, removes frames/listeners, cancels timers and disconnects observers.

## Context and UI tokens

Publication context exposes only:

- `target`: `ebook` or `print`; `language`; `slot`: `block.blockquote`.
- `bodyFontFamily`, `textColor`, `accentColor`: resolved canonical publication tokens.
- Optional `print`: `{ unit: 'in', width, height, inside, outside, top, bottom }` from available print geometry.

No book text, titles, filenames, vault paths, credentials, parent DOM, Obsidian/Electron APIs, or source-note access is provided. A semantic content slot receives trusted book content **after** compilation, outside the runner.

Authored UI CSS may use separate optional `--bd-ui-text`, `--bd-ui-background`, `--bd-ui-surface`, `--bd-ui-muted`, `--bd-ui-border`, and `--bd-ui-accent` variables, with local fallbacks. Never use these host UI tokens in publication CSS. Publication colors come from the explicit context. V1 has no font/assets/network loader.

## Static XHTML/CSS contract

Return exactly `{ xhtml, css }` strings. XHTML is parsed as XML, then reconstructed through an allowlist; it is not trusted HTML insertion.

- Exactly one semantic `<blockquote>` root; one empty `<div data-book-designer-content-slot=""></div>` at a valid block-container position.
- Allowed descendants: `div`, `span`, `p`, `cite`, `em`, `strong`, `br`. `div`/`p` cannot be nested inside phrasing containers. Nested author-supplied blockquotes are rejected; actual manuscript nested quotations are rendered recursively by the host.
- Attributes: constrained `class`, the slot marker, and optional root XHTML namespace. Classes are renamed into the host scope. No IDs, links/resources, handlers, style attributes, scripts, controls, comments, DTDs or processing instructions in the wrapper. Manuscript links/emphasis/lists come from trusted semantic child rendering.
- The slot marker is removed and trusted child XHTML is inserted into its container. Nothing executes in the publication fragment.

CSS Tree parses and validates output CSS. Every selector starts with `:scope`, optionally followed by direct-child (`>`) tag/class selectors, e.g. `:scope > .quotation-content > p`. Host-owned scopes and class rewriting prevent document/global selector escape. Descendant/sibling combinators, attributes, pseudo-classes other than the initial scope, and at-rules are rejected.

Supported declarations cover color/background-color, font style/weight/size/family, line-height, text-align/indent, margins, padding, and borders. `font-family` must be `inherit`. Dimensions are nonnegative 0–3 `em`/`rem`; numeric values are 0–3 (font weight up to 900). Percentages, functions (including `url`, `var`, `calc`, RGB functions), string values, `!important`, negative spacing, positioning, overlays, transforms, animations, custom properties, and unsupported keywords are rejected. Use literal six-digit hex colors, inherited typography, and small relative dimensions. The built-in demonstrates an accent rule and paragraph-indent override.

## Limits and debugging

| Boundary | Limit |
|---|---|
| Package / manifest / settings | 512 KiB / 32 KiB / 16 KiB UTF-8 |
| Bridge message | 128 KiB UTF-8; at most 100 received messages/second |
| Wrapper / output CSS | 32 KiB each |
| Wrapper structure | 128 nodes, 12 levels |
| Package structure | 2,000 nodes, 32 levels |
| Handshake / request | 3 seconds / 5 seconds |
| Editor height | 160–800 CSS px |

Inspection errors identify manifest/contract/schema/resource problems before execution. Execution errors appear in the editor/preview; invalid output falls back to standard blockquotes. Test both presets, Reset, Cancel, Apply, book/theme changes, large reader text, nested quotations, and closed-editor compilation. Run `npm test`, `npm run build`, and `npm run test:browser` in the plugin repository. Browser screenshots are test artifacts in ignored `dist/`.

The sandbox is defense in depth, **not hard CPU/memory isolation or a guarantee of total network containment**. A synchronous infinite loop can block the host thread; timers cannot reliably interrupt it. Approve only trusted authors. Browser harness results do not certify Obsidian/Electron or mobile hosts; those require separate verification.

ZIP/packages with assets are not supported. A future importer must resolve archive/path/resource policies through the package-loading boundary described in [Element system](ELEMENT_SYSTEM.md), not through theme settings or a new authoring bridge.
