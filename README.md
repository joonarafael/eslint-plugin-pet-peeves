# eslint-plugin-pet-peeves

A small ESLint plugin for opinionated readability rules.

## Installation

```sh
npm install --save-dev eslint-plugin-pet-peeves
```

Add the plugin and whichever rules you want to an ESLint flat configuration:

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

## Rules

- [`max-operands`](docs/rules/max-operands.md) limits all operands in a connected logical expression.
- [`max-same-operator-operands`](docs/rules/max-same-operator-operands.md) limits operands in each same-operator logical chain.
- [`padding-between-large-jsx-elements`](docs/rules/padding-between-large-jsx-elements.md) requires a blank line between adjacent large JSX elements and fragments.

The logical-expression rules support `&&`, `||`, and `??`.

## Development

```sh
npm install
npm test
```

`npm run build` compiles the TypeScript source to JavaScript and declarations in `dist`.
