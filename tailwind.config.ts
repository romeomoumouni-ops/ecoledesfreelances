import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Accent bleu sobre (classes nommées "violet-*" pour compat — rendent du bleu Notion/Apple)
        violet: {
          50: '#f3f7fd',
          100: '#e7eefb',
          200: '#cbddf6',
          300: '#9cc1ee',
          400: '#5e9be4',
          500: '#2f7bdc',
          600: '#1f63c4',
          700: '#1b4f9e',
          800: '#1a437f',
          900: '#193a69',
        },
        // Neutres chauds façon Notion + propreté Apple
        ink: '#1d1d1f',
        muted: '#6e6e73',
        line: '#ececeb',
        surface: '#fbfbfa',
      },
      fontFamily: {
        sans: ['var(--font-montserrat)', 'Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        // Arrondis doux façon Apple (les cercles utilisent rounded-full = 9999px)
        none: '0px',
        sm: '6px',
        DEFAULT: '8px',
        md: '10px',
        lg: '12px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '24px',
        full: '9999px',
      },
      boxShadow: {
        // Ombres ultra-douces (cartes définies surtout par la bordure)
        card: '0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03)',
        soft: '0 4px 16px rgba(0,0,0,0.06)',
        glow: '0 12px 40px rgba(0,0,0,0.16)',
      },
      maxWidth: {
        content: '1200px',
      },
      fontSize: {
        base: ['0.9375rem', { lineHeight: '1.6rem' }],
        lg: ['1.0625rem', { lineHeight: '1.6rem' }],
        xl: ['1.25rem', { lineHeight: '1.7rem' }],
        '2xl': ['1.5rem', { lineHeight: '1.9rem', letterSpacing: '-0.018em' }],
        '3xl': ['1.9rem', { lineHeight: '2.2rem', letterSpacing: '-0.022em' }],
        '4xl': ['2.5rem', { lineHeight: '2.8rem', letterSpacing: '-0.026em' }],
        '5xl': ['3.25rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },
      letterSpacing: {
        tight: '-0.018em',
      },
    },
  },
  plugins: [],
};

export default config;
