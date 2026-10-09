/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lenny: {
          blue: '#1a56db',
          dark: '#111827',
        },
      },
    },
  },
  plugins: [],
};
