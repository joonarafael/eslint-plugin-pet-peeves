# Limit components per directory (`max-components-per-directory`)

Limits how many distinct component names a single directory may contain. The rule looks only at filenames of sibling `.jsx` and `.tsx` files. It does not read file contents and does not recurse into subdirectories.

Related files that share a base name count as one component. A directory with `Header.tsx`, `Clock.tsx`, and `UserProfile.tsx` has three components. A directory with `component.tsx`, `component.stories.tsx`, and `component.styles.tsx` has one.

## Why

A flat directory of unrelated component files turns every open into a scrolling list of names. Nothing in the folder structure says which files belong together, so the reader has to infer grouping from naming alone:

```text
components/
  Header.tsx
  Clock.tsx
  UserProfile.tsx
  Header.stories.tsx
```

Moving each component into its own subdirectory makes the boundary obvious and keeps companions next to the file they support:

```text
components/
  Header/
    Header.tsx
    Header.stories.tsx
  Clock/
    Clock.tsx
  UserProfile/
    UserProfile.tsx
```

## Options

The rule accepts an object with optional `max`, `extensions`, `companions`, `ignoreBasenames`, and `ignoreDirectories`:

```js
{
  "pet-peeves/max-components-per-directory": [
    "error",
    {
      max: 1,
      ignoreDirectories: ["**/icons", "**/generated/**"],
    },
  ],
}
```

`max` must be an integer from `1` through `64`. It defaults to `1` when omitted.

`extensions` defaults to `[".jsx", ".tsx"]`. Passing this array **replaces** the default; it does not append. Each entry must look like `.tsx`.

`companions` defaults to:

```js
["stories", "story", "styles", "style", "test", "spec", "types", "type"];
```

Companion tokens are matched case-insensitively and only as a dotted tail of a longer name. Files whose entire name reduces to companions alone are not counted (for example `Header.test.tsx` when `test` is a companion). A file named `styles.tsx` is still a component named `styles`, because companion stripping requires more than one dot segment before any stripping happens.

Passing `companions` **replaces** the default list. To treat `Modal.header.tsx` and `Modal.footer.tsx` as part of `Modal`, include `header` and `footer` in your list along with the defaults you still want.

`ignoreBasenames` defaults to:

```js
[
  "index",
  "page",
  "layout",
  "loading",
  "error",
  "not-found",
  "template",
  "default",
  "route",
];
```

Matching is case-sensitive. `error.tsx` is ignored; `Error.tsx` counts as a component named `Error`.

`ignoreDirectories` defaults to `[]`. Globs are matched against the directory that contains the linted file (absolute path and path relative to ESLint's working directory). `**/icons` ignores only directories named `icons`. `**/generated/**` ignores `generated/widgets` and any other directory under `generated`.

With `{ max: 1 }`, these layouts are valid:

```text
Button/
  Button.tsx
  Button.stories.tsx
```

```text
app/dashboard/
  page.tsx
  layout.tsx
  Error.tsx
```

(`page`, `layout`, and lowercase `error` basenames are ignored by default.)

These layouts are invalid:

```text
components/
  Header.tsx
  Clock.tsx
```

```text
components/
  Modal.tsx
  Modal.header.tsx
  Modal.footer.tsx
```

(with default `companions`; add `header` and `footer` to `companions` if that pattern should count as one component.)

Component names stay case-sensitive. `Header.tsx` and `header.tsx` are two components in the same directory.

The rule reports on every watched file in an offending directory, including companion files, so opening a stories file still shows the directory error. It does not provide an automatic fix.

Each lint pass reads the directory listing when a watched file is checked. A file that ESLint serves from cache may not see a newly added sibling until that file is linted again; the new file is reported on its own run.

## Keeping related pieces together

Use a subdirectory when a component has several top-level files:

```text
Card/
  Card.tsx
  Card.stories.tsx
```

Or, if you prefer a flat folder, add dotted tails to `companions`:

```text
Modal.tsx
Modal.header.tsx
Modal.footer.tsx
```

with `companions` including `header` and `footer` alongside the usual story and test suffixes.

## When not to use it

Turn the rule off, or add `ignoreDirectories`, for trees that are meant to stay flat: icon sets with one file per glyph, generated component folders, or legacy areas you are not reorganizing yet.
