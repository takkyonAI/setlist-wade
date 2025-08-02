/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'neon-green': 'oklch(0.8 0.25 127)',
        'neon-blue': 'oklch(0.7 0.3 200)',
        'neon-purple': 'oklch(0.75 0.35 280)',
        'neon-yellow': 'oklch(0.85 0.3 60)',
        'neon-pink': 'oklch(0.8 0.4 330)',
        'neon-cyan': 'oklch(0.75 0.3 180)',
      },
    },
  },
  plugins: [],
}