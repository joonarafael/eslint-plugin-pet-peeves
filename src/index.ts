import maxOperands from "./rules/max-operands.js";
import maxSameOperatorOperands from "./rules/max-same-operator-operands.js";
import paddingBetweenLargeJsxElements from "./rules/padding-between-large-jsx-elements.js";

export const rules = {
  "max-operands": maxOperands,
  "max-same-operator-operands": maxSameOperatorOperands,
  "padding-between-large-jsx-elements": paddingBetweenLargeJsxElements,
};

const plugin = {
  meta: {
    name: "eslint-plugin-pet-peeves",
    version: "0.1.0",
  },
  rules,
};

export default plugin;
