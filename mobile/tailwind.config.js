/**
 * Reelo design tokens — mirrors frontend/tailwind.config.ts so web and mobile
 * share one palette. Fonts are per-weight families (React Native does not
 * synthesize weights): use `font-sans` / `font-sans-medium` / `font-sans-semibold`
 * / `font-display` / `font-display-bold`.
 */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
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
        sans: ['Inter_400Regular'],
        'sans-medium': ['Inter_500Medium'],
        'sans-semibold': ['Inter_600SemiBold'],
        display: ['SpaceGrotesk_600SemiBold'],
        'display-bold': ['SpaceGrotesk_700Bold'],
      },
    },
  },
  plugins: [],
};
