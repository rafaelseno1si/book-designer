# Longform Integration

## Principle

Longform is an optional manuscript source adapter.

Book Designer must not require Longform.

---

## Why integrate

Longform already solves useful authoring concerns such as:

- long-form projects
- ordered scenes
- nested manuscript structure
- writing workflow
- compilation concepts

Book Designer should complement this rather than reproduce it.

---

## Desired relationship

```text
Longform
  ↓
manuscript organization
  ↓
LongformSourceAdapter
  ↓
Book Model
  ↓
Book Designer preview/themes/export
```

---

## Non-Longform workflow

A user should also be able to do:

```text
Novel/
  01 - Chapter One.md
  02 - Chapter Two.md
  03 - Chapter Three.md
```

and use:

```text
FolderSourceAdapter
```

Therefore all source-specific logic belongs behind source adapters.

---

## Adapter interface

Example:

```ts
interface ManuscriptSourceAdapter {
  id: string;
  label: string;

  isAvailable(): boolean | Promise<boolean>;

  load(config: unknown): Promise<ManuscriptSource>;
}
```

Longform adapter output must look equivalent to folder/manual source output after normalization.

---

## Integration strategy

Do not tightly couple to Longform internals before inspecting its current public/stable data structures.

When implementing:

1. inspect how Longform persists project metadata
2. determine the safest supported reading path
3. avoid modifying Longform data
4. treat unsupported structures as diagnostics
5. include a fallback/manual import path

---

## Mapping concepts

Possible mapping:

```text
Longform project     → Book
Longform scene       → source document or section fragment
Longform folder      → part/group
ordered scenes       → spine order
scene title          → optional heading metadata
```

Do not assume every Longform scene equals a chapter.

A project may use multiple scene notes per chapter.

The adapter may need compilation/grouping logic.

---

## Scope

Initial Longform integration can be minimal:

- detect projects
- let user select one
- retrieve ordered source files
- build manuscript
- refresh when files change

Advanced Longform compilation transformations can wait.

---

## Failure handling

If Longform is:

- not installed
- disabled
- version incompatible
- project malformed

Book Designer should continue working with other source methods.

Never make the whole plugin fail because the optional integration is unavailable.
