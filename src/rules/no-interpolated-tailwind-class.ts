import type { Rule } from "eslint";

import {
  DEFAULT_CALLEES,
  isClassAttributeName,
} from "./tailwind-group-peer.js";

type Options = [
  {
    callees?: readonly string[];
  }?,
];

const optionSchema = [
  {
    type: "object",
    properties: {
      callees: {
        type: "array",
        items: {
          type: "string",
          minLength: 1,
        },
        uniqueItems: true,
      },
    },
    additionalProperties: false,
  },
] as const;

interface AstNode {
  type: string;
  parent?: AstNode | null;
  value?: unknown;
  name?: string | AstNode;
  computed?: boolean;
  callee?: AstNode;
  arguments?: readonly AstNode[];
  left?: AstNode;
  right?: AstNode;
  test?: AstNode;
  property?: AstNode;
  key?: AstNode;
  id?: AstNode;
  init?: AstNode | null;
  expression?: AstNode;
  expressions?: readonly AstNode[];
}

function getCallees(options: Options): ReadonlySet<string> {
  return new Set(options[0]?.callees ?? DEFAULT_CALLEES);
}

function isClassNameBinding(name: string): boolean {
  return (
    name === "className" ||
    name === "classNames" ||
    name.endsWith("ClassName") ||
    name.endsWith("ClassNames")
  );
}

function isClassStringName(name: string): boolean {
  return isClassAttributeName(name) || isClassNameBinding(name);
}

function getCalleeName(node: AstNode): string | null {
  if (node.type === "Identifier" && typeof node.name === "string") {
    return node.name;
  }

  return null;
}

function getJsxAttributeName(attribute: AstNode): string | null {
  if (attribute.name === undefined || typeof attribute.name !== "object") {
    return null;
  }

  return typeof attribute.name.name === "string" ? attribute.name.name : null;
}

function isIdentifierClassString(node: AstNode): boolean {
  if (node.type !== "Identifier" && node.type !== "JSXIdentifier") {
    return false;
  }

  return typeof node.name === "string" && isClassStringName(node.name);
}

function isStringLiteralClassString(node: AstNode): boolean {
  return (
    node.type === "Literal" &&
    typeof node.value === "string" &&
    isClassStringName(node.value)
  );
}

function isClassNameTarget(node: AstNode | null | undefined): boolean {
  if (node === undefined || node === null) {
    return false;
  }

  if (node.type === "MemberExpression") {
    const property = node.property;
    if (property === undefined) {
      return false;
    }

    if (node.computed === true) {
      return isStringLiteralClassString(property);
    }

    return isIdentifierClassString(property);
  }

  return isIdentifierClassString(node) || isStringLiteralClassString(node);
}

function isClassNamePropertyKey(property: AstNode): boolean {
  const key = property.key;
  if (key === undefined) {
    return false;
  }

  if (property.computed === true) {
    return isStringLiteralClassString(key);
  }

  return isIdentifierClassString(key);
}

function isJsxClassAttributeValue(container: AstNode): boolean {
  const attribute = container.parent;
  if (attribute?.type !== "JSXAttribute" || attribute.value !== container) {
    return false;
  }

  const name = getJsxAttributeName(attribute);
  return name !== null && isClassStringName(name);
}

function isConfiguredCalleeArgument(
  node: AstNode,
  call: AstNode,
  callees: ReadonlySet<string>,
): boolean {
  if (call.callee === undefined) {
    return false;
  }

  const calleeName = getCalleeName(call.callee);
  if (calleeName === null || !callees.has(calleeName)) {
    return false;
  }

  return call.arguments?.includes(node) ?? false;
}

function isLastSequenceExpression(node: AstNode, sequence: AstNode): boolean {
  const expressions = sequence.expressions ?? [];
  return expressions[expressions.length - 1] === node;
}

function isClassNamePropertyValue(node: AstNode, property: AstNode): boolean {
  return property.value === node && isClassNamePropertyKey(property);
}

function isRenamedClassNameDefault(pattern: AstNode): boolean {
  const property = pattern.parent;
  return property?.type === "Property" && isClassNamePropertyKey(property);
}

/**
 * True when `node` is the class string itself.
 * Ternaries, `&&` / `||` / `??`, arrays, clsx object keys, assertions,
 * configured callee arguments, and `className`-style bindings still count.
 * Ternary tests and arguments of other functions do not.
 */
function isClassStringPosition(
  node: AstNode,
  callees: ReadonlySet<string>,
): boolean {
  const parent = node.parent;
  if (parent === undefined || parent === null) {
    return false;
  }

  switch (parent.type) {
    case "TaggedTemplateExpression":
    case "TSAsExpression":
    case "TSTypeAssertion":
    case "TSSatisfiesExpression":
    case "TSNonNullExpression":
    case "AwaitExpression":
    case "ChainExpression":
    case "ParenthesizedExpression":
    case "YieldExpression":
      return isClassStringPosition(parent, callees);
    case "SequenceExpression":
      return (
        isLastSequenceExpression(node, parent) &&
        isClassStringPosition(parent, callees)
      );
    case "LogicalExpression":
    case "ArrayExpression":
    case "SpreadElement":
      return isClassStringPosition(parent, callees);
    case "ConditionalExpression":
      if (parent.test === node) {
        return false;
      }
      return isClassStringPosition(parent, callees);
    case "JSXExpressionContainer":
      return isJsxClassAttributeValue(parent);
    case "CallExpression":
      return isConfiguredCalleeArgument(node, parent, callees);
    case "Property":
      if (isClassNamePropertyValue(node, parent)) {
        return true;
      }
      if (parent.key === node) {
        const objectExpression = parent.parent;
        if (objectExpression === undefined || objectExpression === null) {
          return false;
        }
        return isClassStringPosition(objectExpression, callees);
      }
      return false;
    case "VariableDeclarator":
      return parent.init === node && isClassNameTarget(parent.id);
    case "AssignmentExpression":
      return parent.right === node && isClassNameTarget(parent.left);
    case "AssignmentPattern":
      return (
        parent.right === node &&
        (isClassNameTarget(parent.left) || isRenamedClassNameDefault(parent))
      );
    case "TemplateLiteral":
      return false;
    default:
      return false;
  }
}

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Disallow interpolated template strings in Tailwind class names.",
      recommended: false,
      url: "https://github.com/joonarafael/eslint-plugin-pet-peeves/blob/master/docs/rules/no-interpolated-tailwind-class.md",
    },
    schema: optionSchema,
    messages: {
      interpolatedClass:
        "Do not build this Tailwind class string with template interpolation. Compose it with `cn()` instead.",
    },
  },

  create(context) {
    const callees = getCallees(context.options as Options);

    return {
      TemplateLiteral(node: Rule.Node): void {
        const template = node as unknown as AstNode;
        if ((template.expressions ?? []).length === 0) {
          return;
        }

        if (isClassStringPosition(template, callees)) {
          context.report({
            node,
            messageId: "interpolatedClass",
          });
        }
      },
    };
  },
};

export default rule;
