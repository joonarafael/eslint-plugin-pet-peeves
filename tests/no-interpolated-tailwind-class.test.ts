import { RuleTester } from "eslint";
import tseslint from "typescript-eslint";

import rule from "../src/rules/no-interpolated-tailwind-class.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
    sourceType: "module",
  },
});

ruleTester.run("no-interpolated-tailwind-class", rule, {
  valid: [
    `<div className="flex bg-primary" />`,
    `<div className={\`flex bg-primary\`} />`,
    '<div className={cn(`\n  flex w-full\n`, active && "bg-primary")} />',
    `<div className={cn("flex", active ? "bg-primary" : "bg-muted")} />`,
    `<div className={cn("flex", active && "bg-primary")} />`,
    'const rootClassName = cn(font.variable, "bg-background");',
    "const rootClassName = `bg-background`;",
    `<div className={styles.button} />`,
    `<div className="flex" title={\`Hello \${name}\`} />`,
    "const classes = `${font.variable} bg-background`; <div className={classes} />;",
    '<div className={cn({ "bg-primary": `mode-${mode}` })} />',
    '<div className={`bg-${color}` ? "bg-primary" : "bg-muted"} />',
    "<div className={format(`flex ${active}`)} />",
    "<div className={tw`flex bg-primary`} />",
    "<div style={css`color: ${color}`} />",
    "function Button({ title = `flex ${size}` }) { return title; }",
    "props[className] = `flex ${active}`;",
    'const rootClassName = items.map((item) => `flex ${item}`).join(" ");',
    `<div className={"flex " + (active ? "bg-primary" : "bg-muted")} />`,
    {
      code: "<div className={cn(`flex ${active}`)} />",
      options: [{ callees: [] }],
    },
    {
      code: "<div className={cn(`flex ${active}`)} />",
      options: [{ callees: ["cva"] }],
    },
  ],
  invalid: [
    {
      code: '<div className={`flex ${active ? "bg-primary" : "bg-muted"}`} />',
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "const rootClassName = `${font.variable} bg-background`;",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "export const rootClassName = `${font.variable} bg-background`;",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "const rootClassName = `${a} ${b}`;",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: '<div className={cn(`flex ${active ? "bg-primary" : "bg-muted"}`)} />',
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div className={cn(`p-${a}`, `text-${b}`)} />",
      errors: [
        { messageId: "interpolatedClass" },
        { messageId: "interpolatedClass" },
      ],
    },
    {
      code: "<div className={clsx(`flex ${active}`)} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div className={classnames(`flex ${active}`)} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div className={twMerge(`flex ${active}`)} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div className={cn({ [`bg-${color}`]: active })} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: '<div className={cn(["flex", `p-${size}`])} />',
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: '<div className={cn(...["flex", `p-${size}`])} />',
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div className={active && `bg-${color}`} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div className={maybeClass ?? `bg-${color}`} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: '<div className={active ? `bg-${color}` : "bg-muted"} />',
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: '<div className={`flex ${active ? `bg-${color}` : "bg-muted"}`} />',
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div class={`flex ${active}`} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<Body rootClassName={`${font.variable} bg-background`} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "const props = { className: `flex ${active}`, title: `Item ${active}` };",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "const props = { rootClassName: `flex ${active}` };",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "let rootClassName; rootClassName = `${font.variable} bg-background`;",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "props.rootClassName = `${font.variable} bg-background`;",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: 'props["className"] = `flex ${active}`;',
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "function Button({ className = `flex ${size}` }) { return className; }",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "function Button({ className: label = `flex ${size}` }) { return label; }",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div className={tw`flex ${active}`} />",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "async function load() { const rootClassName = await `${font.variable} bg-background`; return rootClassName; }",
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "const rootClassName = `${font.variable} bg-background` as string;",
      languageOptions: {
        parser: tseslint.parser,
      },
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<div className={`flex ${active}`} />",
      options: [{ callees: [] }],
      errors: [{ messageId: "interpolatedClass" }],
    },
    {
      code: "<>\n  <div className={cn(`flex ${active}`)} />\n  <div className={cva(`flex ${active}`)} />\n</>",
      options: [{ callees: ["cva"] }],
      errors: [{ messageId: "interpolatedClass" }],
    },
  ],
});
