import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        beige: {
          DEFAULT: 'var(--color-warm-beige)',
          shade: 'var(--color-warm-beige-shade)',
          50: '#FAF8F6',
          100: '#F5F1EE',
          200: '#E8E0D9',
          300: '#D8CCC1',
        },
        teal: {
          DEFAULT: 'var(--color-muted-teal)',
          hover: '#486878',
          active: '#3C5764',
          light: '#EBF1F4',
        },
        sky: {
          DEFAULT: 'var(--color-soft-sky)',
          light: '#EBF2F7',
        },
        navy: {
          DEFAULT: 'var(--color-deep-navy)',
          muted: '#4A5D73',
        },
        surface: 'var(--color-pure-white)',
        background: 'var(--color-warm-beige)',
        foreground: 'var(--color-text-primary)',
        border: 'var(--color-warm-beige-shade)',
        primary: {
          DEFAULT: 'var(--color-muted-teal)',
          foreground: '#FFFFFF',
        },
        secondary: {
          DEFAULT: 'var(--color-soft-sky)',
          foreground: 'var(--color-deep-navy)',
        },
        muted: {
          DEFAULT: 'var(--color-warm-beige-shade)',
          foreground: '#5C646D',
        },
        card: {
          DEFAULT: 'var(--color-pure-white)',
          foreground: 'var(--color-text-primary)',
        },
      },
      borderRadius: {
        xl: '0.875rem',
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
      },
      fontFamily: {
        sans: ['Inter', 'Hind Siliguri', 'Noto Sans Bengali', 'system-ui', 'sans-serif'],
        serif: ['Playfair Display', 'Georgia', 'serif'],
      },
      boxShadow: {
        luxury: '0 2px 12px -2px rgba(47, 65, 86, 0.05)',
        'luxury-md': '0 6px 24px -4px rgba(47, 65, 86, 0.08)',
      },
    },
  },
  plugins: [],
};

export default config;
