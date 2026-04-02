/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  safelist: [
    // Dynamic text colours
    'text-bull', 'text-bear', 'text-warn', 'text-ts', 'text-tm', 'text-tp',
    // Dynamic bg colours
    'bg-bull', 'bg-bear', 'bg-warn', 'bg-ts',
    'bg-bull-d', 'bg-bear-d', 'bg-warn-d', 'bg-bg-e', 'bg-bg-s', 'bg-bg-c',
    // Dynamic borders
    'border-bull', 'border-bear', 'border-warn', 'border-ts', 'border-bd',
    // Gradient froms / vias / tos
    'from-bull-d', 'from-bear-d', 'from-warn-d', 'from-bg-s',
    'via-bg-c', 'via-bull', 'via-bear', 'via-warn', 'via-ts',
    'to-bull-d', 'to-bear-d', 'to-warn-d', 'to-bg-s',
    // before: pseudo-element bg (top bar strips on cards)
    'before:bg-bull', 'before:bg-bear', 'before:bg-warn', 'before:bg-ts',
    // Opacity variants used dynamically
    { pattern: /^(bg|border|text)-(bull|bear|warn)\/(6|8|10|12|15|20|25|30|35|40|50)$/ },
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#07080f',
        'bg-s':  '#0d1220',
        'bg-c':  '#111827',
        'bg-h':  '#161f30',
        'bg-e':  '#1c2740',
        bd:      '#1e2d45',
        'bd-x':  '#141e2e',
        tp:      '#e2eaf5',
        ts:      '#6e80a0',
        tm:      '#3d4f68',
        bull:    '#05d09a',
        'bull-d':'#053d2c',
        bear:    '#ef4444',
        'bear-d':'#3d1010',
        warn:    '#f0b429',
        'warn-d':'#3d2a08',
      },
      fontFamily: {
        display: ['"Bebas Neue"',    'sans-serif'],
        mono:    ['"IBM Plex Mono"', 'monospace'],
        sans:    ['"DM Sans"',       'sans-serif'],
      },
      keyframes: {
        pulse2:    { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.2 } },
        fadeUp:    { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'none' } },
        scan:      { '0%': { left: '-100%' }, '100%': { left: '100%' } },
        dataFlash: { '0%': { backgroundColor: 'rgba(240,180,41,.15)' }, '100%': { backgroundColor: 'transparent' } },
        spin:      { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        pulse2:    'pulse2 2s ease-in-out infinite',
        pulseFast: 'pulse2 1.1s ease-in-out infinite',
        fadeUp:    'fadeUp 0.28s ease forwards',
        scan:      'scan 4s linear infinite',
        dataFlash: 'dataFlash 1.2s ease forwards',
        spin:      'spin 0.8s linear infinite',
      },
    },
  },
  plugins: [],
}
