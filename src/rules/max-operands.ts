import type { Rule } from "eslint";

import {
  getMax,
  isLogicalExpression,
  maxOptionSchema,
  type Options,
} from "./shared.js";

function countOperands(node: Rule.Node): number {
  if (!isLogicalExpression(node)) {
    return 1;
  }

  return countOperands(node.left) + countOperands(node.right);
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
        "This logical expression has {{count}} operands. The maximum allowed is {{max}}.",
    },
  },

  create(context) {
    const max = getMax(context.options as Options);

    return {
      LogicalExpression(node) {
        if (isLogicalExpression(node.parent)) {
          return;
        }

        const count = countOperands(node);

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
