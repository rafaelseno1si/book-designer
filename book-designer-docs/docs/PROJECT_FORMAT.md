# Book Designer project format

## Persistence model

Book Designer has two complementary forms of project persistence:

- Internal plugin data automatically saves the versioned project registry, active project, and imported mockup library.
- A portable `.book-designer.json` file exports one project configuration for backup, version control, or import into another vault.

Neither form copies manuscript Markdown. Projects continue to reference a vault folder through the source-adapter configuration.

**Save as** is not a file export. It duplicates the active project inside the internal registry with a new stable ID and resets transient Preview navigation.

## Portable format v1

The top-level discriminator and version are fixed:

```json
{
  "format": "book-designer-project",
  "version": 1,
  "project": {
    "id": "project-01",
    "name": "My Novel",
    "source": { "type": "folder", "path": "Writing/My Novel" },
    "metadata": {
      "title": "My Novel",
      "author": "Author Name",
      "language": "english",
      "publisher": "",
      "isbn": ""
    },
    "design": {
      "themeId": "classic",
      "typographyScale": "comfortable",
      "chapterStyleId": "quiet",
      "sceneBreakId": "space"
    },
    "preview": {
      "deviceId": "ereader-6",
      "readerScale": 100,
      "contentWidth": 100,
      "contentHeight": 100,
      "frameColor": "#2a2a2a",
      "displayTheme": "light",
      "brightness": 100,
      "warmth": 0,
      "einkRenderMode": "monochrome",
      "colorSoftTone": "standard",
      "publisherFontSettings": true,
      "printColorMode": "color",
      "printPaginationMode": "fast",
      "printFacingPages": false,
      "deviceContentSettings": {},
      "deviceScale": 100,
      "autoDeviceScale": true,
      "customDeviceWidth": 390,
      "customDeviceHeight": 844,
      "mockupId": "plain",
      "importedMockupId": null,
      "mockupPostures": {},
      "mode": "paged",
      "orientation": "portrait"
    }
  },
  "mockups": []
}
```

The durable Preview fields follow the current `BookProjectPreviewState` configuration, except for the transient navigation fields listed below. Device-specific content settings and imported-mockup posture choices are durable.

## Included data

A v1 file contains:

- one project ID and name
- one folder source configuration
- book metadata
- book design configuration
- durable Preview and device configuration
- only imported HTML mockups referenced by that project

Mockups remain declarative, self-contained, sanitized HTML/CSS assets. They are size-limited and revalidated when a project file is opened.

## Excluded data

A portable project file never contains:

- manuscript text or source note contents
- the semantic runtime Book Model
- rendered HTML/XHTML
- Preview runtime errors or loading state
- plugin-global settings
- the whole internal project registry
- unrelated imported mockups
- transient Preview navigation: `pageIndex`, `activeSectionId`, and `scrollTop`

Transient navigation is reset to the beginning when a project is duplicated or imported.

## Validation and compatibility

Imported JSON is parsed as `unknown` and checked before it reaches the project store. Validation covers the discriminator, schema version, IDs, names, vault-relative folder path, metadata, design and Preview values, mockup structure, unsafe HTML, and file/field size limits.

Paths containing absolute prefixes, backslashes, empty segments, control characters, `.` segments, or `..` traversal are rejected. Unsupported future versions produce an actionable error instead of being reinterpreted.

If a project ID already exists, the user must explicitly choose to replace the existing configuration, import a copy with a new ID, or cancel. Import never silently overwrites a project. An imported mockup whose ID conflicts with different library content is assigned a collision-safe ID and the project references are remapped.

If the referenced manuscript folder is missing from the current vault, Book Designer keeps the imported configuration and shows a warning. No source notes are created, changed, or deleted.

## Book export is separate

Portable project-file export writes configuration only. EPUB, PDF, rendered HTML, and other publication exports remain separate future features and do not use the `.book-designer.json` action.
