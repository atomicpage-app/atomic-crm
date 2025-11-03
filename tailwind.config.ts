import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/app/**/*.{ts,tsx}", "./src/components/**/*.{ts,tsx}", "./src/lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f2f7ff",
          100: "#dbe8ff",
          200: "#b2ceff",
          300: "#89b4ff",
          400: "#5f9bff",
          500: "#317fff",
          600: "#1f60d6",
          700: "#1546a3",
          800: "#0d2d70",
          900: "#04163d"
        }
      }
    }
  },
  plugins: []
};

export default config;
