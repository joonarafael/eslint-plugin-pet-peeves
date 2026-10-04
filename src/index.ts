import maxOperands from "./rules/max-operands.js";
import maxSameOperatorOperands from "./rules/max-same-operator-operands.js";
import noInternalReExports from "./rules/no-internal-re-exports.js";
import noOrphanTailwindGroupPeer from "./rules/no-orphan-tailwind-group-peer.js";
import noUnnamedTailwindGroupPeer from "./rules/no-unnamed-tailwind-group-peer.js";
import paddingBetweenLargeJsxElements from "./rules/padding-between-large-jsx-elements.js";

export const rules = {
  "max-operands": maxOperands,
  "max-same-operator-operands": maxSameOperatorOperands,
  "no-internal-re-exports": noInternalReExports,
  "no-orphan-tailwind-group-peer": noOrphanTailwindGroupPeer,
  "no-unnamed-tailwind-group-peer": noUnnamedTailwindGroupPeer,
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
