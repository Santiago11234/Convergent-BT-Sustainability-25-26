/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8FAA7C',
          light: '#A8BF96',
          dark: '#4A5D3F',
        },
        background: {
          DEFAULT: '#F5F1E8',
          light: '#FAF8F3',
        },
        accent: {
          brown: '#8B4F47',
          tan: '#C4A57F',
        },
      },
    },
  },
  plugins: [],
}

