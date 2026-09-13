import type { Rule } from "eslint";

const DEFAULT_MIN_LINES = 8;

type Options = [
  {
    minLines: number;
    padAroundAnyLargeElement?: boolean;
  }?,
];

interface JSXChild {
  type: string;
  loc: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  range: [number, number];
  value?: string;
}

interface JSXContainer extends JSXChild {
  type: "JSXElement" | "JSXFragment";
  children: JSXChild[];
}

const optionSchema = [
  {
    type: "object",
    properties: {
      minLines: {
        type: "integer",
        minimum: 0,
        maximum: 999,
      },
      padAroundAnyLargeElement: {
        type: "boolean",
      },
    },
    required: ["minLines"],
    additionalProperties: false,
  },
] as const;

function isJSXElementOrFragment(child: JSXChild): child is JSXContainer {
  return child.type === "JSXElement" || child.type === "JSXFragment";
}

function isWhitespaceJSXText(child: JSXChild): boolean {
  return child.type === "JSXText" && /^\s*$/u.test(child.value ?? "");
}

function getLineCount(node: JSXChild): number {
  return node.loc.end.line - node.loc.start.line + 1;
}

const rule: Rule.RuleModule = {
  meta: {
    type: "layout",
    docs: {
      description: "Require a blank line between adjacent large JSX elements.",
      recommended: false,
      url: "https://github.com/joonarafael/eslint-plugin-pet-peeves/blob/master/docs/rules/padding-between-large-jsx-elements.md",
    },
    fixable: "whitespace",
    schema: optionSchema,
    messages: {
      missingPadding:
        "Add a blank line between adjacent JSX elements when each spans at least {{minLines}} lines.",
      missingPaddingEither:
        "Add a blank line between adjacent JSX elements when either one spans at least {{minLines}} lines.",
    },
  },

  create(context) {
    const options = context.options as Options;
    const minLines = options[0]?.minLines ?? DEFAULT_MIN_LINES;
    const padAroundAnyLargeElement =
      options[0]?.padAroundAnyLargeElement ?? false;

    if (minLines === 0) {
      return {};
    }

    const sourceCode = context.sourceCode;
    const linebreak = sourceCode.text.includes("\r\n") ? "\r\n" : "\n";

    return {
      "JSXElement, JSXFragment"(node: Rule.Node): void {
        const container = node as unknown as JSXContainer;
        let previousElement: JSXContainer | undefined;

        for (const child of container.children) {
          if (isWhitespaceJSXText(child)) {
            continue;
          }

          if (!isJSXElementOrFragment(child)) {
            previousElement = undefined;
            continue;
          }

          const precedingElement = previousElement;

          if (precedingElement !== undefined) {
            const precedingIsLarge = getLineCount(precedingElement) >= minLines;
            const childIsLarge = getLineCount(child) >= minLines;

            const requiresPadding = padAroundAnyLargeElement
              ? precedingIsLarge || childIsLarge
              : precedingIsLarge && childIsLarge;

            if (requiresPadding) {
              const lineDifference =
                child.loc.start.line - precedingElement.loc.end.line;

              if (lineDifference < 2) {
                context.report({
                  node: child,
                  messageId: padAroundAnyLargeElement
                    ? "missingPaddingEither"
                    : "missingPadding",
                  data: { minLines },
                  fix(fixer) {
                    return fixer.insertTextAfterRange(
                      precedingElement.range,
                      linebreak.repeat(2 - lineDifference),
                    );
                  },
                });
              }
            }
          }

          previousElement = child;
        }
      },
    };
  },
};

export default rule;
