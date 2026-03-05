import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [join(__dirname, 'src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}')],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Sans"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        surface: {
          DEFAULT: '#0a0a0a',
          50: '#070707',
          100: '#111111',
          200: '#1a1a1a',
        },
      },
      maxWidth: {
        container: '1280px',
      },
    },
  },
  plugins: [],
};
