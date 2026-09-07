# Limit same-operator logical operands (`max-same-operator-operands`)

Limits the number of operands in each maximal `&&`, `||`, or `??` chain. Different logical operators begin separate chains, while the expression using them can still be an operand in the surrounding chain.

For example, this expression has a three-operand `||` chain, a three-operand `&&` chain, and a two-operand `&&` chain:

```js
(a && b && c) || (d && e) || f;
```

Parentheses do not break a same-operator chain.

## Why

A chain of one repeated operator reads as a flat list with no internal structure. Consider this:

```js
const canPublish =
  post.title.length > 0 &&
  post.body.length > 0 &&
  post.tags.length > 0 &&
  post.author.verified &&
  post.author.suspendedAt === null &&
  !post.scheduledAt;
```

Every operand looks equally important and equally related to its neighbours, so nothing tells the reader that the first three are about the post being complete, the next two are about the author, and the last one is a scheduling detail. Finding that grouping means reading all six and inferring it, and a duplicated or subtly wrong operand in the middle of the list is easy to miss because there is no shape to break.

Grouping the operands by what they mean makes the structure visible:

```js
const isComplete =
  post.title.length > 0 && post.body.length > 0 && post.tags.length > 0;

const authorMayPublish =
  post.author.verified && post.author.suspendedAt === null;

const canPublish = isComplete && authorMayPublish && !post.scheduledAt;
```

## Options

The rule accepts an object with a `max` property:

```js
{
  "pet-peeves/max-same-operator-operands": ["error", { max: 4 }]
}
```

`max` must be an integer from `0` through `100`. It defaults to `4` when the option is omitted.

With `{ max: 3 }`, these examples are valid:

```js
a && b && c;
(a && b) || (c && d);
(a ?? b) || (c ?? d);
```

These examples are invalid:

```js
a && b && c && d;
a || b || c || d;
```

The rule reports each complete offending chain and does not provide an automatic fix.

## Refactoring

### Replacing a repeated comparison with data

When every operand in a chain has the same shape and only one value changes, the chain is really a lookup written out longhand. Move the values into a collection and the logic collapses to a single membership test:

```js
// A five-operand '||' chain.
if (
  event.type === "click" ||
  event.type === "dblclick" ||
  event.type === "mousedown" ||
  event.type === "mouseup" ||
  event.type === "mousemove"
) {
  trackPointer(event);
}
```

```js
const POINTER_EVENTS = new Set([
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mousemove",
]);

if (POINTER_EVENTS.has(event.type)) {
  trackPointer(event);
}
```

Adding a sixth event type is now a one-line change that cannot get the comparison wrong, and the set can be exported and reused by anything else that needs the same list.

### Untangling a long fallback chain

A `??` chain expresses precedence between sources, which stays readable for two or three sources and stops being readable once the sources come from different places:

```js
// A six-operand '??' chain.
const port =
  cliArgs.port ??
  process.env.PORT ??
  fileConfig.server?.port ??
  fileConfig.port ??
  remoteConfig.port ??
  3000;
```

```js
const PORT_SOURCES = [
  cliArgs.port,
  process.env.PORT,
  fileConfig.server?.port,
  fileConfig.port,
  remoteConfig.port,
];

const DEFAULT_PORT = 3000;

const port =
  PORT_SOURCES.find((value) => value !== undefined && value !== null) ??
  DEFAULT_PORT;
```

The array makes the precedence order explicit as data, and the default is no longer a bare literal hiding at the end of a chain.

### A note on what this rule does not catch

Because a different operator starts a new chain, an expression can stay within `max` on every chain while still being large overall. With `{ max: 3 }`, this passes:

```js
(a && b && c) || (d && e && f) || (g && h && i);
```

The `||` chain has three operands and each `&&` chain has three, yet the reader still faces nine of them. Enabling [`max-operands`](max-operands.md) alongside this rule bounds the total regardless of how the operators are arranged.

## When not to use it

Turn the rule off if your codebase leans on long uniform chains that are already clear, such as `??` defaulting or `||` allowlists in configuration code, where a collection would add indirection without adding meaning.
