/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'ui-sans-serif', 'system-ui'],
        display: ['Manrope', 'DM Sans', 'ui-sans-serif']
      },
      colors: {
        circleup: {
          purple: '#6256d9',
          ink: '#25283a',
          muted: '#898da2',
          lavender: '#f0efff'
        }
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
