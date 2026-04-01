/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'snap-teal':     '#00C9A7',
        'snap-ink':      '#0A0F1A',
        'snap-ink-mid':  '#111827',
        'snap-ink-soft': '#1C2840',
        'snap-pass':     '#00D68F',
        'snap-fail':     '#FF4D4F',
        'snap-amber':    '#FFB340',
        'snap-white':    '#FAFAF8',
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
