/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0A0A0A",
          900: "#0F0F0F",
          800: "#171717",
          700: "#262626",
          600: "#3F3F3F",
          400: "#737373",
          200: "#D4D4D4",
        },
        paper: {
          DEFAULT: "#FFFFFF",
          dim: "#F5F5F4",
          line: "#E5E5E5",
        },
        brass: {
          DEFAULT: "#F5A623",
          light: "#FBBF24",
          dark: "#D97706",
        },
        ok: "#16A34A",
        warn: "#DC2626",
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "Georgia", "serif"],
        sans: ["'Inter'", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
      maxWidth: {
        prose: "68ch",
      },
    },
  },
  plugins: [],
};
