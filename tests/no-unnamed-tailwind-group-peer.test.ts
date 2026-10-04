import { RuleTester } from "eslint";

import rule from "../src/rules/no-unnamed-tailwind-group-peer.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
    sourceType: "module",
  },
});

ruleTester.run("no-unnamed-tailwind-group-peer", rule, {
  valid: [
    `<div className="group/item"><span className="group-hover/item:underline" /></div>`,
    `<><input className="peer/toggle" /><div className="peer-checked/toggle:block" /></>`,
    `<div className="group-card" />`,
    {
      code: `<div className="group"><span className="group-hover:underline" /></div>`,
      options: [{ kinds: [] }],
    },
    {
      code: `<><input className="peer" /><div className="peer-checked:block" /></>`,
      options: [{ kinds: ["group"] }],
    },
    `export function Row() {
      return <div className={cn("group/nav", "flex")} />;
    }`,
    {
      code: `<div className="tw:group/sidebar" />`,
      options: [{ prefix: "tw:" }],
    },
  ],
  invalid: [
    {
      code: `<div className="group" />`,
      errors: [{ messageId: "unnamedMarker" }],
    },
    {
      code: `<div className="group/item"><span className="group-hover:underline" /></div>`,
      errors: [{ messageId: "unnamedConsumer" }],
    },
    {
      code: `<><input className="peer/toggle" /><div className="peer-checked:block" /></>`,
      errors: [{ messageId: "unnamedConsumer" }],
    },
    {
      code: `<input className="peer" />`,
      errors: [{ messageId: "unnamedMarker" }],
    },
  ],
});
