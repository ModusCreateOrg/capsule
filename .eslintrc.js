const eslintNativeRulesDisabledByPrettier = {
  "array-bracket-newline": "off",
  "array-bracket-spacing": "off",
  "array-element-newline": "off",
  "arrow-parens": "off",
  "arrow-spacing": "off",
  "block-spacing": "off",
  "brace-style": "off",
  "comma-dangle": "off",
  "comma-spacing": "off",
  "comma-style": "off",
  "computed-property-spacing": "off",
  "dot-location": "off",
  "eol-last": "off",
  "func-call-spacing": "off",
  "function-paren-newline": "off",
  "generator-star-spacing": "off",
  "implicit-arrow-linebreak": "off",
  indent: "off",
  "jsx-quotes": "off",
  "key-spacing": "off",
  "keyword-spacing": "off",
  "multiline-ternary": "off",
  "new-parens": "off",
  "newline-per-chained-call": "off",
  "no-extra-parens": "off",
  "no-extra-semi": "off",
  "no-floating-decimal": "off",
  "no-mixed-spaces-and-tabs": "off",
  "no-multi-spaces": "off",
  "no-multiple-empty-lines": "off",
  "no-trailing-spaces": "off",
  "no-whitespace-before-property": "off",
  "nonblock-statement-body-position": "off",
  "object-curly-newline": "off",
  "object-curly-spacing": "off",
  "object-property-newline": "off",
  "one-var-declaration-per-line": "off",
  "operator-linebreak": "off",
  "padded-blocks": "off",
  "quote-props": "off",
  "rest-spread-spacing": "off",
  semi: "off",
  "semi-spacing": "off",
  "semi-style": "off",
  "space-before-blocks": "off",
  "space-before-function-paren": "off",
  "space-in-parens": "off",
  "space-infix-ops": "off",
  "space-unary-ops": "off",
  "switch-colon-spacing": "off",
  "template-curly-spacing": "off",
  "template-tag-spacing": "off",
  "unicode-bom": "off",
  "wrap-iife": "off",
  "wrap-regex": "off",
  "yield-star-spacing": "off"
};

const eslintNativeRulesRestrictedByPrettier = {
  curly: ["error", "all"],
  "lines-around-comment": [
    "error",
    {
      afterBlockComment: false,
      afterLineComment: false,
      allowArrayEnd: true,
      allowArrayStart: true,
      allowBlockEnd: true,
      allowBlockStart: true,
      allowObjectEnd: true,
      allowObjectStart: true,
      beforeBlockComment: true
    }
  ],
  "max-len": "off",
  "no-confusing-arrow": "off",
  "no-mixed-operators": [
    "error",
    {
      groups: [["&&", "||"]]
    }
  ],
  "no-tabs": "error",
  "no-unexpected-multiline": "error",
  quotes: "off"
};

const eslintPluginPrettierRules = {
  "prettier/prettier": "error"
};

module.exports = {
  env: {
    es6: true,
    node: true
  },
  extends: ["eslint:recommended"],
  parserOptions: {
    ecmaVersion: 9
  },
  plugins: ["prettier"],
  rules: {
    ...eslintNativeRulesDisabledByPrettier,
    ...eslintNativeRulesRestrictedByPrettier,
    ...eslintPluginPrettierRules,
    "no-console": "off"
  }
};
