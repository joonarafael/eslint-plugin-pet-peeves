import assert from "node:assert/strict";
import test from "node:test";

import { parseClassToken } from "../src/rules/tailwind-group-peer.js";

void test("parseClassToken treats group-card as neither marker nor consumer", () => {
  const parsed = parseClassToken("group-card", "");
  assert.deepEqual(parsed.markers, []);
  assert.deepEqual(parsed.consumers, []);
});

void test("parseClassToken parses named marker and consumer", () => {
  const parsed = parseClassToken("group/item", "");
  assert.deepEqual(parsed.markers, [{ kind: "group", name: "item" }]);
  assert.deepEqual(parsed.consumers, []);

  const hover = parseClassToken("group-hover/item:underline", "");
  assert.deepEqual(hover.markers, []);
  assert.deepEqual(hover.consumers, [{ kind: "group", name: "item" }]);
});

void test("parseClassToken parses stacked variants with arbitrary group data", () => {
  const parsed = parseClassToken(
    "md:group-data-[state=open]/nav:underline",
    "",
  );
  assert.deepEqual(parsed.consumers, [{ kind: "group", name: "nav" }]);
});

void test("parseClassToken strips prefix before parsing", () => {
  const parsed = parseClassToken("tw:group/sidebar", "tw:");
  assert.deepEqual(parsed.markers, [{ kind: "group", name: "sidebar" }]);
});

void test("parseClassToken ignores tokens without configured prefix", () => {
  const parsed = parseClassToken("group/item", "tw:");
  assert.deepEqual(parsed.markers, []);
});

void test("parseClassToken parses peer consumer with name", () => {
  const parsed = parseClassToken("peer-checked/toggle:block", "");
  assert.deepEqual(parsed.consumers, [{ kind: "peer", name: "toggle" }]);
});
