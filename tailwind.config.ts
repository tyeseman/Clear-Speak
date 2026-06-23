import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./data/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        leaf: "#2f6f5e",
        skysoft: "#d8ecf3",
        warm: "#f6c66f",
        coral: "#d96d5b"
      },
      boxShadow: {
        soft: "0 12px 30px rgba(31, 41, 51, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
