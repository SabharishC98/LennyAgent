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
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          800: '#1e1e1e',
          850: '#181818',
          900: '#121212',
          950: '#0a0a0a',
        },
        monochrome: {
          light: '#f5f5f5',
          DEFAULT: '#f5f5f5',
          dark: '#e5e5e5',
        },
      },
    },
  },
  plugins: [],
};
