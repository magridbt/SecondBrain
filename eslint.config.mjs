import nextConfig from "eslint-config-next";
import coreWebVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "public/**",
      ".aios-core/**",
    ],
  },
  ...nextConfig,
  ...coreWebVitals,
  {
    rules: {
      // Allow common pattern of initializing state in useEffect (localStorage, etc.)
      "react-hooks/set-state-in-effect": "off",
      // Allow anonymous default exports in config files
      "import/no-anonymous-default-export": "off",
    },
  },
];

export default eslintConfig;
