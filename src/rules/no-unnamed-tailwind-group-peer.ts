import type { Rule } from "eslint";

import {
  extractClassStringsFromJsxOpening,
  getGroupPeerRuleConfig,
  groupPeerOptionSchema,
  parseClassString,
  type GroupPeerRuleOptions,
  type JSXOpeningElementLike,
} from "./tailwind-group-peer.js";

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require named Tailwind group and peer markers and variants (group/name, group-hover/name).",
      recommended: false,
      url: "https://github.com/joonarafael/eslint-plugin-pet-peeves/blob/master/docs/rules/no-unnamed-tailwind-group-peer.md",
    },
    schema: groupPeerOptionSchema,
    messages: {
      unnamedMarker:
        "Use a named Tailwind {{kind}} marker (for example `{{kind}}/name`) instead of unnamed `{{kind}}`.",
      unnamedConsumer:
        "Use a named Tailwind {{kind}} variant (for example `{{kind}}-hover/name`) instead of unnamed `{{token}}`.",
    },
  },

  create(context) {
    const config = getGroupPeerRuleConfig(
      context.options as GroupPeerRuleOptions,
    );

    if (config.disabled) {
      return {};
    }

    function checkOpeningElement(openingElement: JSXOpeningElementLike): void {
      const classStrings = extractClassStringsFromJsxOpening(
        openingElement,
        config.callees,
      );

      for (const classString of classStrings) {
        const { markers, consumers } = parseClassString(
          classString,
          config.prefix,
          config.kinds,
        );

        for (const marker of markers) {
          if (marker.name === null) {
            context.report({
              node: marker.node,
              messageId: "unnamedMarker",
              data: { kind: marker.kind },
            });
          }
        }

        for (const consumer of consumers) {
          if (consumer.name === null) {
            context.report({
              node: consumer.node,
              messageId: "unnamedConsumer",
              data: { kind: consumer.kind, token: consumer.token },
            });
          }
        }
      }
    }

    return {
      JSXOpeningElement(node: Rule.Node): void {
        checkOpeningElement(node as unknown as JSXOpeningElementLike);
      },
    };
  },
};

export default rule;
