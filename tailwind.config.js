/** @type {import('tailwindcss').Config} */
module.exports = {
  content:[
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        eve: {
          bg: '#040608',
          window: '#0d1218',
          panel: '#151b23',
          border: '#2a3644',
          accent: '#4786a3',
          text: '#a6b5c5',
          highlight: '#e0eaf5',
          cyan: '#50c8e8',
          red: '#d9534f',
          blue: '#06b6d4',
          lgreen: '#10b981',
          lblue: '#22d3ee',
          llgreen: '#14b8a6',
          pink: '#f43f5e2',
          lyellow: '#f59e0b'
        }
      },
      fontFamily: {
        sans:['"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['Consolas', '"Courier New"', 'monospace']
      }
    },
  },
  plugins:[],
}
