# Disallow interpolated Tailwind class strings (`no-interpolated-tailwind-class`)

Disallows template literals that contain `${}` when they are Tailwind class strings. Compose the classes with `cn()` (or another configured callee) instead.

Static templates with no expressions are allowed.

## Why

An interpolated class string hides the utilities from Tailwind's source scanner, and it is harder to scan than separate arguments:

```jsx
<div className={`flex ${active ? "bg-primary" : "bg-muted"}`} />
```

`cn()` keeps each class intact:

```jsx
<div className={cn("flex", active ? "bg-primary" : "bg-muted")} />
```

A partial fragment such as `bg-${color}` is still invisible to Tailwind inside `cn()`. Pass a complete class from each branch (`color === "primary" && "bg-primary"`).

## Options

```js
{
  "pet-peeves/no-interpolated-tailwind-class": [
    "error",
    { callees: ["cn", "clsx", "classnames", "twMerge"] },
  ],
}
```

- `callees` — functions whose arguments are class strings, same defaults as the other Tailwind rules: `["cn", "clsx", "classnames", "twMerge"]`. Only identifier callees are recognized (`cn(...)`, not `utils.cn(...)`). Setting `callees` replaces the default list. An empty array disables callee scanning; `class` / `className` are still checked.

## What is checked

- JSX `class` and `className` values.
- Other JSX props, object properties, parameters, variables, and assignments whose name is `className`, `classNames`, or ends with `ClassName` / `ClassNames` (for example `rootClassName`).
- Arguments of configured callees, including nested arrays, `&&` / `||` / `??`, ternary branches, and clsx-style object keys.
- Tagged templates in those same positions.

clsx object values are conditions, not class names, so they are ignored. The test of a ternary is ignored. A template nested inside another interpolated template is not reported on its own; the outer template is.

## Examples

Valid:

```jsx
<div className={cn("flex", active ? "bg-primary" : "bg-muted")} />
```

```jsx
<div
  className={cn(
    `
      flex w-full
    `,
    active && "bg-primary",
  )}
/>
```

```js
const rootClassName = cn(font.variable, "bg-background");
```

Invalid:

```jsx
<div className={`flex ${active ? "bg-primary" : "bg-muted"}`} />
```

```js
const rootClassName = `${font.variable} bg-background`;
```

```jsx
<div className={cn(`flex ${active ? "bg-primary" : "bg-muted"}`)} />
```

## Limitations

The rule looks at the template's position. It does not follow references, so this is silent:

```jsx
const classes = `${font.variable} bg-background`;
return <div className={classes} />;
```

Name that binding `className` / `rootClassName`, or put the template on the attribute.

Callbacks and unknown functions are not entered. String concatenation with `+` is not checked.

## When not to use it

Turn it off if you intentionally build class names with interpolation and safelist them, or if you do not compose classes with `cn()` / `clsx`.
