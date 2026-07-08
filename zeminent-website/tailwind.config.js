/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // AI-first dark palette
        bg: {
          base: '#0d1117',
          elevated: '#141a23',
          card: '#161d27',
          'card-hover': '#1c2531',
        },
        accent: {
          DEFAULT: '#5eead4',
          bright: '#2dd4bf',
          warm: '#f5b86b',
          violet: '#818cf8',
        },
        ink: {
          primary: '#e8ecef',
          secondary: '#a8b0bb',
          tertiary: '#6b7280',
          muted: '#4a5360',
        },
      },
      borderColor: {
        subtle: 'rgba(255, 255, 255, 0.06)',
        DEFAULT: 'rgba(255, 255, 255, 0.1)',
        strong: 'rgba(255, 255, 255, 0.18)',
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'Georgia', 'serif'],
        body: ['var(--font-geist)', '-apple-system', 'sans-serif'],
        mono: ['var(--font-geist-mono)', 'monospace'],
        // legacy aliases retained while pages migrate
        poppins: ['var(--font-geist)', 'sans-serif'],
        inter: ['var(--font-geist)', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #5eead4 0%, #818cf8 50%, #f5b86b 100%)',
        'gradient-mesh':
          'radial-gradient(at 20% 10%, rgba(94, 234, 212, 0.08) 0px, transparent 50%), radial-gradient(at 80% 30%, rgba(129, 140, 248, 0.06) 0px, transparent 50%), radial-gradient(at 50% 80%, rgba(245, 184, 107, 0.05) 0px, transparent 50%)',
      },
      boxShadow: {
        'accent-glow': '0 12px 30px -10px rgba(94, 234, 212, 0.35)',
        'accent-glow-sm': '0 0 24px rgba(94, 234, 212, 0.15)',
      },
      animation: {
        rise: 'rise 1.1s cubic-bezier(0.16, 1, 0.3, 1) both',
        'spin-slow': 'spin 30s linear infinite',
        'spin-medium': 'spin 22s linear infinite reverse',
        'spin-slower': 'spin 40s linear infinite',
        'pulse-soft': 'pulseSoft 4s ease-in-out infinite',
      },
      keyframes: {
        rise: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.4' },
          '50%': { opacity: '0.85' },
        },
      },
      maxWidth: {
        site: '1240px',
      },
    },
  },
  plugins: [],
}
