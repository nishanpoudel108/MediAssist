/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f1f5ef',
          100: '#e1eadc',
          200: '#cedbc8',
          300: '#b8c7b1',
          400: '#91aa91',
          500: '#6b8f71',
          600: '#5d7d63',
          700: '#4d6953',
          800: '#3f5143',
          900: '#303f34',
        },
        teal: {
          500: '#8aa58a',
          600: '#6b8f71',
        },
        slate: {
          50: '#f5f5f0',
          100: '#eef0eb',
          200: '#dde3d9',
          300: '#c7d0c2',
          400: '#9ca99d',
          500: '#718074',
          600: '#58675b',
          700: '#4b5d4f',
          800: '#3f5143',
          900: '#344437',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
