# Disallow internal re-exports (`no-internal-re-exports`)

Disallows re-exporting a declaration from another module, except at a public API boundary. If a consumer needs a name, it should import that name from the module that defines it.

The rule reports export-from forms and import-then-export forwarding:

```js
export { x } from "./m";
export * from "./m";
export * as ns from "./m";
export { default } from "./m";

import { x } from "./m";
export { x };
```

It does not rewrite consumers, and it does not provide an automatic fix.

## Why

A re-export hides where a name actually comes from. The reader who sees `import { useAuth } from "../hooks"` has to open `hooks/index.ts` (and maybe another barrel after that) before they reach `hooks/useAuth.ts`. The file that forwards the name is not the owner; it is an extra hop in the dependency graph.

That hop is useful at a package boundary, where `index.ts` is the public surface on purpose. Internally it is noise: internals start depending on a barrel instead of on the module that defines the binding, cycles get easier to introduce, and "where is this defined?" becomes a search through forwarding files.

## Options

The rule accepts an object with `ignoreTypes`, `reportUsedLocals`, `detectEntrypoints`, `include`, and `exclude`:

```js
{
  "pet-peeves/no-internal-re-exports": [
    "error",
    {
      ignoreTypes: true,
      reportUsedLocals: false,
      detectEntrypoints: true,
      include: [],
      exclude: ["src/shims/**"],
    },
  ],
}
```

`ignoreTypes` defaults to `true`. Type-only re-exports such as `export type { Props } from "./types"` and `import type { T } from "./m"; export type { T }` are allowed. `export * from "./m"` is still reported, because it forwards values as well as types. Set `ignoreTypes` to `false` to report type-only forwarding too.

`reportUsedLocals` defaults to `false`. Import-then-export is allowed when the imported binding is also used in the file, for example as an argument, in a local function, or in a newly declared export. Export-from forms have no local binding, so this option does not apply to them. Set `reportUsedLocals` to `true` to report a forwarded import even when the file also uses it.

`detectEntrypoints` defaults to `true`. The rule walks from the linted file to the nearest `package.json` and treats that package's declared entry files as public API. It reads `main`, `module`, `types`, `typings`, and `exports`. Compiled paths such as `dist/index.js` also match the corresponding source file (`src/index.ts`, `src/index.tsx`, and the same name at the package root). Subpath exports are public API as well. Set `detectEntrypoints` to `false` to ignore `package.json`.

`include` defaults to `[]`. When it is non-empty, the rule only runs on files that match at least one glob. Use this to limit checking to a subtree.

`exclude` defaults to `[]`. Matching files may re-export. Use this for extra public surfaces and temporary compatibility shims that `package.json` does not list.

Globs are matched against the absolute path, the path relative to ESLint's working directory, and the path relative to the nearest package root. `*` does not cross `/`. `**` matches across directories. `exclude` wins over `include`. Detected entrypoints are skipped even when they match `include`; turn `detectEntrypoints` off if you want those files checked.

With the default options, these examples are valid:

```ts
export function createClient() {}

import { formatDate } from "./dates";

export function formatTimestamp(value: Date) {
  return formatDate(value);
}

export type { Props } from "./types";
```

```ts
import { formatDate } from "./dates";

export { formatDate };

console.log(formatDate(new Date()));
```

These examples are invalid:

```ts
export { formatDate } from "./dates";
export * from "./dates";
export * as dates from "./dates";
export { default } from "./client";

import { formatDate } from "./dates";
export { formatDate };
```

With `{ ignoreTypes: false }`, this is also invalid:

```ts
export type { Props } from "./types";
```

With `{ reportUsedLocals: true }`, this is invalid even though `formatDate` is used locally:

```ts
import { formatDate } from "./dates";

export { formatDate };

console.log(formatDate(new Date()));
```

The rule reports each forwarded name (or the `export *` / `export * as` declaration) and does not provide an automatic fix.

## When not to use it

Leave the rule off in a codebase that wants internal barrels, or that treats `export { x } from "./x"` as the preferred style (including configs that enable `unicorn/prefer-export-from`).

Keep it on and use `exclude` or package `exports` when re-exports should exist only as the public API of a package.
