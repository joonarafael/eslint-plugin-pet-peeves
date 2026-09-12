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
