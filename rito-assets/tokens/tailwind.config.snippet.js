// ═══════════════════════════════════════════════════════════
// Rito · Tailwind Config Snippet
// Cole esta seção dentro do `theme.extend` do seu tailwind.config.js
// ═══════════════════════════════════════════════════════════

module.exports = {
  // ... outras configurações ...
  theme: {
    extend: {
      colors: {
        clay: {
          100: '#F4E1D5',
          300: '#E2A689',
          500: '#C97B5F',   // cor de marca
          700: '#A85F47',
          800: '#8B4A35',
        },
        creme: {
          DEFAULT: '#FAF4EE',
          soft:    '#F2EDE5',
        },
        border: {
          DEFAULT: '#EDE3D7',
          soft:    '#F0E8DC',
        },
        text: {
          mid:  '#7A5A4E',
          dark: '#3D2620',
        },
        // Modo escuro
        'rito-dark': {
          bg:      '#1E1612',
          surface: '#2A1F18',
          border:  '#3D2C22',
          text:    '#FAF4EE',
          'text-mid': '#B5A398',
        },
        // Semânticas
        success: { DEFAULT: '#7E9968', bg: '#ECEFE3' },
        warning: { DEFAULT: '#D9A152', bg: '#FAF1DE' },
        error:   { DEFAULT: '#B85A4A', bg: '#F4DEDA' },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'Times New Roman', 'serif'],
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        'sm':   '6px',
        'md':   '10px',
        'lg':   '16px',
        'pill': '999px',
      },
      boxShadow: {
        'rito-sm': '0 1px 2px rgba(61, 38, 32, 0.06)',
        'rito-md': '0 4px 12px rgba(61, 38, 32, 0.08)',
        'rito-lg': '0 12px 32px rgba(61, 38, 32, 0.10)',
      },
    },
  },
};
