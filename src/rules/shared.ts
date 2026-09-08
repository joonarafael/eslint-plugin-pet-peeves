import type { Rule } from "eslint";

export const DEFAULT_MAX = 4;

export const LOGICAL_OPERATORS = ["&&", "||", "??"] as const;

export type LogicalOperator = (typeof LOGICAL_OPERATORS)[number];

export type Options = [
  {
    max: number;
    ignore?: readonly LogicalOperator[];
  }?,
];

export type LogicalExpression = Rule.Node & {
  type: "LogicalExpression";
  operator: LogicalOperator;
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
      ignore: {
        type: "array",
        items: {
          type: "string",
          enum: LOGICAL_OPERATORS,
        },
        uniqueItems: true,
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

export function getIgnore(options: Options): ReadonlySet<LogicalOperator> {
  return new Set(options[0]?.ignore ?? []);
}

export function isDisabledMax(max: number): boolean {
  return max < 2;
}
