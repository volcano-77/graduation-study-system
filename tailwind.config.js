/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FFF8F0',
          100: '#FEF3E6',
          200: '#FDE9D1',
          300: '#FBD5B5',
          400: '#F9C199',
          500: '#F7AD7D',
          600: '#E89463',
          700: '#C6774A',
          800: '#A45A32',
          900: '#823D1A',
        },
      },
    },
  },
  plugins: [],
}