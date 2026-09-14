import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// eslint-config-next 16 ya exporta configuraciones planas, así que no hace falta el puente
// FlatCompat de la época de .eslintrc.
const config = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/sw.js",
      "public/swe-worker-*.js",
      "lib/data/metro.ts",
      "lib/data/geo.ts",
    ],
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
];

export default config;
