import tseslint from 'typescript-eslint';

export default [
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    rules: {
      "no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];
