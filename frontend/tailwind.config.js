/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        clicon: {
          primary: '#FA8232',
          secondary: '#2DA5F3',
          darkBlue: '#1B6392',
          warning: '#EBC80C',
          danger: '#EE5858',
          slate: '#191C1F',
          muted: '#5F6C72',
          border: '#E4E7E9',
          surface: '#F2F4F5'
        }
      },
      fontFamily: {
        sans: ['Manrope', 'Public Sans', 'system-ui', 'sans-serif'],
        display: ['Syne', 'Manrope', 'sans-serif']
      },
      boxShadow: {
        card: '0 8px 24px rgba(25, 28, 31, 0.08)'
      }
    }
  },
  plugins: []
};
