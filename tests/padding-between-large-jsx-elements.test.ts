import { Linter, RuleTester } from "eslint";
import assert from "node:assert/strict";
import test from "node:test";

import rule from "../src/rules/padding-between-large-jsx-elements.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
    sourceType: "module",
  },
});

function jsxElement(name: string, lineCount: number): string {
  if (lineCount === 1) {
    return `<${name} />`;
  }

  const attributes = Array.from(
    { length: lineCount - 2 },
    (_, index) => `  prop${String(index + 1)}`,
  ).join("\n");

  return `<${name}\n${attributes}\n/>`;
}

function indent(value: string, spaces = 2): string {
  const padding = " ".repeat(spaces);

  return value
    .split("\n")
    .map((line) => `${padding}${line}`)
    .join("\n");
}

function siblings(first: string, separator: string, second: string): string {
  return `<>\n${indent(first)}${separator}${indent(second)}\n</>;`;
}

const sevenLineA = jsxElement("A", 7);
const sevenLineB = jsxElement("B", 7);
const eightLineA = jsxElement("A", 8);
const eightLineB = jsxElement("B", 8);
const oneLineA = jsxElement("A", 1);
const oneLineB = jsxElement("B", 1);

ruleTester.run("padding-between-large-jsx-elements", rule, {
  valid: [
    siblings(sevenLineA, "\n", sevenLineB),
    siblings(eightLineA, "\n\n", eightLineB),
    siblings(eightLineA, "\n", jsxElement("B", 7)),
    {
      code: siblings(eightLineA, "\n", eightLineB),
      options: [{ minLines: 0 }],
    },
    {
      code: siblings(eightLineA, "\n  text\n", eightLineB),
      options: [{ minLines: 8 }],
    },
    {
      code: `<>
  ${indent(eightLineA)}
  {/* The comment separates these children. */}
  ${indent(eightLineB)}
</>;`,
    },
    {
      code: `<>
  {first && (
${indent(eightLineA, 4)}
  )}
  {second && (
${indent(eightLineB, 4)}
  )}
</>;`,
    },
    // padAroundAnyLargeElement defaults to false: one large sibling next to
    // a small one still doesn't require padding (regression for the
    // pre-existing "both must qualify" behavior).
    {
      code: siblings(eightLineA, "\n", oneLineB),
      options: [{ minLines: 8 }],
    },
    {
      code: siblings(eightLineA, "\n", oneLineB),
      options: [{ minLines: 8, padAroundAnyLargeElement: false }],
    },
    // padAroundAnyLargeElement: true still allows two small siblings to sit
    // together, since neither one meets the threshold.
    {
      code: siblings(sevenLineA, "\n", sevenLineB),
      options: [{ minLines: 8, padAroundAnyLargeElement: true }],
    },
    // padAroundAnyLargeElement: true is satisfied by an existing blank line
    // even when only one side is large.
    {
      code: siblings(eightLineA, "\n\n", oneLineB),
      options: [{ minLines: 8, padAroundAnyLargeElement: true }],
    },
    {
      code: siblings(oneLineA, "\n\n", eightLineB),
      options: [{ minLines: 8, padAroundAnyLargeElement: true }],
    },
  ],
  invalid: [
    {
      code: siblings(eightLineA, "\n", eightLineB),
      output: siblings(eightLineA, "\n\n", eightLineB),
      errors: [
        {
          messageId: "missingPadding",
          data: { minLines: 8 },
        },
      ],
    },
    {
      code: siblings(jsxElement("A", 1), "\n", jsxElement("B", 1)),
      output: siblings(jsxElement("A", 1), "\n\n", jsxElement("B", 1)),
      options: [{ minLines: 1 }],
      errors: [{ messageId: "missingPadding" }],
    },
    {
      code: siblings(jsxElement("A", 1), "", jsxElement("B", 1)),
      output: siblings(jsxElement("A", 1), "\n\n", jsxElement("B", 1)),
      options: [{ minLines: 1 }],
      errors: [{ messageId: "missingPadding" }],
    },
    {
      code: `<>
  <>
    <A />
  </>
  <>
    <B />
  </>
</>;`,
      output: `<>
  <>
    <A />
  </>

  <>
    <B />
  </>
</>;`,
      options: [{ minLines: 3 }],
      errors: [{ messageId: "missingPadding" }],
    },
    {
      code: siblings(eightLineA, "\n", eightLineB).replaceAll("\n", "\r\n"),
      output: siblings(eightLineA, "\n\n", eightLineB).replaceAll("\n", "\r\n"),
      errors: [{ messageId: "missingPadding" }],
    },
    // padAroundAnyLargeElement: true pads when only the preceding element
    // is large, even though the following element is a single line.
    {
      code: siblings(eightLineA, "\n", oneLineB),
      output: siblings(eightLineA, "\n\n", oneLineB),
      options: [{ minLines: 8, padAroundAnyLargeElement: true }],
      errors: [
        {
          messageId: "missingPaddingEither",
          data: { minLines: 8 },
        },
      ],
    },
    // ...and when only the following element is large.
    {
      code: siblings(oneLineA, "\n", eightLineB),
      output: siblings(oneLineA, "\n\n", eightLineB),
      options: [{ minLines: 8, padAroundAnyLargeElement: true }],
      errors: [
        {
          messageId: "missingPaddingEither",
          data: { minLines: 8 },
        },
      ],
    },
    // Still reports (with the "both" message) when both sides are large
    // and padAroundAnyLargeElement is explicitly disabled.
    {
      code: siblings(eightLineA, "\n", eightLineB),
      output: siblings(eightLineA, "\n\n", eightLineB),
      options: [{ minLines: 8, padAroundAnyLargeElement: false }],
      errors: [
        {
          messageId: "missingPadding",
          data: { minLines: 8 },
        },
      ],
    },
  ],
});

void test("padding-between-large-jsx-elements validates minLines", () => {
  for (const minLines of [-1, 1.5, 1000, "8"]) {
    const linter = new Linter();

    assert.throws(() => {
      linter.verify("<><A /><B /></>;", [
        {
          languageOptions: {
            parserOptions: {
              ecmaFeatures: { jsx: true },
            },
          },
          plugins: {
            test: {
              rules: {
                "padding-between-large-jsx-elements": rule,
              },
            },
          },
          rules: {
            "test/padding-between-large-jsx-elements": ["error", { minLines }],
          },
        },
      ]);
    });
  }
});

void test("padding-between-large-jsx-elements validates padAroundAnyLargeElement", () => {
  for (const padAroundAnyLargeElement of ["true", 1, null]) {
    const linter = new Linter();

    assert.throws(() => {
      linter.verify("<><A /><B /></>;", [
        {
          languageOptions: {
            parserOptions: {
              ecmaFeatures: { jsx: true },
            },
          },
          plugins: {
            test: {
              rules: {
                "padding-between-large-jsx-elements": rule,
              },
            },
          },
          rules: {
            "test/padding-between-large-jsx-elements": [
              "error",
              { minLines: 8, padAroundAnyLargeElement },
            ],
          },
        },
      ]);
    });
  }
});
