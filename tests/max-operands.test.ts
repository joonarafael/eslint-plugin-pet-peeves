import { Linter, RuleTester } from "eslint";
import assert from "node:assert/strict";
import test from "node:test";

import rule from "../src/rules/max-operands.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("max-operands", rule, {
  valid: [
    "a && b && c && d;",
    {
      code: "a && b && c || d && e || f;",
      options: [{ max: 6 }],
    },
    {
      code: "(a && b) || (c ?? d);",
      options: [{ max: 4 }],
    },
    {
      code: "a && call(b || c);",
      options: [{ max: 2 }],
    },
    {
      code: "a && b && c && d && e;",
      options: [{ max: 0 }],
    },
    {
      code: "a && b && c && d && e;",
      options: [{ max: 1 }],
    },
    {
      code: "a || b || c || d || e;",
      options: [{ max: 2, ignore: ["||"] }],
    },
    {
      code: "a && b && c || d && e || f;",
      options: [{ max: 3, ignore: ["||"] }],
    },
    {
      code: "a && b && c && d && e;",
      options: [{ max: 2, ignore: ["&&", "||", "??"] }],
    },
  ],
  invalid: [
    {
      code: "a && b && c;",
      options: [{ max: 2 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { count: 3, max: 2 },
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 12,
        },
      ],
    },
    {
      code: "const result = a && b && c || d && e || f;",
      options: [{ max: 4 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { count: 6, max: 4 },
        },
      ],
    },
    {
      code: "(a && b) || (c ?? d);",
      options: [{ max: 3 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { count: 4, max: 3 },
        },
      ],
    },
    {
      code: "a ?? b ?? c;",
      options: [{ max: 2 }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { count: 3, max: 2 },
        },
      ],
    },
    {
      code: "a && b && c && d && e;",
      options: [{ max: 4, ignore: ["||"] }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { count: 5, max: 4 },
        },
      ],
    },
    {
      code: "(a && b && c && d && e) || f;",
      options: [{ max: 4, ignore: ["||"] }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { count: 5, max: 4 },
        },
      ],
    },
    {
      code: "a || b || c || d || e;",
      options: [{ max: 2, ignore: [] }],
      errors: [
        {
          messageId: "tooManyOperands",
          data: { count: 5, max: 2 },
        },
      ],
    },
  ],
});

void test("max-operands validates max", () => {
  for (const max of [-1, 1.5, 33]) {
    const linter = new Linter();

    assert.throws(() => {
      linter.verify("a && b;", [
        {
          plugins: {
            test: {
              rules: {
                "max-operands": rule,
              },
            },
          },
          rules: {
            "test/max-operands": ["error", { max }],
          },
        },
      ]);
    });
  }
});

void test("max-operands validates ignore", () => {
  for (const ignore of [["+"], ["||", "||"], "||"]) {
    const linter = new Linter();

    assert.throws(() => {
      linter.verify("a && b;", [
        {
          plugins: {
            test: {
              rules: {
                "max-operands": rule,
              },
            },
          },
          rules: {
            "test/max-operands": ["error", { max: 4, ignore }],
          },
        },
      ]);
    });
  }
});
