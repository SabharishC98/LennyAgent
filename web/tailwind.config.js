/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      colors: {
        surface: {
          50: '#faf8f5',
          100: '#f4efe8',
          200: '#e7ded2',
          800: '#1e1c19',
          850: '#161513',
          900: '#11100e',
          950: '#0c0b0a',
        },
        accent: {
          DEFAULT: '#d97706', // warm amber
          light: '#f59e0b',
          dark: '#b45309',
        },
        olive: {
          DEFAULT: '#84937d',
          dark: '#586952',
        }
      },
    },
  },
  plugins: [],
};
