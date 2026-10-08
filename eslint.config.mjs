import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

const config = [
  ...nextCoreWebVitals,
  {
    ignores: [".next/**", "out/**", "build/**", "node_modules/**", "next-env.d.ts", ".sdk-check-*/**"],
  },
  {
    // New in eslint-plugin-react-hooks 7 (eslint-config-next 16). They flag patterns that are
    // React Compiler-unfriendly but correct today: setState in an effect, and reading refs during
    // render in the animation code. Warn until those components are refactored.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
];

export default config;
