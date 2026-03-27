import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#f9f9ff",
        ink: "#171728",
        accent: "#5b63ff",
        accentSoft: "#e6e8ff",
        line: "#d8dcf4",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(64, 72, 120, 0.08)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
    },
  },
  plugins: [],
} satisfies Config;
