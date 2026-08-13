/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2fb",
          100: "#d9e2f3",
          200: "#b3c5e7",
          400: "#5578b0",
          500: "#2E5395",
          600: "#1F3864",
          700: "#16294A",
          900: "#0d1a30",
        },
        success: { 500: "#2E7D32", 100: "#C6EFCE" },
        warning: { 500: "#E9A400", 100: "#FFEB9C" },
        danger: { 500: "#C62828", 100: "#FFC7CE" },
      },
    },
  },
  plugins: [],
};
