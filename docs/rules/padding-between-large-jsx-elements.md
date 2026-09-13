# Pad large JSX siblings (`padding-between-large-jsx-elements`)

Requires one blank line between adjacent JSX elements when both span at least a configured number of lines. JSX fragments are treated as elements and are also checked as containers.

## Why

Short JSX siblings are easy to scan as a compact list. Larger siblings contain enough detail that placing them back-to-back makes the boundary between them easy to miss:

```jsx
<main>
  <AccountSummary
    account={account}
    balance={balance}
    currency={currency}
    pendingCharges={pendingCharges}
    showDetails
  />
  <RecentTransactions
    accountId={account.id}
    transactions={transactions}
    loading={loading}
    onLoadMore={loadMore}
    showPending
  />
</main>
```

The blank line makes the two substantial sections visually distinct without spreading out every JSX child:

```jsx
<main>
  <AccountSummary
    account={account}
    balance={balance}
    currency={currency}
    pendingCharges={pendingCharges}
    showDetails
  />

  <RecentTransactions
    accountId={account.id}
    transactions={transactions}
    loading={loading}
    onLoadMore={loadMore}
    showPending
  />
</main>
```

## Options

The rule accepts an object with `minLines`, `padAroundAnyLargeElement`, and `expressionContainers` properties:

```js
{
  "pet-peeves/padding-between-large-jsx-elements": [
    "error",
    { minLines: 8, padAroundAnyLargeElement: false, expressionContainers: "none" },
  ]
}
```

`minLines` must be an integer from `0` through `999`. It defaults to `8` when the option is omitted. The opening and closing lines are included in an element's line count.

`0` disables the rule. `1` applies it to every pair of adjacent JSX elements.

With `{ minLines: 3 }`, this example is valid because it contains a blank line:

```jsx
<>
  <First value={first} />

  <Second value={second} />
</>
```

This example is invalid:

```jsx
<>
  <First value={first} />
  <Second value={second} />
</>
```

The rule reports the second element and provides an automatic whitespace fix.

### `padAroundAnyLargeElement`

By default (`padAroundAnyLargeElement: false`), **both** adjacent elements must meet the `minLines` threshold before padding is required. A large element sitting next to a small one is left alone:

```jsx
<>
  <AccountSummary
    account={account}
    balance={balance}
    currency={currency}
    pendingCharges={pendingCharges}
    showDetails
  />
  <Divider />
</>
```

Set `padAroundAnyLargeElement: true` to require a blank line whenever **either** neighbor meets the threshold, so every large element gets breathing room on both sides regardless of how small its neighbor is:

```js
{
  "pet-peeves/padding-between-large-jsx-elements": [
    "error",
    { minLines: 8, padAroundAnyLargeElement: true },
  ]
}
```

With that option, the previous example becomes invalid, and the fixer adds a blank line before `<Divider />` even though `<Divider />` itself is a single line:

```jsx
<>
  <AccountSummary
    account={account}
    balance={balance}
    currency={currency}
    pendingCharges={pendingCharges}
    showDetails
  />

  <Divider />
</>
```

## Scope

Only direct JSX element and fragment siblings are compared. Whitespace-only JSX text between them is ignored. Other children, including text, comments, and expression containers, break adjacency by default.

Elements wrapped in expression containers are therefore not compared by default:

```jsx
<>
  {showFirst && <First />}
  {showSecond && <Second />}
</>
```

Fragments participate on both sides of the rule. Two adjacent multiline fragments require padding, and direct children inside a fragment are checked in the same way as children inside a JSX element.

### `expressionContainers`

Set `expressionContainers` to opt expression containers (`{...}`) into the comparison. It accepts three values:

- `"none"` (default) — expression containers always break adjacency, as shown above. This matches the rule's original behavior, so existing configs are unaffected.
- `"jsxOnly"` — an expression container is treated like an element when its expression renders JSX: directly (`{<Foo />}`), through `&&`/`||` (`{cond && <Foo />}`), or through a ternary (`{cond ? <A /> : <B />}`). The container's own span, including the wrapping condition, counts toward its line total. Anything else (`{value}`, `{formatDate(x)}`, comments) still breaks adjacency.
- `"all"` — every expression container is treated like an element, regardless of what it contains. This also covers list rendering (`{items.map((item) => <Item key={item.id} />)}`) and comments (`{/* ... */}`).

With `{ minLines: 8, expressionContainers: "jsxOnly" }`, the earlier example becomes invalid once each container spans at least 8 lines, including the wrapping condition:

```jsx
<>
  {showFirst && (
    <First
      prop1={prop1}
      prop2={prop2}
      prop3={prop3}
      prop4={prop4}
      prop5={prop5}
    />
  )}
  {showSecond && (
    <Second
      prop1={prop1}
      prop2={prop2}
      prop3={prop3}
      prop4={prop4}
      prop5={prop5}
    />
  )}
</>
```

A plain expression, like `{value}`, still breaks adjacency under `"jsxOnly"` since it doesn't render JSX:

```jsx
<>
  <First
    prop1={prop1}
    prop2={prop2}
    prop3={prop3}
    prop4={prop4}
    prop5={prop5}
  />
  {value}
  <Second
    prop1={prop1}
    prop2={prop2}
    prop3={prop3}
    prop4={prop4}
    prop5={prop5}
  />
</>
```

Under `"all"`, that same `{value}` becomes a comparable sibling in its own right, checked against each neighbor using the same `minLines`/`padAroundAnyLargeElement` rules as any other pair — a short expression like `{value}` simply won't be "large" enough on its own to require padding.

## When not to use it

Turn the rule off when vertical compactness is more useful than visually separating large JSX siblings, or when another formatter or layout rule owns blank lines in JSX.
