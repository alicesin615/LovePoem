/** @type {import('tailwindcss').Config} */
import { nextui } from "@nextui-org/react";

module.exports = {
  content: [
    "./src/pages/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@nextui-org/theme/dist/**/*.{html,tsx,jsx,ts,js,mdx,mjs}",
  ],

  theme: {
    extend: {},
  },
  darkMode: "class",
  plugins: [nextui()],
};
