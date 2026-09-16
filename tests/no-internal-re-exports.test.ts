import { Linter, RuleTester } from "eslint";
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { parser as typescriptParser } from "typescript-eslint";

import rule from "../src/rules/no-internal-re-exports.js";

const fixturesRoot = path.join(
  import.meta.dirname,
  "fixtures",
  "no-internal-re-exports",
);

function fixtureFile(...parts: string[]): string {
  return path.join(fixturesRoot, ...parts);
}

const ruleTester = new RuleTester({
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
  },
});

const reExportFrom = "export { x } from './m';";

ruleTester.run("no-internal-re-exports", rule, {
  valid: [
    "export const x = 1;",
    "export function foo() {}",
    "export default function foo() {}",
    "export default class Foo {}",
    "const x = 1;\nexport { x };",
    "import { x } from './m';\nconsole.log(x);",
    "import { x } from './m';\nexport const y = x;",
    "import { x } from './m';\nexport function wrap() {\n  return x;\n}",
    {
      code: "import { x } from './m';\nexport { x };\nconsole.log(x);",
    },
    {
      code: "import { a, b } from './m';\nexport { a };\nconsole.log(a, b);",
    },
    {
      code: "import { Foo } from './m';\nexport { Foo };\ntype X = Foo;",
    },
    {
      code: "import Foo from './m';\nexport default Foo;\nconst copy = Foo;",
    },
    {
      code: "export type { T } from './m';",
    },
    {
      code: "export { type T } from './m';",
    },
    {
      code: "export type * from './m';",
    },
    {
      code: "import type { T } from './m';\nexport type { T };",
    },
    {
      code: "import { type T } from './m';\nexport type { T };",
    },
    {
      code: "export { x } from './m';",
      options: [{ include: ["src/**"] }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("dist-src-mapping", "src", "internal.ts"),
      options: [{ exclude: ["**/internal.ts"] }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("dist-src-mapping", "src", "internal.ts"),
      options: [{ exclude: ["src/internal.ts"] }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("dist-src-mapping", "src", "index.ts"),
    },
    {
      code: reExportFrom,
      filename: fixtureFile("string-export", "src", "public.ts"),
    },
    {
      code: reExportFrom,
      filename: fixtureFile("subpath-exports", "src", "index.ts"),
    },
    {
      code: reExportFrom,
      filename: fixtureFile("subpath-exports", "src", "utils.ts"),
    },
    {
      code: reExportFrom,
      filename: fixtureFile("monorepo", "packages", "pkg-a", "src", "index.ts"),
    },
    {
      code: reExportFrom,
      filename: fixtureFile("dist-src-mapping", "src", "utils.ts"),
      options: [{ include: ["lib/**"] }],
    },
  ],
  invalid: [
    {
      code: "export { x } from './m';",
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: "export { x as y } from './m';",
      errors: [{ messageId: "reExport", data: { name: "y", source: "./m" } }],
    },
    {
      code: "export { default } from './m';",
      errors: [
        { messageId: "reExport", data: { name: "default", source: "./m" } },
      ],
    },
    {
      code: "export { default as Foo } from './m';",
      errors: [{ messageId: "reExport", data: { name: "Foo", source: "./m" } }],
    },
    {
      code: "export * from './m';",
      errors: [
        { messageId: "reExportAll", data: { name: "*", source: "./m" } },
      ],
    },
    {
      code: "export * as ns from './m';",
      errors: [
        {
          messageId: "reExportNamespace",
          data: { name: "ns", source: "./m" },
        },
      ],
    },
    {
      code: "export { foo, bar } from './m';",
      errors: [
        { messageId: "reExport", data: { name: "foo", source: "./m" } },
        { messageId: "reExport", data: { name: "bar", source: "./m" } },
      ],
    },
    {
      code: "export { foo, type T } from './m';",
      errors: [{ messageId: "reExport", data: { name: "foo", source: "./m" } }],
    },
    {
      code: "export { foo, type T } from './m';",
      options: [{ ignoreTypes: false }],
      errors: [
        { messageId: "reExport", data: { name: "foo", source: "./m" } },
        { messageId: "reExport", data: { name: "T", source: "./m" } },
      ],
    },
    {
      code: "import { a, b } from './m';\nexport { a };\nconsole.log(b);",
      errors: [{ messageId: "reExport", data: { name: "a", source: "./m" } }],
    },
    {
      code: "export type { T } from './m';",
      options: [{ ignoreTypes: false }],
      errors: [{ messageId: "reExport", data: { name: "T", source: "./m" } }],
    },
    {
      code: "export { type T } from './m';",
      options: [{ ignoreTypes: false }],
      errors: [{ messageId: "reExport", data: { name: "T", source: "./m" } }],
    },
    {
      code: "export type * from './m';",
      options: [{ ignoreTypes: false }],
      errors: [
        { messageId: "reExportAll", data: { name: "*", source: "./m" } },
      ],
    },
    {
      code: "import { x } from './m';\nexport { x };",
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: "import { x as y } from './m';\nexport { y };",
      errors: [{ messageId: "reExport", data: { name: "y", source: "./m" } }],
    },
    {
      code: "import { x as y } from './m';\nexport { y as z };",
      errors: [{ messageId: "reExport", data: { name: "z", source: "./m" } }],
    },
    {
      code: "import Foo from './m';\nexport { Foo };",
      errors: [{ messageId: "reExport", data: { name: "Foo", source: "./m" } }],
    },
    {
      code: "import Foo from './m';\nexport default Foo;",
      errors: [
        { messageId: "reExport", data: { name: "default", source: "./m" } },
      ],
    },
    {
      code: "import * as ns from './m';\nexport { ns };",
      errors: [{ messageId: "reExport", data: { name: "ns", source: "./m" } }],
    },
    {
      code: "import * as ns from './m';\nexport default ns;",
      errors: [
        { messageId: "reExport", data: { name: "default", source: "./m" } },
      ],
    },
    {
      code: "import { a, b } from './m';\nexport { a, b };\nconsole.log(a);",
      errors: [{ messageId: "reExport", data: { name: "b", source: "./m" } }],
    },
    {
      code: "import { x } from './m';\nexport { x };\nconsole.log(x);",
      options: [{ reportUsedLocals: true }],
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: "import type { T } from './m';\nexport type { T };",
      options: [{ ignoreTypes: false }],
      errors: [{ messageId: "reExport", data: { name: "T", source: "./m" } }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("dist-src-mapping", "src", "utils.ts"),
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("dist-src-mapping", "src", "index.ts"),
      options: [{ detectEntrypoints: false }],
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("string-export", "src", "other.ts"),
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("subpath-exports", "src", "internal.ts"),
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("monorepo", "packages", "pkg-a", "src", "util.ts"),
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("dist-src-mapping", "src", "utils.ts"),
      options: [{ include: ["src/**"] }],
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
    {
      code: reExportFrom,
      filename: fixtureFile("dist-src-mapping", "src", "utils.ts"),
      options: [{ include: ["**/utils.ts"] }],
      errors: [{ messageId: "reExport", data: { name: "x", source: "./m" } }],
    },
  ],
});

void test("no-internal-re-exports validates options", () => {
  const linter = new Linter();
  const plugin = {
    rules: {
      "no-internal-re-exports": rule,
    },
  };

  for (const options of [
    { ignoreTypes: "yes" },
    { reportUsedLocals: 1 },
    { detectEntrypoints: "true" },
    { include: [""] },
    { include: ["src/**", "src/**"] },
    { exclude: [1] },
    { unknown: true },
  ]) {
    assert.throws(() => {
      linter.verify("export { x } from './m';", [
        {
          plugins: {
            test: plugin,
          },
          languageOptions: {
            parser: typescriptParser,
            sourceType: "module",
          },
          rules: {
            "test/no-internal-re-exports": ["error", options],
          },
        },
      ]);
    });
  }
});
