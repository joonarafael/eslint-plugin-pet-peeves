import { Linter, RuleTester } from "eslint";
import assert from "node:assert/strict";
import test from "node:test";

import rule from "../src/rules/max-same-operator-operands.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("max-same-operator-operands", rule, {
  valid: [
    "a && b && c && d;",
    {
      code: "a && b && c || d && e || f;",
      options: [{ max: 3 }],
    },
    {
      code: "a && b || c && d;",
      options: [{ max: 2 }],
    },
    {
      code: "(a ?? b) || (c ?? d);",
      options: [{ max: 2 }],
    },
  ],
  invalid: [
    {
      code: "a && b && c;",
      options: [{ max: 2 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { operator: "&&", count: 3, max: 2 },
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 12,
        },
      ],
    },
    {
      code: "(a && b) && (c && d);",
      options: [{ max: 3 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { operator: "&&", count: 4, max: 3 },
        },
      ],
    },
    {
      code: "a && b && c || d && e || f;",
      options: [{ max: 2 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { operator: "||", count: 3, max: 2 },
        },
        {
          messageId: "tooManyOperands",
          data: { operator: "&&", count: 3, max: 2 },
        },
      ],
    },
    {
      code: "a ?? b ?? c;",
      options: [{ max: 2 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { operator: "??", count: 3, max: 2 },
        },
      ],
    },
    {
      code: "a || b;",
      options: [{ max: 0 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { operator: "||", count: 2, max: 0 },
        },
      ],
    },
  ],
});

test("max-same-operator-operands validates max", () => {
  for (const max of [-1, 1.5, 101]) {
    const linter = new Linter();

    assert.throws(() => {
      linter.verify("a || b;", [
        {
          plugins: {
            test: {
              rules: {
                "max-same-operator-operands": rule,
              },
            },
          },
          rules: {
            "test/max-same-operator-operands": ["error", { max }],
          },
        },
      ]);
    });
  }
});
