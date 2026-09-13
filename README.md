# eslint-plugin-pet-peeves

[![npm version](https://img.shields.io/npm/v/eslint-plugin-pet-peeves)](https://www.npmjs.com/package/eslint-plugin-pet-peeves)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Opinionated ESLint rules for JavaScript and JSX readability. Some rules might split opinions.

These are not best practices or correctness checks.

They are purely opinionated readability preferences that concern me. If you or your teammates disagree, that's expected. Don't enable the rule.

Pick the peeves you actually have.

## Install

Requires [ESLint](https://eslint.org) 9 or 10 (flat config), or [Oxlint](https://oxc.rs/docs/guide/usage/linter) with JS plugins.

```sh
npm install --save-dev eslint-plugin-pet-peeves
```

## Usage

### ESLint

```js
import petPeeves from "eslint-plugin-pet-peeves";

export default [
  {
    plugins: {
      "pet-peeves": petPeeves,
    },
    rules: {
      "pet-peeves/max-operands": ["error", { max: 8 }],
      "pet-peeves/max-same-operator-operands": ["error", { max: 4 }],
      "pet-peeves/padding-between-large-jsx-elements": [
        "error",
        { minLines: 8 },
      ],
    },
  },
];
```

### Oxlint

Oxlint can load this package as a [JS plugin](https://oxc.rs/docs/guide/usage/linter/js-plugins) (alpha). Add the package to `jsPlugins` and enable the rules you want.

`.oxlintrc.json`:

```json
{
  "jsPlugins": ["eslint-plugin-pet-peeves"],
  "rules": {
    "pet-peeves/max-operands": ["error", { "max": 8 }],
    "pet-peeves/max-same-operator-operands": ["error", { "max": 4 }],
    "pet-peeves/padding-between-large-jsx-elements": [
      "error",
      { "minLines": 8 }
    ]
  }
}
```

`oxlint.config.ts`:

```ts
import { defineConfig } from "oxlint";

export default defineConfig({
  jsPlugins: ["eslint-plugin-pet-peeves"],
  rules: {
    "pet-peeves/max-operands": ["error", { max: 8 }],
    "pet-peeves/max-same-operator-operands": ["error", { max: 4 }],
    "pet-peeves/padding-between-large-jsx-elements": ["error", { minLines: 8 }],
  },
});
```

## Rules

- [`max-operands`](docs/rules/max-operands.md) — too many operands in one connected logical expression
- [`max-same-operator-operands`](docs/rules/max-same-operator-operands.md) — too many operands in a single same-operator logical chain
- [`padding-between-large-jsx-elements`](docs/rules/padding-between-large-jsx-elements.md) — adjacent large JSX elements with no blank line (autofix)

Options, examples, and when _not_ to use a rule live in each doc.

## License

[MIT](LICENSE)

## Contributing

Local setup and versioning: [Development](docs/development.md).
