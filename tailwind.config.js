/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        lexend: ["var(--font-lexend)", "sans-serif"],
        source: ["var(--font-source)", "sans-serif"],
      },
      colors: {
        "cekdulu-bg": "#EEF2F7",
        "cekdulu-surface": "#FFFFFF",
        "cekdulu-navy": "#0F172A",
        "cekdulu-blue": "#2563EB",
        "cekdulu-cta": "#EA580C",
        "cekdulu-cta-dark": "#C2410C",
        ink: "#172033",
      },
      boxShadow: {
        soft: "0 10px 25px rgba(15, 23, 42, 0.08)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 220ms ease-out",
      },
    },
  },
  plugins: [],
};
