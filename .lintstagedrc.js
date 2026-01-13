export default {
  "*.{js,ts,vue}": [
    "eslint --fix",
    () => "pnpm run typecheck", // Run typecheck on whole project, not per file
  ],
};
