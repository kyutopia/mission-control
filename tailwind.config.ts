import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'mc-bg': '#0F172A',
        'mc-bg-secondary': '#1E293B',
        'mc-bg-tertiary': '#334155',
        'mc-border': '#475569',
        'mc-text': '#F8FAFC',
        'mc-text-secondary': '#94A3B8',
        'mc-accent': '#2563EB',
        'mc-accent-green': '#22C55E',
        'mc-accent-yellow': '#F59E0B',
        'mc-accent-red': '#EF4444',
        'mc-accent-purple': '#A855F7',
        'mc-accent-pink': '#EC4899',
        'mc-accent-cyan': '#06B6D4',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
};
export default config;
