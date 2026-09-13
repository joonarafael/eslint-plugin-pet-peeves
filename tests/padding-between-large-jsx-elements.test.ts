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

// A non-JSX expression container spanning `lineCount` lines, e.g. a
// multiline function call. Used to exercise `expressionContainers: "all"`,
// which pads around expression containers regardless of what they contain.
function expressionContainer(callee: string, lineCount: number): string {
  if (lineCount === 1) {
    return `{${callee}()}`;
  }

  const args = Array.from(
    { length: lineCount - 2 },
    (_, index) => `  arg${String(index + 1)},`,
  ).join("\n");

  return `{${callee}(\n${args}\n)}`;
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
    // Regression: `expressionContainers` defaults to "none", so the
    // pre-existing exclusion behavior above is unaffected when the option
    // is passed explicitly too. Existing consumers who upgrade without
    // touching their config keep today's behavior.
    {
      code: `<>
  {first && (
${indent(eightLineA, 4)}
  )}
  {second && (
${indent(eightLineB, 4)}
  )}
</>;`,
      options: [{ minLines: 8, expressionContainers: "none" }],
    },
    // Regression: the comment-breaks-adjacency case also still holds with
    // "none" passed explicitly, including alongside padAroundAnyLargeElement.
    {
      code: `<>
  ${indent(eightLineA)}
  {/* The comment separates these children. */}
  ${indent(eightLineB)}
</>;`,
      options: [
        {
          minLines: 8,
          expressionContainers: "none",
          padAroundAnyLargeElement: true,
        },
      ],
    },
    // expressionContainers: "jsxOnly" still ignores expression containers
    // that don't render JSX, so a plain expression continues to break
    // adjacency between two large elements.
    {
      code: `<>
  ${indent(eightLineA)}
  {value}
  ${indent(eightLineB)}
</>;`,
      options: [{ minLines: 8, expressionContainers: "jsxOnly" }],
    },
    // expressionContainers: "all" only pads when both neighbors meet
    // minLines; a short arbitrary expression next to a large element isn't
    // enough on its own (padAroundAnyLargeElement defaults to false).
    {
      code: `<>
  ${indent(eightLineA)}
  {value}
  ${indent(eightLineB)}
</>;`,
      options: [{ minLines: 8, expressionContainers: "all" }],
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
    // expressionContainers: "jsxOnly" treats `cond && <Element />}` as a
    // paddable sibling, using the whole container's line span. This is the
    // same source that stays valid by default (see the valid case above).
    {
      code: `<>
  {first && (
${indent(eightLineA, 4)}
  )}
  {second && (
${indent(eightLineB, 4)}
  )}
</>;`,
      output: `<>
  {first && (
${indent(eightLineA, 4)}
  )}

  {second && (
${indent(eightLineB, 4)}
  )}
</>;`,
      options: [{ minLines: 8, expressionContainers: "jsxOnly" }],
      errors: [
        {
          messageId: "missingPadding",
          data: { minLines: 8 },
        },
      ],
    },
    // expressionContainers: "jsxOnly" also recognizes ternaries that render
    // JSX in either branch.
    {
      code: `<>
  {first ? (
${indent(eightLineA, 4)}
  ) : null}
  {second ? (
${indent(eightLineB, 4)}
  ) : null}
</>;`,
      output: `<>
  {first ? (
${indent(eightLineA, 4)}
  ) : null}

  {second ? (
${indent(eightLineB, 4)}
  ) : null}
</>;`,
      options: [{ minLines: 8, expressionContainers: "jsxOnly" }],
      errors: [
        {
          messageId: "missingPadding",
          data: { minLines: 8 },
        },
      ],
    },
    // expressionContainers: "jsxOnly" also recognizes a directly wrapped
    // element (`{<Element />}`), and compares it against a plain sibling.
    {
      code: siblings(`{${eightLineA}}`, "\n", eightLineB),
      output: siblings(`{${eightLineA}}`, "\n\n", eightLineB),
      options: [{ minLines: 8, expressionContainers: "jsxOnly" }],
      errors: [
        {
          messageId: "missingPadding",
          data: { minLines: 8 },
        },
      ],
    },
    // expressionContainers: "all" pads around any large expression
    // container, even when it doesn't render JSX at all.
    {
      code: siblings(
        expressionContainer("doSomething", 8),
        "\n",
        expressionContainer("doSomethingElse", 8),
      ),
      output: siblings(
        expressionContainer("doSomething", 8),
        "\n\n",
        expressionContainer("doSomethingElse", 8),
      ),
      options: [{ minLines: 8, expressionContainers: "all" }],
      errors: [
        {
          messageId: "missingPadding",
          data: { minLines: 8 },
        },
      ],
    },
    // expressionContainers: "all" combined with padAroundAnyLargeElement:
    // true even pads before a comment (a JSXExpressionContainer wrapping a
    // JSXEmptyExpression), which is left alone under every other
    // configuration.
    {
      code: `<>
  ${indent(eightLineA)}
  {/* comment */}
</>;`,
      output: `<>
  ${indent(eightLineA)}

  {/* comment */}
</>;`,
      options: [
        {
          minLines: 8,
          expressionContainers: "all",
          padAroundAnyLargeElement: true,
        },
      ],
      errors: [
        {
          messageId: "missingPaddingEither",
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

void test("padding-between-large-jsx-elements validates expressionContainers", () => {
  for (const expressionContainers of ["sometimes", "jsxonly", true, 1, null]) {
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
              { minLines: 8, expressionContainers },
            ],
          },
        },
      ]);
    });
  }
});

// Regression: `expressionContainers` must default to "none". A consumer who
// upgrades without touching their config must see zero behavior change,
// even for a snippet that *would* be reported under "jsxOnly" or "all".
void test("padding-between-large-jsx-elements defaults expressionContainers to none", () => {
  const linter = new Linter();

  const code = `<>
  {first && (
    <A
      prop1
      prop2
      prop3
      prop4
      prop5
      prop6
    />
  )}
  {second && (
    <B
      prop1
      prop2
      prop3
      prop4
      prop5
      prop6
    />
  )}
</>;`;

  function verify(
    expressionContainers?: "all" | "jsxOnly" | "none",
  ): Linter.LintMessage[] {
    return linter.verify(code, [
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
            { minLines: 8, expressionContainers },
          ],
        },
      },
    ]);
  }

  assert.deepEqual(verify(undefined), []);
  assert.deepEqual(verify("none"), []);

  // Sanity check: the same snippet *is* reported once opted in, so the
  // assertions above are actually exercising the exclusion, not something
  // else (e.g. a parse failure silently producing no messages).
  assert.equal(verify("jsxOnly").length, 1);
  assert.equal(verify("all").length, 1);
});
