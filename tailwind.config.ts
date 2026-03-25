import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: 'class',
  theme: {
    extend: {
      typography: ({ theme }: any) => ({
        DEFAULT: {
          css: {
            h1: {
              fontSize: '1.35rem',
              fontWeight: '800',
              marginBottom: '0.6em',
              marginTop: '0.8em',
              color: theme('colors.blue.600'),
            },
            h2: {
              fontSize: '1.15rem',
              fontWeight: '700',
              marginBottom: '0.4em',
              marginTop: '0.8em',
              borderBottom: '1px solid',
              borderColor: 'rgba(0,0,0,0.1)',
              paddingBottom: '0.2em',
            },
            strong: {
              color: theme('colors.blue.700'),
              fontWeight: '700',
            },
            li: {
              marginTop: '0.2em',
              marginBottom: '0.2em',
            },
            'ul > li': {
              position: 'relative',
              paddingLeft: '0.2em',
            },
            blockquote: {
              borderLeftColor: theme('colors.blue.500'),
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              padding: '0.5em 1em',
              borderRadius: '0.5em',
              fontStyle: 'normal',
            }
          },
        },
        invert: {
          css: {
            h1: { color: theme('colors.blue.400') },
            h2: { borderColor: 'rgba(255,255,255,0.1)' },
            strong: { color: theme('colors.blue.300') },
            blockquote: { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
          }
        }
      }),
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

export default config;
