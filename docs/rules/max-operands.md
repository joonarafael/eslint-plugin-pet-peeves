# Limit total logical operands (`max-operands`)

Limits the total number of operands in a connected logical expression. The rule counts operands joined by `&&`, `||`, and `??`, including expressions that mix those operators.

Parentheses do not reset the count. Logical expressions nested inside a non-logical operand, such as a function call, are checked separately.

## Why

A long logical expression has to be evaluated in the reader's head all at once. Take this condition:

```js
if (
  user &&
  user.subscription &&
  user.subscription.status === "active" &&
  !user.subscription.cancelledAt &&
  (user.role === "admin" || user.role === "editor")
) {
  renderEditor();
}
```

Nothing in it says what the combination means. The reader has to hold five unrelated facts in working memory, apply the precedence rules for the mixed `&&` and `||`, and only then reconstruct the intent, which is roughly "the subscription is usable and this person is allowed to edit". That intent is never written down, so it gets reconstructed on every read and re-derived by every reviewer.

Extracting the parts into named variables writes it down once:

```js
const hasActiveSubscription =
  user?.subscription?.status === "active" && !user.subscription.cancelledAt;

const canEdit = user?.role === "admin" || user?.role === "editor";

if (hasActiveSubscription && canEdit) {
  renderEditor();
}
```

## Options

The rule accepts an object with a `max` property and an optional `ignore` array:

```js
{
  "pet-peeves/max-operands": ["error", { max: 4, ignore: ["||"] }]
}
```

`max` must be an integer from `0` through `32`. It defaults to `4` when the option is omitted.

`ignore` is an array of logical operators (`&&`, `||`, `??`) that the rule should not count. It defaults to `[]` when omitted. An ignored operator is treated as a boundary: operands on either side are counted separately, and a chain that uses only ignored operators is not reported.

`0` and `1` disable the rule. A logical expression always has at least two operands, so those values cannot constrain anything and the rule reports nothing.

With `{ max: 4 }`, these examples are valid:

```js
a && b && c && d;
(a && b) || (c ?? d);
```

These examples are invalid:

```js
a && b && c && d && e;
(a && b && c) || (d && e) || f;
```

With `{ max: 4, ignore: ["||"] }`, these examples are valid:

```js
a || b || c || d || e;
(a && b && c) || (d && e);
```

This example is still invalid, because the `&&` operands are counted:

```js
(a && b && c && d && e) || f;
```

The rule reports the complete offending logical expression and does not provide an automatic fix.

## Refactoring

### Splitting a predicate into helper functions

Named variables work well inside a function body. When the expression _is_ the function body, small helpers usually read better, because each one gets a name and can be tested on its own:

```js
// Seven operands, reported with { max: 4 }.
function canDownload(file, user) {
  return (
    file &&
    !file.deleted &&
    (file.ownerId === user.id || user.role === "admin" || file.public) &&
    (!file.expiresAt || file.expiresAt > Date.now())
  );
}
```

```js
function isExpired(file) {
  return file.expiresAt !== undefined && file.expiresAt <= Date.now();
}

function isAvailable(file) {
  return Boolean(file) && !file.deleted && !isExpired(file);
}

function hasAccess(file, user) {
  return file.public || file.ownerId === user.id || user.role === "admin";
}

function canDownload(file, user) {
  return isAvailable(file) && hasAccess(file, user);
}
```

The refactored version also inverts `!file.expiresAt || file.expiresAt > Date.now()` into a positive `isExpired` check, which removes one of the two negations the reader had to unpack.

### Turning a guard into early returns

A condition that mixes a validity check with a business rule can often be split along that seam instead of extracted into a variable. Early returns give each operand its own line and its own reason to fail:

```js
// Six operands, reported with { max: 4 }.
function applyDiscount(cart, coupon) {
  if (
    cart &&
    cart.items.length > 0 &&
    coupon &&
    !coupon.redeemed &&
    coupon.expiresAt > Date.now() &&
    cart.total >= coupon.minimumTotal
  ) {
    cart.total -= coupon.amount;
  }
}
```

```js
function applyDiscount(cart, coupon) {
  if (!cart || cart.items.length === 0) {
    return;
  }

  if (!coupon || coupon.redeemed) {
    return;
  }

  if (coupon.expiresAt <= Date.now()) {
    return;
  }

  if (cart.total < coupon.minimumTotal) {
    return;
  }

  cart.total -= coupon.amount;
}
```

This shape is worth preferring when each condition means something different to the caller, since it gives you an obvious place to attach a specific error, log line, or metric later.

## When not to use it

Turn the rule off in code where long flat conditions are the point rather than an accident, such as generated code, ported algorithms, or table-like validation, where naming every intermediate step hides more than it reveals.
