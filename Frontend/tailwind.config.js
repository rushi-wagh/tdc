/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        burgundy: "#641526",
        wine: "#47101D",
        cream: "#FFF8F1",
        ivory: "#F8EFE7",
        blush: "#F9DED8",
        gold: "#C69A54",
        ink: "#30252A",
        muted: "#806F72",
      },
      boxShadow: {
        soft: "0 18px 45px rgba(71, 16, 29, 0.08)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
