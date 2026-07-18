/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        manila: "#E8DFC8",
        ink: "#1C1A17",
        cork: "#A87C4F",
        "cork-dark": "#8B6540",
        evidence: "#A6241D",
        steel: "#3B4A5A",
        fog: "#706A5C",
      },
      fontFamily: {
        display: ["Newsreader", "serif"],
        body: ["IBM Plex Sans", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
    },
  },
  plugins: [],
};