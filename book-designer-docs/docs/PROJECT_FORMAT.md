# Book Designer Project Format

## Purpose

A Book Designer project associates manuscript source files with design settings.

The manuscript remains ordinary Markdown in the vault.

The project format should store references and configuration, not duplicate the manuscript text.

---

## Example conceptual project

```json
{
  "version": 1,
  "id": "my-novel",
  "name": "My Novel",
  "source": {
    "type": "folder",
    "path": "Writing/My Novel"
  },
  "metadata": {
    "title": "My Novel",
    "author": "Author Name",
    "language": "en"
  },
  "design": {
    "themeId": "classic",
    "overrides": {
      "chapterHeadingStyle": "ornament",
      "firstParagraphStyle": "no-indent",
      "sceneBreakStyle": "fleuron"
    }
  },
  "previewDefaults": {
    "devicePreset": "ereader-6"
  }
}
```

Exact schema is not yet frozen.

---

## Versioning

Always include a project schema version.

```ts
interface BookDesignerProject {
  version: number;
}
```

When schema changes, migrate old versions explicitly.

Do not silently reinterpret old settings.

---

## Source configuration

Possible:

```ts
type ProjectSourceConfig =
  | FolderSourceConfig
  | ManualSourceConfig
  | LongformSourceConfig;
```

Example:

```ts
interface FolderSourceConfig {
  type: "folder";
  path: string;
}
```

---

## Design configuration

Separate:

- theme identity
- user overrides
- ebook settings
- print settings later

Do not store temporary preview state as publication settings.

---

## Persistence location

Initial implementation can use Obsidian plugin data storage.

Future project-file approaches may be considered if users need:

- portability between vaults
- Git-friendly project settings
- multiple editions of the same manuscript

Do not create new vault files unnecessarily in the first milestone.
