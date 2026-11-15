import { Linter, RuleTester } from "eslint";
import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";

import rule from "../src/rules/max-components-per-directory.js";

const fixturesRoot = path.join(
  import.meta.dirname,
  "fixtures",
  "max-components-per-directory",
);

const code = "export {};";

function fixtureFile(...parts: string[]): string {
  return path.join(fixturesRoot, ...parts);
}

function displayDirectoryFromFixture(...parts: string[]): string {
  const directory = path.dirname(fixtureFile(...parts));
  const cwd = process.cwd();
  const relative = path.relative(cwd, directory).replaceAll("\\", "/");

  if (relative === "" || relative === ".") {
    return ".";
  }

  if (relative.startsWith("../")) {
    return directory.replaceAll("\\", "/");
  }

  return relative;
}

const flatThreeData = {
  directory: displayDirectoryFromFixture("flat-three", "Header.tsx"),
  count: "3",
  names: "Clock, Header, UserProfile",
  max: "1",
};

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

ruleTester.run("max-components-per-directory", rule, {
  valid: [
    {
      code,
    },
    {
      code,
      filename: fixtureFile("one-component", "component.tsx"),
    },
    {
      code,
      filename: fixtureFile("one-component", "component.stories.tsx"),
    },
    {
      code,
      filename: fixtureFile("nested", "Header", "Header.tsx"),
    },
    {
      code,
      filename: fixtureFile("nested", "Clock", "Clock.tsx"),
    },
    {
      code,
      filename: fixtureFile("nested", "Overview.tsx"),
    },
    {
      code,
      filename: fixtureFile("with-index", "Button.tsx"),
    },
    {
      code,
      filename: fixtureFile("with-index", "index.tsx"),
    },
    {
      code,
      filename: fixtureFile("next-route", "page.tsx"),
    },
    {
      code,
      filename: fixtureFile("next-route", "Error.tsx"),
    },
    {
      code,
      filename: fixtureFile("case-stories", "Header.tsx"),
    },
    {
      code,
      filename: fixtureFile("case-stories", "header.stories.tsx"),
    },
    {
      code,
      filename: fixtureFile("companions-only", "Header.test.tsx"),
    },
    {
      code,
      filename: fixtureFile("flat-three", "Header.tsx"),
      options: [{ max: 3 }],
    },
    {
      code,
      filename: fixtureFile("flat-three", "notes.ts"),
    },
    {
      code,
      filename: fixtureFile("icons", "Arrow.tsx"),
      options: [{ ignoreDirectories: ["**/icons"] }],
    },
    {
      code,
      filename: fixtureFile("generated", "widgets", "A.tsx"),
      options: [{ ignoreDirectories: ["**/generated/**"] }],
    },
    {
      code,
      filename: fixtureFile("generated", "widgets", "A.tsx"),
      options: [{ ignoreDirectories: ["**/widgets"] }],
    },
    {
      code,
      filename: fixtureFile("dotted-part", "Modal.tsx"),
      options: [
        {
          companions: [
            "stories",
            "story",
            "styles",
            "style",
            "test",
            "spec",
            "types",
            "type",
            "header",
            "footer",
          ],
        },
      ],
    },
    {
      code,
      filename: fixtureFile("does-not-exist", "Missing.tsx"),
    },
  ],
  invalid: [
    {
      code,
      filename: fixtureFile("flat-three", "Header.tsx"),
      errors: [
        {
          messageId: "tooManyComponents",
          data: flatThreeData,
        },
      ],
    },
    {
      code,
      filename: fixtureFile("flat-three", "Clock.tsx"),
      errors: [
        {
          messageId: "tooManyComponents",
          data: flatThreeData,
        },
      ],
    },
    {
      code,
      filename: fixtureFile("flat-three", "Header.stories.tsx"),
      errors: [
        {
          messageId: "tooManyComponents",
          data: flatThreeData,
        },
      ],
    },
    {
      code,
      filename: fixtureFile("flat-three", "Header.tsx"),
      options: [{ max: 2 }],
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            ...flatThreeData,
            max: "2",
          },
        },
      ],
    },
    {
      code,
      filename: fixtureFile("dotted-part", "Modal.tsx"),
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            directory: displayDirectoryFromFixture("dotted-part", "Modal.tsx"),
            count: "3",
            names: "Modal, Modal.footer, Modal.header",
            max: "1",
          },
        },
      ],
    },
    {
      code,
      filename: fixtureFile("bare-styles", "Button.tsx"),
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            directory: displayDirectoryFromFixture("bare-styles", "Button.tsx"),
            count: "2",
            names: "Button, styles",
            max: "1",
          },
        },
      ],
    },
    {
      code,
      filename: fixtureFile("case-pair", "Header.tsx"),
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            directory: displayDirectoryFromFixture("case-pair", "Header.tsx"),
            count: "2",
            names: "header, Header",
            max: "1",
          },
        },
      ],
    },
    {
      code,
      filename: fixtureFile("next-route", "Error.tsx"),
      options: [{ ignoreBasenames: [] }],
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            directory: displayDirectoryFromFixture("next-route", "Error.tsx"),
            count: "5",
            names: "error, Error, layout, loading, page",
            max: "1",
          },
        },
      ],
    },
    {
      code,
      filename: fixtureFile("icons", "Arrow.tsx"),
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            directory: displayDirectoryFromFixture("icons", "Arrow.tsx"),
            count: "2",
            names: "Arrow, Close",
            max: "1",
          },
        },
      ],
    },
    {
      code,
      filename: fixtureFile("unknown-tail", "component.tsx"),
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            directory: displayDirectoryFromFixture(
              "unknown-tail",
              "component.tsx",
            ),
            count: "2",
            names: "component, component.stories.extra",
            max: "1",
          },
        },
      ],
    },
    {
      code,
      filename: fixtureFile("generated", "widgets", "A.tsx"),
      options: [{ ignoreDirectories: ["**/generated"] }],
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            directory: displayDirectoryFromFixture(
              "generated",
              "widgets",
              "A.tsx",
            ),
            count: "2",
            names: "A, B",
            max: "1",
          },
        },
      ],
    },
    {
      code,
      filename: fixtureFile("one-component", "component.tsx"),
      options: [{ companions: [] }],
      errors: [
        {
          messageId: "tooManyComponents",
          data: {
            directory: displayDirectoryFromFixture(
              "one-component",
              "component.tsx",
            ),
            count: "4",
            names:
              "component, component.stories, component.styles, component.test.stories",
            max: "1",
          },
        },
      ],
    },
  ],
});

void test("max-components-per-directory validates options", () => {
  const linter = new Linter();
  const plugin = {
    rules: {
      "max-components-per-directory": rule,
    },
  };

  for (const options of [
    { max: 0 },
    { max: 1.5 },
    { max: 65 },
    { max: -1 },
    { extensions: ["tsx"] },
    { extensions: [".tsx", ".tsx"] },
    { extensions: [""] },
    { companions: ["a.b"] },
    { companions: ["", "test"] },
    { companions: ["test", "test"] },
    { ignoreBasenames: ["", "index"] },
    { ignoreDirectories: [""] },
    { unknown: true },
  ]) {
    assert.throws(() => {
      linter.verify(code, [
        {
          plugins: {
            test: plugin,
          },
          rules: {
            "test/max-components-per-directory": ["error", options],
          },
        },
      ]);
    });
  }
});
