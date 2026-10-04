import type { Rule } from "eslint";

export const DEFAULT_CALLEES = ["cn", "clsx", "classnames", "twMerge"] as const;

export const GROUP_PEER_KINDS = ["group", "peer"] as const;

export type GroupPeerKind = (typeof GROUP_PEER_KINDS)[number];

export type GroupPeerRuleOptions = [
  {
    kinds?: readonly GroupPeerKind[];
    callees?: readonly string[];
    prefix?: string;
  }?,
];

export const groupPeerOptionSchema = [
  {
    type: "object",
    properties: {
      kinds: {
        type: "array",
        items: {
          type: "string",
          enum: GROUP_PEER_KINDS,
        },
        uniqueItems: true,
      },
      callees: {
        type: "array",
        items: {
          type: "string",
          minLength: 1,
        },
        uniqueItems: true,
      },
      prefix: {
        type: "string",
      },
    },
    additionalProperties: false,
  },
] as const;

export interface ExtractedClassString {
  readonly value: string;
  readonly node: Rule.Node;
}

export interface GroupPeerMarker {
  readonly kind: GroupPeerKind;
  /** `null` means the unnamed `group` / `peer` marker. */
  readonly name: string | null;
  readonly token: string;
  readonly node: Rule.Node;
}

export interface GroupPeerConsumer {
  readonly kind: GroupPeerKind;
  /** `null` means an unnamed `group-*` / `peer-*` variant. */
  readonly name: string | null;
  readonly token: string;
  readonly node: Rule.Node;
}

interface AstNode {
  type: string;
  parent?: AstNode | null;
  value?: unknown;
  left?: AstNode;
  right?: AstNode;
  consequent?: AstNode;
  alternate?: AstNode;
  elements?: readonly (AstNode | null)[];
  properties?: readonly AstNode[];
  arguments?: readonly AstNode[];
  callee?: AstNode;
  expression?: AstNode;
  key?: AstNode;
  name?: string | AstNode;
  quasis?: readonly { value: { cooked: string | null; raw: string } }[];
  attributes?: readonly AstNode[];
  children?: readonly AstNode[];
  openingElement?: AstNode;
}

export interface JSXOpeningElementLike {
  type: "JSXOpeningElement";
  attributes: readonly AstNode[];
}

export interface JSXElementLike {
  type: "JSXElement";
  openingElement: JSXOpeningElementLike;
  parent?: AstNode;
  children?: readonly AstNode[];
}

export interface JSXFragmentLike {
  type: "JSXFragment";
  children?: readonly AstNode[];
  parent?: AstNode;
}

function asRuleNode(node: AstNode): Rule.Node {
  return node as unknown as Rule.Node;
}

export function getGroupPeerRuleConfig(options: GroupPeerRuleOptions): {
  kinds: ReadonlySet<GroupPeerKind>;
  callees: ReadonlySet<string>;
  prefix: string;
  disabled: boolean;
} {
  const kinds = new Set(options[0]?.kinds ?? GROUP_PEER_KINDS);
  const callees = new Set(options[0]?.callees ?? DEFAULT_CALLEES);
  const prefix = options[0]?.prefix ?? "";

  return {
    kinds,
    callees,
    prefix,
    disabled: kinds.size === 0,
  };
}

export function isClassAttributeName(name: string): boolean {
  return name === "class" || name === "className";
}

function isStringLiteral(node: AstNode): boolean {
  return node.type === "Literal" && typeof node.value === "string";
}

function getAttributeName(attribute: AstNode): string | null {
  if (attribute.name === undefined || typeof attribute.name !== "object") {
    return null;
  }

  const nameNode = attribute.name;
  return typeof nameNode.name === "string" ? nameNode.name : null;
}

function getCalleeName(node: AstNode): string | null {
  if (node.type === "Identifier" && typeof node.name === "string") {
    return node.name;
  }

  return null;
}

function collectFromExpression(
  expression: AstNode | null | undefined,
  callees: ReadonlySet<string>,
  out: ExtractedClassString[],
): void {
  if (expression === null || expression === undefined) {
    return;
  }

  switch (expression.type) {
    case "Literal":
      if (isStringLiteral(expression)) {
        out.push({
          value: expression.value as string,
          node: asRuleNode(expression),
        });
      }
      return;
    case "TemplateLiteral": {
      const value = (expression.quasis ?? [])
        .map((quasi) => quasi.value.cooked ?? quasi.value.raw)
        .join("");
      if (value.length > 0) {
        out.push({ value, node: asRuleNode(expression) });
      }
      return;
    }
    case "ArrayExpression":
      for (const element of expression.elements ?? []) {
        collectFromExpression(element, callees, out);
      }
      return;
    case "LogicalExpression":
      collectFromExpression(expression.left, callees, out);
      collectFromExpression(expression.right, callees, out);
      return;
    case "ConditionalExpression":
      collectFromExpression(expression.consequent, callees, out);
      collectFromExpression(expression.alternate, callees, out);
      return;
    case "ObjectExpression":
      for (const property of expression.properties ?? []) {
        if (property.type !== "Property") {
          continue;
        }
        const propertyKey = property.key;
        if (propertyKey !== undefined && isStringLiteral(propertyKey)) {
          out.push({
            value: propertyKey.value as string,
            node: asRuleNode(propertyKey),
          });
        }
        collectFromExpression(
          property.value as AstNode | undefined,
          callees,
          out,
        );
      }
      return;
    case "CallExpression": {
      const calleeName =
        expression.callee !== undefined
          ? getCalleeName(expression.callee)
          : null;
      if (calleeName !== null && callees.has(calleeName)) {
        for (const argument of expression.arguments ?? []) {
          collectFromExpression(argument, callees, out);
        }
      }
      return;
    }
    default:
      return;
  }
}

export function extractClassStringsFromJsxAttribute(
  attribute: AstNode,
  callees: ReadonlySet<string>,
): ExtractedClassString[] {
  const out: ExtractedClassString[] = [];
  const attributeName = getAttributeName(attribute);

  if (attributeName === null || !isClassAttributeName(attributeName)) {
    return out;
  }

  const value = attribute.value as AstNode | null | undefined;
  if (value === null || value === undefined) {
    return out;
  }

  if (isStringLiteral(value)) {
    out.push({ value: value.value as string, node: asRuleNode(value) });
    return out;
  }

  if (value.type === "JSXExpressionContainer") {
    collectFromExpression(value.expression, callees, out);
  }

  return out;
}

export function extractClassStringsFromJsxOpening(
  openingElement: JSXOpeningElementLike,
  callees: ReadonlySet<string>,
): ExtractedClassString[] {
  const out: ExtractedClassString[] = [];

  for (const attribute of openingElement.attributes) {
    if (attribute.type !== "JSXAttribute") {
      continue;
    }
    out.push(...extractClassStringsFromJsxAttribute(attribute, callees));
  }

  return out;
}

function stripImportantModifier(token: string): string {
  let result = token;
  if (result.startsWith("!")) {
    result = result.slice(1);
  }
  if (result.endsWith("!")) {
    result = result.slice(0, -1);
  }
  return result;
}

function applyPrefix(token: string, prefix: string): string | null {
  if (prefix === "") {
    return token;
  }
  if (!token.startsWith(prefix)) {
    return null;
  }
  return token.slice(prefix.length);
}

function splitVariants(token: string): { variants: string[]; utility: string } {
  const variants: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < token.length; index += 1) {
    const char = token[index];
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth = Math.max(0, depth - 1);
    } else if (char === ":" && depth === 0) {
      variants.push(token.slice(start, index));
      start = index + 1;
    }
  }

  return {
    variants,
    utility: token.slice(start),
  };
}

function parseNameSuffix(suffix: string): string | null {
  let depth = 0;
  let lastSlash = -1;

  for (let index = 0; index < suffix.length; index += 1) {
    const char = suffix[index];
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth = Math.max(0, depth - 1);
    } else if (char === "/" && depth === 0) {
      lastSlash = index;
    }
  }

  if (lastSlash === -1) {
    return null;
  }

  return suffix.slice(lastSlash + 1);
}

function parseMarkerUtility(
  utility: string,
): { kind: GroupPeerKind; name: string | null } | null {
  const groupMatch = /^group(?:\/(.+))?$/.exec(utility);
  if (groupMatch !== null) {
    return {
      kind: "group",
      name: groupMatch[1] ?? null,
    };
  }

  const peerMatch = /^peer(?:\/(.+))?$/.exec(utility);
  if (peerMatch !== null) {
    return {
      kind: "peer",
      name: peerMatch[1] ?? null,
    };
  }

  return null;
}

function parseConsumerVariant(
  variant: string,
): { kind: GroupPeerKind; name: string | null } | null {
  let rest = variant;
  if (rest.startsWith("not-")) {
    rest = rest.slice(4);
  }

  let kind: GroupPeerKind | null = null;
  if (rest.startsWith("group")) {
    kind = "group";
  } else if (rest.startsWith("peer")) {
    kind = "peer";
  } else {
    return null;
  }

  const tail = rest.slice(kind.length);
  if (tail.length === 0) {
    return null;
  }

  if (!tail.startsWith("-") && !tail.startsWith("[")) {
    return null;
  }

  return {
    kind,
    name: parseNameSuffix(tail),
  };
}

function namesMatch(
  consumerName: string | null,
  markerName: string | null,
): boolean {
  return consumerName === markerName;
}

export function parseClassToken(
  rawToken: string,
  prefix: string,
): {
  markers: readonly { kind: GroupPeerKind; name: string | null }[];
  consumers: readonly { kind: GroupPeerKind; name: string | null }[];
} {
  const stripped = stripImportantModifier(rawToken.trim());
  if (stripped.length === 0) {
    return { markers: [], consumers: [] };
  }

  const withoutPrefix = applyPrefix(stripped, prefix);
  if (withoutPrefix === null) {
    return { markers: [], consumers: [] };
  }

  const { variants, utility } = splitVariants(withoutPrefix);
  const markers: { kind: GroupPeerKind; name: string | null }[] = [];
  const consumers: { kind: GroupPeerKind; name: string | null }[] = [];

  const marker = parseMarkerUtility(utility);
  if (marker !== null) {
    markers.push(marker);
  }

  for (const variant of variants) {
    const consumer = parseConsumerVariant(variant);
    if (consumer !== null) {
      consumers.push(consumer);
    }
  }

  return { markers, consumers };
}

export function parseClassString(
  classString: ExtractedClassString,
  prefix: string,
  enabledKinds: ReadonlySet<GroupPeerKind>,
): { markers: GroupPeerMarker[]; consumers: GroupPeerConsumer[] } {
  const markers: GroupPeerMarker[] = [];
  const consumers: GroupPeerConsumer[] = [];

  const tokens = classString.value
    .split(/\s+/u)
    .filter((token) => token.length > 0);

  for (const token of tokens) {
    const parsed = parseClassToken(token, prefix);

    for (const marker of parsed.markers) {
      if (enabledKinds.has(marker.kind)) {
        markers.push({
          ...marker,
          token,
          node: classString.node,
        });
      }
    }

    for (const consumer of parsed.consumers) {
      if (enabledKinds.has(consumer.kind)) {
        consumers.push({
          ...consumer,
          token,
          node: classString.node,
        });
      }
    }
  }

  return { markers, consumers };
}

export function markerMatchesConsumer(
  marker: GroupPeerMarker,
  consumer: GroupPeerConsumer,
): boolean {
  return (
    marker.kind === consumer.kind && namesMatch(consumer.name, marker.name)
  );
}

export function getJsxParentElement(node: AstNode): AstNode | null {
  let current: AstNode | null | undefined = node.parent;

  while (current !== undefined && current !== null) {
    if (current.type === "JSXElement" || current.type === "JSXFragment") {
      return current;
    }
    current = current.parent;
  }

  return null;
}

function isJsxWhitespaceText(child: AstNode): boolean {
  return (
    child.type === "JSXText" &&
    typeof child.value === "string" &&
    /^\s*$/u.test(child.value)
  );
}

function flattenPrecedingJsxElements(startChild: AstNode): JSXElementLike[] {
  const parent = getJsxParentElement(startChild);
  if (parent?.children === undefined) {
    return [];
  }

  const index = parent.children.indexOf(startChild);
  if (index <= 0) {
    return [];
  }

  const result: JSXElementLike[] = [];

  for (let childIndex = index - 1; childIndex >= 0; childIndex -= 1) {
    const child = parent.children[childIndex];
    if (child === undefined) {
      continue;
    }

    if (isJsxWhitespaceText(child)) {
      continue;
    }

    if (child.type === "JSXFragment") {
      const fragmentChildren = child.children ?? [];
      for (
        let fragmentIndex = fragmentChildren.length - 1;
        fragmentIndex >= 0;
        fragmentIndex -= 1
      ) {
        const fragmentChild = fragmentChildren[fragmentIndex];
        if (fragmentChild === undefined) {
          continue;
        }
        if (isJsxWhitespaceText(fragmentChild)) {
          continue;
        }
        if (fragmentChild.type === "JSXElement") {
          result.push(fragmentChild as JSXElementLike);
        } else {
          return result;
        }
      }
      continue;
    }

    if (child.type === "JSXElement") {
      result.push(child as JSXElementLike);
      continue;
    }

    return result;
  }

  return result;
}

export function collectGroupMarkersInAncestors(
  element: JSXElementLike,
  callees: ReadonlySet<string>,
  prefix: string,
  enabledKinds: ReadonlySet<GroupPeerKind>,
): GroupPeerMarker[] {
  const markers: GroupPeerMarker[] = [];
  let current: AstNode | null | undefined = element.parent;

  while (current !== undefined && current !== null) {
    if (current.type === "JSXElement") {
      const jsxElement = current as JSXElementLike;
      const classStrings = extractClassStringsFromJsxOpening(
        jsxElement.openingElement,
        callees,
      );
      for (const classString of classStrings) {
        const parsed = parseClassString(classString, prefix, enabledKinds);
        for (const marker of parsed.markers) {
          if (marker.kind === "group") {
            markers.push(marker);
          }
        }
      }
    }

    current = current.parent;
  }

  return markers;
}

export function collectPeerMarkersInPrecedingSiblings(
  element: JSXElementLike,
  callees: ReadonlySet<string>,
  prefix: string,
  enabledKinds: ReadonlySet<GroupPeerKind>,
): GroupPeerMarker[] {
  const markers: GroupPeerMarker[] = [];
  const preceding = flattenPrecedingJsxElements(element);

  for (const sibling of preceding) {
    const classStrings = extractClassStringsFromJsxOpening(
      sibling.openingElement,
      callees,
    );
    for (const classString of classStrings) {
      const parsed = parseClassString(classString, prefix, enabledKinds);
      for (const marker of parsed.markers) {
        if (marker.kind === "peer") {
          markers.push(marker);
        }
      }
    }
  }

  return markers;
}

export function hasMatchingMarker(
  consumer: GroupPeerConsumer,
  markers: readonly GroupPeerMarker[],
): boolean {
  return markers.some((marker) => markerMatchesConsumer(marker, consumer));
}
