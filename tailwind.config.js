/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['"IBM Plex Sans"', '-apple-system', 'sans-serif'],
      },
      colors: {
        cream:   '#faf6ec',
        forest:  '#1f3a2c',
        amber:   '#b07a1f',
        paper:   '#fdfaf2',
        charcoal:'#1a1a18',
      },
    },
  },
  plugins: [],
};
