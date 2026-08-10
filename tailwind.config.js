/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a56db',
          dark: '#1649c0',
        },
        'on-surface': '#0f172a',
        'on-surface-variant': '#64748b',
        'surface-container': '#f1f5f9',
        'surface-container-low': '#f8fafc',
        'surface-container-lowest': '#ffffff',
        'surface-container-high': '#e2e8f0',
        outline: '#94a3b8',
        'outline-variant': '#e2e8f0',
        error: '#ef4444',
        'error-container': '#fee2e2',
        'on-error-container': '#991b1b',
        tertiary: '#d97706',
        'tertiary-container': '#fef3c7',
        secondary: '#059669',
        'secondary-container': '#d1fae5',
        'on-secondary-container': '#065f46',
      }
    },
  },
  plugins: [],
}

