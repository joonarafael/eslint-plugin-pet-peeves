# Limit same-operator logical operands (`max-same-operator-operands`)

Limits the number of operands in each maximal `&&`, `||`, or `??` chain. Different logical operators begin separate chains, while the expression using  them can still be an operand in the surrounding chain.

For example, this expression has a three-operand `||` chain, a three-operand `&&` chain, and a two-operand `&&` chain:

```js
a && b && c || d && e || f;
```

Parentheses do not break a same-operator chain.

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
a && b || c && d;
(a ?? b) || (c ?? d);
```

These examples are invalid:

```js
a && b && c && d;
(a || b) || (c || d);
```

The rule reports each complete offending chain and does not provide an automatic fix.
