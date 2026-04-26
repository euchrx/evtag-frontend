export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        evtag: {
          primary: '#3C0061',
          dark: '#26003D',
          light: '#F4E9FA',
          accent: '#8B2FC9',
          bg: '#F7F5FA',
          text: '#171123',
          muted: '#6B6275',
          border: '#E8DFF0',
        },
      },
    },
  },
  plugins: [],
};