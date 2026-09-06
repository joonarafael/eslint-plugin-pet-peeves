# Limit total logical operands (`max-operands`)

Limits the total number of operands in a connected logical expression. The rule counts operands joined by `&&`, `||`, and `??`, including expressions that mix those operators.

Parentheses do not reset the count. Logical expressions nested inside a non-logical operand, such as a function call, are checked separately.

## Options

The rule accepts an object with a `max` property:

```js
{
  "pet-peeves/max-operands": ["error", { max: 4 }]
}
```

`max` must be an integer from `0` through `100`. It defaults to `4` when the option is omitted.

With `{ max: 4 }`, these examples are valid:

```js
a && b && c && d;
(a && b) || (c ?? d);
```

These examples are invalid:

```js
a && b && c && d && e;
a && b && c || d && e || f;
```

The rule reports the complete offending logical expression and does not provide an automatic fix.
