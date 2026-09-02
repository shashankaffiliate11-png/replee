/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#10192E",
          900: "#152140",
          800: "#1C2C52",
          700: "#26386A",
          600: "#33477F",
          400: "#6B7CA3",
          200: "#C3CBDD",
        },
        paper: {
          DEFAULT: "#FAF7F0",
          dim: "#F1ECE0",
          line: "#E4DCC8",
        },
        brass: {
          DEFAULT: "#A9762F",
          light: "#C79445",
          dark: "#7E5A22",
        },
        ok: "#3F6B4F",
        warn: "#A64B3A",
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
