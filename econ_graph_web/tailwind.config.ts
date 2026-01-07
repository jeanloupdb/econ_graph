import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "radial-gradient-blue":
          "radial-gradient(circle at 50% 50%, theme(colors.blue.900 / 0.2), transparent 40%)",
        "grid-zinc-800":
          "linear-gradient(theme(colors.zinc.800 / 0.5) 1px, transparent 1px), linear-gradient(to right, theme(colors.zinc.800 / 0.5) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-size": "2rem 2rem",
      },
    },
  },
  plugins: [],
};
export default config;
