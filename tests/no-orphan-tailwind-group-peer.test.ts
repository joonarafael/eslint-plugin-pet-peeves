import { RuleTester } from "eslint";

import rule from "../src/rules/no-orphan-tailwind-group-peer.js";

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
    sourceType: "module",
  },
});

ruleTester.run("no-orphan-tailwind-group-peer", rule, {
  valid: [
    `<div className="group/item"><span className="group-hover/item:underline" /></div>`,
    `<>
      <input className="peer/toggle" />
      <div className="peer-checked/toggle:block" />
    </>`,
    {
      code: `<span className="group-hover/item:underline" />`,
      options: [{ kinds: [] }],
    },
    {
      code: `<><input className="peer/toggle" /><div className="peer-checked/toggle:block" /></>`,
      options: [{ kinds: ["peer"] }],
    },
  ],
  invalid: [
    {
      code: `<span className="group-hover/item:underline" />`,
      errors: [{ messageId: "orphanGroupConsumer" }],
    },
    {
      code: `<div className="group/other"><span className="group-hover/item:underline" /></div>`,
      errors: [{ messageId: "orphanGroupConsumer" }],
    },
    {
      code: `<div className="peer-checked/toggle:block" />`,
      errors: [{ messageId: "orphanPeerConsumer" }],
    },
    {
      code: `<><input className="peer/toggle" /><div className="peer-checked/other:block" /></>`,
      errors: [{ messageId: "orphanPeerConsumer" }],
    },
    {
      code: `<><div className="group/item"><span className="group-hover/item:underline" /></div><span className="group-hover/item:underline" /></>`,
      errors: [{ messageId: "orphanGroupConsumer" }],
    },
    {
      code: `<div className="group/item group-hover/item:underline" />`,
      errors: [{ messageId: "orphanGroupConsumer" }],
    },
  ],
});
