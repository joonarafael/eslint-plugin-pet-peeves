import type { Rule } from "eslint";

import {
  collectGroupMarkersInAncestors,
  collectPeerMarkersInPrecedingSiblings,
  extractClassStringsFromJsxOpening,
  getGroupPeerRuleConfig,
  groupPeerOptionSchema,
  hasMatchingMarker,
  parseClassString,
  type GroupPeerConsumer,
  type GroupPeerRuleOptions,
  type JSXElementLike,
} from "./tailwind-group-peer.js";

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Require a matching named Tailwind group or peer marker in the same file JSX tree.",
      recommended: false,
      url: "https://github.com/joonarafael/eslint-plugin-pet-peeves/blob/master/docs/rules/no-orphan-tailwind-group-peer.md",
    },
    schema: groupPeerOptionSchema,
    messages: {
      orphanGroupConsumer:
        "No ancestor with `group/{{name}}` was found for `{{token}}` in this JSX tree.",
      orphanGroupConsumerUnnamed:
        "No ancestor with `group` was found for `{{token}}` in this JSX tree.",
      orphanPeerConsumer:
        "No preceding sibling with `peer/{{name}}` was found for `{{token}}` in this JSX tree.",
      orphanPeerConsumerUnnamed:
        "No preceding sibling with `peer` was found for `{{token}}` in this JSX tree.",
    },
  },

  create(context) {
    const config = getGroupPeerRuleConfig(
      context.options as GroupPeerRuleOptions,
    );

    if (config.disabled) {
      return {};
    }

    function reportOrphanConsumer(consumer: GroupPeerConsumer): void {
      if (consumer.kind === "group") {
        context.report({
          node: consumer.node,
          messageId:
            consumer.name === null
              ? "orphanGroupConsumerUnnamed"
              : "orphanGroupConsumer",
          data: {
            token: consumer.token,
            name: consumer.name ?? "",
          },
        });
        return;
      }

      context.report({
        node: consumer.node,
        messageId:
          consumer.name === null
            ? "orphanPeerConsumerUnnamed"
            : "orphanPeerConsumer",
        data: {
          token: consumer.token,
          name: consumer.name ?? "",
        },
      });
    }

    return {
      JSXElement(node: Rule.Node): void {
        const element = node as unknown as JSXElementLike;
        const classStrings = extractClassStringsFromJsxOpening(
          element.openingElement,
          config.callees,
        );

        const groupMarkers = config.kinds.has("group")
          ? collectGroupMarkersInAncestors(
              element,
              config.callees,
              config.prefix,
              config.kinds,
            )
          : [];

        const peerMarkers = config.kinds.has("peer")
          ? collectPeerMarkersInPrecedingSiblings(
              element,
              config.callees,
              config.prefix,
              config.kinds,
            )
          : [];

        for (const classString of classStrings) {
          const { consumers } = parseClassString(
            classString,
            config.prefix,
            config.kinds,
          );

          for (const consumer of consumers) {
            if (consumer.kind === "group") {
              if (!hasMatchingMarker(consumer, groupMarkers)) {
                reportOrphanConsumer(consumer);
              }
              continue;
            }

            if (!hasMatchingMarker(consumer, peerMarkers)) {
              reportOrphanConsumer(consumer);
            }
          }
        }
      },
    };
  },
};

export default rule;
