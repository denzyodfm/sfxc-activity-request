import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        sfxc: {
          green: '#10411F',
          greenLight: '#1D6B35',
          gold: '#D4AF37',
          graySoft: '#F5F6F7'
        }
      }
    }
  },
  plugins: []
};

export default config;
