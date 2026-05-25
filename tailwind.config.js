/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
    "./lib/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
      },
      boxShadow: {
        soft: "0 10px 25px rgba(15, 23, 42, 0.08)",
      },
    },
  },
  plugins: [],
};
