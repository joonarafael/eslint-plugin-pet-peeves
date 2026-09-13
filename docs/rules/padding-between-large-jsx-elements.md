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

The rule accepts an object with `minLines` and `padAroundAnyLargeElement` properties:

```js
{
  "pet-peeves/padding-between-large-jsx-elements": [
    "error",
    { minLines: 8, padAroundAnyLargeElement: false },
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

Only direct JSX element and fragment siblings are compared. Whitespace-only JSX text between them is ignored. Other children, including text, comments, and expression containers, break adjacency.

Elements wrapped in expression containers are therefore not compared:

```jsx
<>
  {showFirst && <First />}
  {showSecond && <Second />}
</>
```

Fragments participate on both sides of the rule. Two adjacent multiline fragments require padding, and direct children inside a fragment are checked in the same way as children inside a JSX element.

## When not to use it

Turn the rule off when vertical compactness is more useful than visually separating large JSX siblings, or when another formatter or layout rule owns blank lines in JSX.
