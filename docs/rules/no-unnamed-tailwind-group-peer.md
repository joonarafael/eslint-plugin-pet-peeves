# Require named Tailwind group and peer (`no-unnamed-tailwind-group-peer`)

Disallows unnamed Tailwind `group` and `peer` markers and variants. Use named groups and peers (`group/item`, `group-hover/item`, `peer/toggle`, `peer-checked/toggle`) so parent state does not leak across unrelated markup.

## Why

Unnamed `group` and `peer` tie every descendant or following sibling to the nearest marker in the DOM. That is easy to break accidentally when a parent already uses `group` for layout and a child adds `group-hover:underline` expecting only its own wrapper.

Named modifiers scope the relationship explicitly:

```jsx
<li className="group/item">
  <a className="group-hover/item:underline" href={href}>
    Edit
  </a>
</li>
```

## Options

```js
{
  "pet-peeves/no-unnamed-tailwind-group-peer": [
    "error",
    { kinds: ["group", "peer"], callees: ["cn", "clsx"], prefix: "" },
  ],
}
```

- `kinds` — `"group"` and/or `"peer"` to analyze. Default: `["group", "peer"]`. An empty array disables the rule.
- `callees` — utility functions whose string arguments are scanned. Default: `["cn", "clsx", "classnames", "twMerge"]`.
- `prefix` — when set (for example `"tw:"`), only class tokens with that prefix are considered; the prefix is stripped before parsing.

## What is checked

Static `class` / `className` attributes and string literals inside configured callees, including arrays, conditionals, and clsx-style object keys.

Dynamic class names (`className={styles.foo}`) are skipped.

`group-card` and similar custom utilities are not treated as `group` markers.

## Examples

Valid:

```jsx
<div className="group/sidebar">
  <span className="group-hover/sidebar:text-red-500" />
</div>
```

Invalid:

```jsx
<div className="group" />
<span className="group-hover:underline" />
```

## When not to use it

Skip this rule in codebases that intentionally rely on unnamed `group` / `peer`, or where class names are mostly dynamic and the rule would stay silent anyway.
