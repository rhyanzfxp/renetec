import type { Config } from 'tailwindcss'

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Paleta Semântica Industrial da Renetec
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7', // Primária Renetec
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
        surface: {
          base: '#0b0f19',     // Fundo principal de alto contraste
          card: '#111827',     // Fundo de cards/painéis
          elevated: '#1f2937', // Modais, drawers e dropdowns
          border: '#374151',   // Bordas sutis
          muted: '#4b5563',    // Elementos secundários
        },
        status: {
          aprovado: {
            DEFAULT: '#10b981', // Verde esmeralda
            muted: '#064e3b',
            light: '#d1fae5',
          },
          reprovado: {
            DEFAULT: '#ef4444', // Vermelho cardinal
            muted: '#7f1d1d',
            light: '#fee2e2',
          },
          retrabalho: {
            DEFAULT: '#f59e0b', // Âmbar de atenção
            muted: '#78350f',
            light: '#fef3c7',
          },
          aguardando: {
            DEFAULT: '#6366f1', // Índigo operacional
            muted: '#312e81',
            light: '#e0e7ff',
          },
          meta: {
            bronze: '#d97706',
            prata: '#94a3b8',
            ouro: '#eab308',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontFeatureSettings: {
        tabular: '"tnum"',
      },
      boxShadow: {
        'panel': '0 4px 20px -2px rgba(0, 0, 0, 0.4)',
        'glow-primary': '0 0 15px -3px rgba(2, 132, 199, 0.3)',
        'glow-success': '0 0 15px -3px rgba(16, 185, 129, 0.3)',
      },
      keyframes: {
        'pulse-subtle': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        }
      },
      animation: {
        'pulse-subtle': 'pulse-subtle 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
} satisfies Config
