import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.js"],
    rules: {
      "no-unused-vars": "error",
    },
  },
]);