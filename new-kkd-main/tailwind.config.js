/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#E8F0F8',
          100: '#C5D9EC',
          200: '#9DBDDB',
          300: '#6C9BC5',
          400: '#4780B3',
          500: '#1E6399',
          600: '#155080',
          700: '#0F4068',
          800: '#0B3350',
          900: '#0B3C5D',
          950: '#071E2E',
        },
        'cyan-accent': {
          DEFAULT: '#00BCD4',
          50:  '#E0F7FA',
          100: '#B2EBF2',
          200: '#80DEEA',
          300: '#4DD0E1',
          400: '#26C6DA',
          500: '#00BCD4',
          600: '#00A8CC',
          700: '#00838F',
          800: '#006064',
          900: '#004D40',
        },
        petroleum: {
          50:  '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aaf5',
          500: '#0c8ee3',
          600: '#0070c1',
          700: '#00589c',
          800: '#004B6E',
          900: '#0B3C5D',
          950: '#07263e',
        },
        teal: {
          accent: '#00A8CC',
          light: '#328CC1',
        },
      },
      animation: {
        'slide-in': 'slideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'shimmer': 'shimmer 1.5s infinite linear',
        'pulse-glow': 'pulseGlow 2s infinite ease-in-out',
      },
      keyframes: {
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(100%) scale(0.95)' },
          '100%': { opacity: '1', transform: 'translateX(0) scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateX(-50%) translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0, 188, 212, 0)' },
          '50%': { boxShadow: '0 0 12px 4px rgba(0, 188, 212, 0.25)' },
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'premium': '0 4px 24px -4px rgba(11, 60, 93, 0.12), 0 1px 4px -1px rgba(11, 60, 93, 0.08)',
        'premium-lg': '0 12px 48px -8px rgba(11, 60, 93, 0.18), 0 4px 12px -2px rgba(11, 60, 93, 0.10)',
        'glow-cyan': '0 0 20px rgba(0, 188, 212, 0.3), 0 0 60px rgba(0, 188, 212, 0.1)',
      },
    },
  },
  plugins: [],
};
