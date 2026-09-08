import type { Rule } from "eslint";

import {
  getIgnore,
  getMax,
  isDisabledMax,
  isLogicalExpression,
  maxOptionSchema,
  type LogicalOperator,
  type Options,
} from "./shared.js";

function countOperands(
  node: Rule.Node,
  ignore: ReadonlySet<LogicalOperator>,
): number {
  if (!isLogicalExpression(node) || ignore.has(node.operator)) {
    return 1;
  }

  return countOperands(node.left, ignore) + countOperands(node.right, ignore);
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Limit the total number of operands in a logical expression.",
      recommended: false,
      url: "https://github.com/joonarafael/eslint-plugin-pet-peeves/blob/master/docs/rules/max-operands.md",
    },
    schema: maxOptionSchema,
    messages: {
      tooManyOperands:
        "This logical expression has {{count}} operands. The maximum allowed is {{max}}. Extract parts into named variables or helper functions.",
    },
  },

  create(context) {
    const options = context.options as Options;
    const max = getMax(options);
    const ignore = getIgnore(options);

    if (isDisabledMax(max)) {
      return {};
    }

    return {
      LogicalExpression(node): void {
        if (!isLogicalExpression(node) || ignore.has(node.operator)) {
          return;
        }

        if (
          isLogicalExpression(node.parent) &&
          !ignore.has(node.parent.operator)
        ) {
          return;
        }

        const count = countOperands(node, ignore);

        if (count > max) {
          context.report({
            node,
            messageId: "tooManyOperands",
            data: { count, max },
          });
        }
      },
    };
  },
};

export default rule;
