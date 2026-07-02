/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#0F1729',
          800: '#161F36',
          700: '#1E2943',
          600: '#2A3654',
        },
        paper: '#FAF9F6',
        parchment: '#F3F0E8',
        amber: {
          DEFAULT: '#E8A33D',
          light: '#F5C878',
          dark: '#C7841F',
        },
        slateink: {
          DEFAULT: '#5B6478',
          light: '#8891A3',
        },
        signal: {
          resolved: '#2F9E6E',
          urgent: '#D64545',
          progress: '#3B7FC4',
          pending: '#8B5FBF',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        body: ['"Inter"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
