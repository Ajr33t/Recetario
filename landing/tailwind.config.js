/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}', '../../legal/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Canal RGB para soportar modificadores de opacidad (bg-primary/15)
        background: 'rgb(var(--background) / <alpha-value>)',
        foreground: 'rgb(var(--foreground) / <alpha-value>)',
        card: 'rgb(var(--card) / <alpha-value>)',
        primary: 'rgb(var(--primary) / <alpha-value>)',
        'primary-foreground': 'rgb(var(--primary-foreground) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        'muted-foreground': 'rgb(var(--muted-foreground) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        glass: 'var(--glass)',
        'glass-border': 'var(--glass-border)',
      },
      boxShadow: {
        glass: 'var(--shadow-glass)',
      },
    },
  },
  plugins: [],
};
