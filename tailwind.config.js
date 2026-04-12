/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        'snap-teal':     '#00C9A7',
        'snap-ink':      'var(--snap-bg)',
        'snap-ink-mid':  'var(--snap-bg-mid)',
        'snap-ink-soft': 'var(--snap-bg-soft)',
        'snap-pass':     '#00D68F',
        'snap-fail':     '#FF4D4F',
        'snap-amber':    '#FFB340',
        'snap-white':    'var(--snap-text)',
        'snap-gray':     '#F4F6F8',
      },
      fontFamily: {
        fraunces: ['var(--font-fraunces)', 'serif'],
        grotesk:  ['var(--font-space-grotesk)', 'sans-serif'],
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
