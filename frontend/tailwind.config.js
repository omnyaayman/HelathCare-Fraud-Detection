/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: '#0d1117',
        surface: '#161b22',
        border: '#30363d',
        primary: '#58a6ff',
        secondary: '#79c0ff',
        accent: '#f78166',
        textPrimary: '#c9d1d9',
        textSecondary: '#8b949e',
        success: '#3fb950',
        danger: '#f85149',
        warning: '#d29922',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Helvetica Neue', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
}