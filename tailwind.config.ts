import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: 'class',
  theme: {
    extend: {
      typography: ({ theme }: any) => ({
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'inherit',
            h1: {
              fontSize: '1.5rem',
              fontWeight: '800',
              marginBottom: '0.6em',
              marginTop: '1.2em',
              color: theme('colors.blue.600'),
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            },
            h2: {
              fontSize: '1.25rem',
              fontWeight: '700',
              marginBottom: '0.5em',
              marginTop: '1.2em',
              color: theme('colors.gray.800'),
              borderBottom: '2px solid',
              borderColor: theme('colors.blue.100'),
              paddingBottom: '0.2em',
            },
            h3: {
              fontSize: '1.1rem',
              fontWeight: '600',
              marginTop: '1em',
              marginBottom: '0.4em',
              color: theme('colors.blue.500'),
            },
            p: {
              marginBottom: '1.25em',
              lineHeight: '1.75',
            },
            strong: {
              color: theme('colors.blue.700'),
              fontWeight: '800',
            },
            'ul > li': {
              position: 'relative',
              paddingLeft: '1.75em',
              marginBottom: '0.5em',
            },
            'ul > li::before': {
              content: '""',
              width: '0.6em',
              height: '2px',
              backgroundColor: theme('colors.blue.400'),
              position: 'absolute',
              left: '0',
              top: '0.85em',
              borderRadius: '99px',
            },
            'ol > li': {
              paddingLeft: '0.5em',
              marginBottom: '0.5em',
            },
            blockquote: {
              borderLeftColor: theme('colors.blue.500'),
              backgroundColor: theme('colors.blue.50/50'),
              padding: '1em 1.5em',
              borderRadius: '0.75em',
              fontStyle: 'normal',
              color: theme('colors.gray.700'),
            },
            code: {
              color: theme('colors.blue.600'),
              backgroundColor: theme('colors.gray.100'),
              padding: '0.2em 0.4em',
              borderRadius: '0.3em',
              fontWeight: '600',
            },
            'code::before': { content: '""' },
            'code::after': { content: '""' },
          },
        },
        invert: {
          css: {
            h1: { color: theme('colors.blue.400') },
            h2: { 
              color: theme('colors.gray.100'),
              borderColor: theme('colors.gray.800') 
            },
            h3: { color: theme('colors.blue.400') },
            strong: { color: theme('colors.blue.400') },
            blockquote: { 
              backgroundColor: theme('colors.blue.900/20'),
              color: theme('colors.gray.300')
            },
            code: {
              backgroundColor: theme('colors.gray.800'),
              color: theme('colors.blue.300'),
            },
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
