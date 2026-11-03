import type { Config } from 'tailwindcss';

// "Academy" look: a fresh green for growth, a hint of Stadsbeheer orange as accent, and warm neutrals.
// `slate` is remapped to warm greys so every page picks them up without touching its classes.
const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#effaf3',
          100: '#d9f2e2',
          200: '#b5e4c8',
          300: '#84cfa6',
          400: '#50b47f',
          500: '#2e9963',
          600: '#1f7c4f',
          700: '#1a6442',
          800: '#175036',
          900: '#14422e',
          950: '#0a2519',
        },
        accent: {
          50: '#fff5ee',
          100: '#ffe7d5',
          200: '#fecbaa',
          400: '#f88d4f',
          500: '#f26b21',
          600: '#df5313',
          700: '#b93e10',
        },
        slate: {
          50: '#fafaf8',
          100: '#f4f4f1',
          200: '#e7e6e1',
          300: '#d6d4cc',
          400: '#a8a59b',
          500: '#79766c',
          600: '#5c5a51',
          700: '#46443d',
          800: '#2d2c27',
          900: '#1d1c19',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(29, 28, 25, 0.04), 0 1px 3px rgba(29, 28, 25, 0.06)',
        lift: '0 4px 16px rgba(29, 28, 25, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
