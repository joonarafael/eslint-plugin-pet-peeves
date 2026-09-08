import type { Rule } from "eslint";

export const DEFAULT_MAX = 4;

export type Options = [{ max: number }?];

export type LogicalExpression = Rule.Node & {
  type: "LogicalExpression";
  operator: "&&" | "||" | "??";
  left: Rule.Node;
  right: Rule.Node;
};

export const maxOptionSchema = [
  {
    type: "object",
    properties: {
      max: {
        type: "integer",
        minimum: 0,
        maximum: 32,
      },
    },
    required: ["max"],
    additionalProperties: false,
  },
] as const;

export function isLogicalExpression(
  node: Rule.Node | null | undefined,
): node is LogicalExpression {
  return node?.type === "LogicalExpression";
}

export function getMax(options: Options): number {
  return options[0]?.max ?? DEFAULT_MAX;
}

export function isDisabledMax(max: number): boolean {
  return max < 2;
}
