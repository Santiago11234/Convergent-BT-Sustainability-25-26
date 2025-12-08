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
          DEFAULT: '#4A6B3C', // Dark green for buttons, nav bar
          light: '#A8BF96', // Light green for tab bar
          dark: '#2D4A22', // Darker green
          bright: '#5A8A4A', // Medium green
        },
        background: {
          DEFAULT: '#F5F1E8', // Main beige background
          light: '#FAF8F3', // Lighter beige for cards
        },
        accent: {
          brown: '#563D1F', // Brown for inactive icons and received messages
          tan: '#C4A57F', // Khaki/tan for filter tags
          darkBrown: '#6B3A35', // Darker brown
          original: '#8B4F47', // Original brown for filter tags
        },
      },
    },
  },
  plugins: [],
}

