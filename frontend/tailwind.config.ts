import type { Config } from 'tailwindcss';

/**
 * Reelo design tokens (pulled from Figma file 6pgzN6UCgXFUHE1IJnnlAo).
 * Sky-blue theme, Space Grotesk (display) + Inter (UI) + JetBrains Mono.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: '#f8fafc',
        surface: '#ffffff',
        sunken: '#f1f5f9',
        inverse: '#0f172a',
        brand: {
          DEFAULT: '#0284c7',
          hover: '#0369a1',
          secondary: '#0ea5e9',
          accent: '#22d3ee',
        },
        content: {
          DEFAULT: '#0f172a',
          secondary: '#475569',
          muted: '#94a3b8',
          inverse: '#ffffff',
          brand: '#0284c7',
        },
        line: {
          subtle: '#e2e8f0',
          DEFAULT: '#cbd5e1',
          strong: '#94a3b8',
          brand: '#0ea5e9',
        },
        success: { DEFAULT: '#10b981', bg: '#ecfdf5' },
        warning: { DEFAULT: '#f59e0b', bg: '#fffbeb' },
        danger: { DEFAULT: '#ef4444', bg: '#fef2f2' },
        info: { DEFAULT: '#06b6d4', bg: '#ecfeff' },
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        sm: '0 1px 2px 0 #0f172a14',
        md: '0 4px 12px -2px #0f172a1f',
        lg: '0 12px 28px -6px #0f172a29',
        xl: '0 24px 56px -12px #0f172a38',
        glow: '0 8px 32px -4px #3ab1ed73',
      },
    },
  },
  plugins: [],
} satisfies Config;
