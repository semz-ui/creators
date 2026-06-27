import type { Config } from 'tailwindcss';

/**
 * Reelo design tokens — Studio Dark theme.
 * Space Grotesk (display) + Inter (UI) + JetBrains Mono.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#080c14',
        surface: '#0f1623',
        'surface-raised': '#151e2d',
        sunken: '#070b11',
        inverse: '#f8fafc',
        brand: {
          DEFAULT: '#0284c7',
          hover: '#0369a1',
          secondary: '#0ea5e9',
          accent: '#22d3ee',
        },
        content: {
          DEFAULT: '#f1f5f9',
          secondary: '#94a3b8',
          muted: '#475569',
          inverse: '#0f172a',
          brand: '#38bdf8',
        },
        line: {
          subtle: 'rgba(255,255,255,0.06)',
          DEFAULT: 'rgba(255,255,255,0.10)',
          strong: 'rgba(255,255,255,0.18)',
          brand: '#0ea5e9',
        },
        success: { DEFAULT: '#10b981', bg: 'rgba(16,185,129,0.12)' },
        warning: { DEFAULT: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
        danger: { DEFAULT: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
        info: { DEFAULT: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #22d3ee, #0284c7)',
        'gradient-brand-r': 'linear-gradient(135deg, #0284c7, #22d3ee)',
        'gradient-dark': 'linear-gradient(180deg, #0f1623 0%, #080c14 100%)',
        shimmer:
          'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0,0,0,0.4)',
        md: '0 4px 12px -2px rgba(0,0,0,0.5)',
        lg: '0 12px 28px -6px rgba(0,0,0,0.6)',
        xl: '0 24px 56px -12px rgba(0,0,0,0.7)',
        glow: '0 8px 32px -4px rgba(34,211,238,0.25)',
        'glow-brand': '0 0 20px 0 rgba(34,211,238,0.25)',
        'glow-sm': '0 0 12px 0 rgba(34,211,238,0.18)',
        'glow-success': '0 0 8px 0 rgba(16,185,129,0.35)',
        'glow-danger': '0 0 8px 0 rgba(239,68,68,0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
        'fade-in': 'fade-in 0.8s ease-out both',
        float: 'float 7s ease-in-out infinite',
        shimmer: 'shimmer 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
