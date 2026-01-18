// @ts-check
import antfu from "@antfu/eslint-config";

export default antfu({
  // Enable TypeScript and Vue support
  typescript: true,
  vue: true,

  // Enable stylistic formatting rules
  stylistic: {
    indent: 2,
    quotes: "double",
    semi: true,
  },

  ignores: [
    "project-context.md",
  ],

  // Project-specific rules
  rules: {
    // Code quality and readability
    "max-len": ["warn", {
      code: 100,
      ignoreComments: true,
      ignoreTrailingComments: true,
      ignoreUrls: true,
      ignoreStrings: true,
      ignoreTemplateLiterals: true,
      ignoreRegExpLiterals: true,
      // Ignore long SVG path data in Vue templates, e.g. <path d="...">
      ignorePattern: "d=\"[^\"]+\"",
    }],
    "max-depth": ["warn", 4],
    "camelcase": ["warn"],

    // Import rules
    "perfectionist/sort-imports": "off",
    "ts/no-namespace": "error",

    // Function and arrow function rules
    "antfu/if-newline": "off",
    "arrow-body-style": ["error", "as-needed", { requireReturnForObjectLiteral: false }],
    "func-style": ["error", "declaration", { allowArrowFunctions: true }],
    "prefer-arrow-callback": ["error", { allowNamedFunctions: true }],
    "object-shorthand": "off",

    // Style rules
    "style/brace-style": ["error", "1tbs", { allowSingleLine: true }],

    // JSDoc rules (selective)
    "jsdoc/check-param-names": "error",
    "jsdoc/check-tag-names": "error",
    "jsdoc/no-types": "error", // Prefer TypeScript types
    "jsdoc/require-param": "warn",
    "jsdoc/require-returns": "warn",

    // Vue-specific rules
    "vue/attribute-hyphenation": "off",
    "vue/block-order": ["error", { order: ["script", "template", "style"] }],
    "vue/brace-style": ["error", "1tbs", { allowSingleLine: true }],
    "vue/component-name-in-template-casing": ["error", "PascalCase"],
    "vue/max-attributes-per-line": ["error", {
      singleline: { max: 2 },
      multiline: { max: 1 },
    }],
    "vue/mustache-interpolation-spacing": ["warn", "always"],
    "vue/no-async-in-computed-properties": "error",
    "vue/no-dupe-keys": "error",
    "vue/no-mutating-props": "error",
    "vue/no-parsing-error": "error",
    "vue/no-side-effects-in-computed-properties": "error",
    "vue/no-spaces-around-equal-signs-in-attribute": ["error"],
    "vue/no-unused-components": "error",
    "vue/no-unused-vars": "error",
    "vue/no-use-v-if-with-v-for": "error",
    "vue/no-v-html": "warn",
    "vue/object-shorthand": "off",
    "vue/one-component-per-file": "off",
    "vue/require-default-prop": "off",
    "vue/require-prop-types": "error",
    "vue/require-v-for-key": "error",
    "vue/return-in-computed-property": "error",
    "vue/v-on-event-hyphenation": "off",
    "vue/v-slot-style": "off",
    "vue/valid-v-else": "error",
    "vue/valid-v-else-if": "error",
    "vue/valid-v-if": "error",
  },
});
