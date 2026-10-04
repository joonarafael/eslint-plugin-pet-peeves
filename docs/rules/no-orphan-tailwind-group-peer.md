# Require matching Tailwind group and peer markers (`no-orphan-tailwind-group-peer`)

Reports `group-*` and `peer-*` variants when no matching marker exists in the same file’s JSX tree:

- **Group** consumers need an ancestor element (in the same JSX tree) with `group` or `group/{name}` matching the variant name.
- **Peer** consumers need a **preceding** sibling element with `peer` or `peer/{name}` matching the variant name.

Analysis is limited to the current file. Component boundaries are not inlined: a child component that uses `group-hover/item` is not considered covered by a parent’s `group/item` when that marker lives in the caller’s JSX.

## Why

Orphan variants look valid in the editor but never respond to interaction, which is hard to spot in review:

```jsx
<span className="group-hover/item:underline">Save</span>
```

A matching ancestor in the same tree makes the intent obvious:

```jsx
<div className="group/item">
  <span className="group-hover/item:underline">Save</span>
</div>
```

## Options

Same schema as [`no-unnamed-tailwind-group-peer`](no-unnamed-tailwind-group-peer.md):

```js
{
  "pet-peeves/no-orphan-tailwind-group-peer": ["error", { kinds: ["group"] }],
}
```

- `kinds` — `"group"`, `"peer"`, or both. Default: `["group", "peer"]`.
- `callees` and `prefix` — same behavior as the unnamed rule.

## Matching rules

- Names must match exactly: `group-hover/item` requires `group/item`, not `group/other`.
- A marker on the **same** element does not satisfy a `group-*` consumer (Tailwind targets descendants).
- **Peer** only inspects preceding JSX element siblings. Fragments are flattened (they do not create a DOM node). Following siblings do not count.

## Known limitation

Leaf components that only make sense under a caller’s group are reported as orphans when the marker and consumer are split across components, even in one file:

```jsx
function SaveLabel() {
  return <span className="group-hover/item:underline">Save</span>;
}

function Row() {
  return (
    <div className="group/item">
      <SaveLabel />
    </div>
  );
}
```

Keep the consumer in the same JSX subtree as the marker, or disable the rule for that pattern.

## When not to use it

Turn the rule off when group/peer wiring is intentionally cross-component, or when most classes are dynamic strings this rule cannot see.
