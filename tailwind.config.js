/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#090D16',
          secondary: '#0F172A',
          tertiary: '#1E293B',
          card: '#111827',
          surface: '#151C2C',
        },
        gold: {
          50: '#FFFDF0',
          100: '#FEF9C3',
          200: '#FEF08A',
          300: '#FDE047',
          400: '#FACC15',
          500: '#EAB308',
          600: '#CA8A04',
          700: '#A16207',
          800: '#854D0E',
          900: '#713F12',
          gradient: 'linear-gradient(135deg, #FDE047 0%, #EAB308 50%, #CA8A04 100%)',
        },
        brand: {
          gold: '#F59E0B',
          amber: '#D97706',
          yellow: '#FBBF24',
          glow: 'rgba(245, 158, 11, 0.25)',
        },
        instagram: {
          purple: '#833AB4',
          pink: '#FD1D1D',
          orange: '#FCB045',
          gradient: 'linear-gradient(45deg, #833AB4, #FD1D1D, #FCB045)',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px rgba(245, 158, 11, 0.2)',
        'glow-md': '0 0 25px rgba(245, 158, 11, 0.35)',
        'glow-lg': '0 0 45px rgba(245, 158, 11, 0.5)',
        'glow-emerald': '0 0 25px rgba(16, 185, 129, 0.35)',
        'glow-insta': '0 0 25px rgba(225, 48, 108, 0.4)',
        'card-dark': '0 10px 30px -5px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
