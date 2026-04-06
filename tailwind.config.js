/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Bloomberg-terminal inspired dark palette
        terminal: {
          bg: "#0a0a0f",
          panel: "#111118",
          border: "#1e1e2e",
          header: "#0d0d14",
          accent: "#f59e0b",   // amber — primary action
          buy: "#22c55e",      // green
          sell: "#ef4444",     // red
          text: {
            primary: "#e2e8f0",
            secondary: "#94a3b8",
            muted: "#475569",
          },
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "Cascadia Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "blink": "blink 1s step-start infinite",
      },
      keyframes: {
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
