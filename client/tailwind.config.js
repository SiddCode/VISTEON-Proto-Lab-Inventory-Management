/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        visteon: {
          orange: '#F58220',
          'orange-hover': '#DF7215',
          'orange-light': '#FFF5EB',
          'orange-dark': '#C96311',
          charcoal: '#20252B',
          'charcoal-light': '#2A3038',
          'charcoal-dark': '#171B20',
          bg: '#F3F4F6',
          border: '#E5E7EB',
          text: '#20252B',
        },
      },
    },
  },
  plugins: [],
}
