/** @type {import('tailwindcss').Config} */
import typography from "@tailwindcss/typography";
import forms from "@tailwindcss/forms";
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f1f7fd",
          100: "#dfedfa",
          200: "#c6dff7",
          300: "#8bc1ef",
          400: "#70afea",
          500: "#4f91e2",
          600: "#3a76d6",
          700: "#3162c4",
          800: "#2e509f",
          900: "#2a467e",
          950: "#1e2c4d",
        },
      },
    },
  },
  plugins: [typography, forms],
};
