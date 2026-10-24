/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        offwhite: "#F9F8F6",
        dark: {
          DEFAULT: "#2D2D2D",
          soft: "#4A4A4A",
          muted: "#7A7672",
        },
        accent: {
          DEFAULT: "#C68B59",
          light: "#D89E6E",
          dark: "#A87040",
          soft: "rgba(198, 139, 89, 0.12)",
          border: "rgba(198, 139, 89, 0.25)",
        },
        surface: "#FFFFFF",
        card: "#FFFFFF",
        border: "#EAE6E1",
      },
    },
  },
  plugins: [],
};
