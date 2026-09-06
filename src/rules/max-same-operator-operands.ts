import type { Rule } from "eslint";

import {
  getMax,
  isLogicalExpression,
  maxOptionSchema,
  type LogicalExpression,
  type Options,
} from "./shared.js";

function countSameOperatorOperands(
  node: Rule.Node,
  operator: LogicalExpression["operator"],
): number {
  if (!isLogicalExpression(node) || node.operator !== operator) {
    return 1;
  }

  return (
    countSameOperatorOperands(node.left, operator) +
    countSameOperatorOperands(node.right, operator)
  );
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Limit the number of operands in a same-operator logical chain.",
      recommended: false,
      url: "https://github.com/joonarafael/eslint-plugin-pet-peeves/blob/master/docs/rules/max-same-operator-operands.md",
    },
    schema: maxOptionSchema,
    messages: {
      tooManyOperands:
        "This '{{operator}}' chain has {{count}} operands. The maximum allowed is {{max}}.",
    },
  },

  create(context) {
    const max = getMax(context.options as Options);

    return {
      LogicalExpression(node) {
        const expression = node as LogicalExpression;
        const parent = expression.parent;

        if (
          isLogicalExpression(parent) &&
          parent.operator === expression.operator
        ) {
          return;
        }

        const count = countSameOperatorOperands(
          expression,
          expression.operator,
        );

        if (count > max) {
          context.report({
            node: expression,
            messageId: "tooManyOperands",
            data: { count, max, operator: expression.operator },
          });
        }
      },
    };
  },
};

export default rule;
