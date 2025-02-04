/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: [
    './components/**/*.{js,vue,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './plugins/**/*.{js,ts}',
    './nuxt.config.{js,ts}',
    './app.vue',
  ],
  darkMode: 'class',
  mode: 'jit',
  theme: {
    screens: {
      xs: '425px',
      sm: '525px',
      md: '768px',
      lg: '1024px',
      midXl: '1220px',
      xl: '1440px',
    },
    colors: {
      primary: 'var(--color-primary)',
      secondary: 'var(--color-secondary)',
      tertiary: 'var(--color-tertiary)',
      accent: 'var(--color-accent)',

      black: 'var(--color-black)',
      dark: 'var(--color-dark)',
      transparent: 'var(--color-transparent)',
      light: 'var(--color-light)',
      white: 'var(--color-white)',

      heading: 'var(--color-heading)',
      subheading: 'var(--color-subheading)',
      body: 'var(--color-body)',

      error: 'var(--color-error)',
      success: 'var(--color-success)',
      info: 'var(--color-info)',
      warning: 'var(--color-warning)',
    },
  },
  extend: {
    zIndex: {
		  '100': '100',
    }
  },
  plugins: [
    plugin(function ({ addBase, addComponents, addUtilities, theme }) {
      addComponents({
        // @apply px-4 sm:px-6 md:px-8
        '.container': {
          paddingLeft: theme('spacing.4'),
          paddingRight: theme('spacing.4'),
        },
        // text-4xl md:text-5xl lg:text-6xl font-bold capitalize
        '.text-display-1': {
          fontSize: theme('fontSize.body'),
          textTransform: 'capitalize',
          fontWeight: theme('fontWeight.bold'),
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.5xl'),
          },
          '@media (min-width: 1024px)': {
            fontSize: theme('fontSize.6xl'),
          },
        },
        // text-3xl md:text-4xl lg:text-5xl font-bold capitalize;
        '.text-display-2': {
          fontSize: theme('fontSize.3xl'),
          textTransform: 'capitalize',
          fontWeight: theme('fontWeight.bold'),
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.4xl'),
          },
          '@media (min-width: 1024px)': {
            fontSize: theme('fontSize.5xl'),
          },
        },
        // text-2xl md:text-3xl lg:text-4xl
        '.text-heading-1': {
          fontSize: theme('fontSize.2xl'),
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.3xl'),
          },
          '@media (min-width: 1024px)': {
            fontSize: theme('fontSize.4xl'),
          },
        },
        // mb-2 md:mb-3 xl:mb-4 text-sm md:text-base text-accent font-body;
        '.text-subheading-1': {
          fontSize: theme('fontSize.sm'),
          color: theme('colors.accent'),
          marginBottom: theme('spacing.2'),
          fontFamily: 'Space Mono',
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.base'),
            marginBottom: theme('spacing.3'),
          },
          '@media (min-width: 1440px)': {
            marginBottom: theme('spacing.4'),
          },
        },
        // text-lg md:text-xl xl:text-2xl;
        '.text-heading-2': {
          fontSize: theme('fontSize.lg'),
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.xl'),
          },
          '@media (min-width: 1024px)': {
            fontSize: theme('fontSize.2xl'),
          },
        },
        // mb-1.5 md:mb-2 xl:mb-3 text-xs md:text-sm text-accent font-body;
        '.text-subheading-2': {
          fontSize: theme('fontSize.xs'),
          color: theme('colors.accent'),
          marginBottom: theme('spacing.1.5'),
          fontFamily: 'Space Mono',
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.sm'),
            marginBottom: theme('spacing.2'),
          },
          '@media (min-width: 1440px)': {
            marginBottom: theme('spacing.3'),
          },
        },
        // text-lg md:text-xl
        '.text-heading-3': {
          fontSize: theme('fontSize.lg'),
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.xl'),
          },
        },
        // text-base md:text-lg
        '.text-heading-4': {
          fontSize: theme('fontSize.base'),
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.lg'),
          },
        },
        // text-sm
        '.text-heading-5': {
          fontSize: theme('fontSize.sm'),
        },
        // text-sm md:text-base
        '.text-body-1': {
          fontSize: theme('fontSize.sm'),
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.base'),
          },
        },
        // text-xs md:text-sm
        '.text-body-2': {
          fontSize: theme('fontSize.xs'),
          '@media (min-width: 768px)': {
            fontSize: theme('fontSize.sm'),
          },
        },
        // p-2 xl:p-4
        '.box': {
          padding: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            padding: theme('spacing.4'),
          },
        },
        // p-3 md:p-4 xl:p-6
        '.card-sm': {
          padding: theme('spacing.3'),
          '@media (min-width: 768px)': {
            padding: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            padding: theme('spacing.6'),
          },
        },
        // p-4 md:p-6 xl:p-8
        '.card': {
          padding: theme('spacing.4'),
          '@media (min-width: 768px)': {
            padding: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            padding: theme('spacing.8'),
          },
        },
        // px-[5vw] sm:px-9 md:px-16 lg:px-[17.5vw] xl:px-80
        '.container': {
          margin: theme('spacing.0'),
          maxWidth: '100vw',
          paddingLeft: '5vw',
          paddingRight: '5vw',
          '@media (min-width: 425px)': {
            paddingLeft: theme('spacing.9'),
            paddingRight: theme('spacing.9'),
            maxWidth: '100vw',
          },
          '@media (min-width: 768px)': {
            paddingLeft: theme('spacing.16'),
            paddingRight: theme('spacing.16'),
            maxWidth: '100vw',
          },
          '@media (min-width: 1024px)': {
            paddingLeft: '17.5vw',
            paddingRight: '17.5vw',
            maxWidth: '100vw',
          },
          '@media (min-width: 1440px)': {
            paddingLeft: theme('spacing.80'),
            paddingRight: theme('spacing.80'),
            maxWidth: '100vw',
          },
        },
        // px-[5vw] sm:px-9 md:px-16 lg:px-32 xl:px-48
        '.container-fluid': {
          margin: theme('spacing.0'),
          maxWidth: '100vw',
          paddingLeft: '5vw',
          paddingRight: '5vw',
          '@media (min-width: 425px)': {
            paddingLeft: theme('spacing.9'),
            paddingRight: theme('spacing.9'),
            maxWidth: '100vw',
          },
          '@media (min-width: 768px)': {
            paddingLeft: theme('spacing.16'),
            paddingRight: theme('spacing.16'),
            maxWidth: '100vw',
          },
          '@media (min-width: 1024px)': {
            paddingLeft: theme('spacing.32'),
            paddingRight: theme('spacing.32'),
            maxWidth: '100vw',
          },
          '@media (min-width: 1440px)': {
            paddingLeft: theme('spacing.48'),
            paddingRight: theme('spacing.48'),
            maxWidth: '100vw',
          },
        },
        // p-0 sm:p-6 md:p-9 lg:p-12 sm:border-4 sm:border-tertiary rounded-lg h-fit w-full max-w-xl
        '.container-form': {
          padding: theme('spacing.0'),
          height: theme('height.fit'),
          width: theme('width.full'),
          maxWidth: theme('maxWidth.2xl'),
          '@media (min-width: 425px)': {
            padding: theme('spacing.6'),
            borderColor: theme('colors.tertiary'),
            borderWidth: theme('borderWidth.4'),
            borderRadius: theme('borderRadius.lg'),
          },
          '@media (min-width: 768px)': {
            padding: theme('spacing.9'),
          },
          '@media (min-width: 1024px)': {
            padding: theme('spacing.12'),
          },
        },
      });
      addUtilities({
        '.font-heading': {
          fontFamily: 'Ubuntu Mono',
        },
        '.font-body': {
          fontFamily: 'Space Mono',
        },
        '.bg-error-light': {
          // backgroundColor: '#272133',
          backgroundColor: '#eb585720',
        },
        '.bg-success-light': {
          // backgroundColor: '#0C2F3B',
          backgroundColor: '#00cc9920',
        },
        '.bg-warning-light': {
          // backgroundColor: '#282F32',
          backgroundColor: '#f2c94c20',
        },
        '.bg-info-light': {
          // backgroundColor: '#0D2543',
          backgroundColor: '#177ddc20',
        },
        // transition duration-300 ease-out
        '.transition-basic': {
          transitionProperty: 'color, background-color, border-color, text-decoration-color, fill, stroke, opacity, box-shadow, transform, filter, backdrop-filter',
          transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
          transitionDuration: '300ms',
        },
        '.style-box': {
          boxShadow: theme('boxShadow.md'),
          borderRadius: theme('borderRadius.md'),
        },
        // gap-2 xl:gap-4
        '.gap-box': {
          gap: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            gap: theme('spacing.4'),
          },
        },
        '.gap-y-box': {
          rowGap: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            rowGap: theme('spacing.4'),
          },
        },
        '.gap-x-box': {
          columnGap: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            columnGap: theme('spacing.4'),
          },
        },
        // mt-2 xl:mt-4
        '.mt-box': {
          marginTop: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            marginTop: theme('spacing.4'),
          },
        },
        // mb-2 xl:mb-4
        '.mb-box': {
          marginBottom: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            marginBottom: theme('spacing.4'),
          },
        },
        // pt-2 xl:pt-4
        '.pt-box': {
          paddingTop: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            paddingTop: theme('spacing.4'),
          },
        },
        // pb-2 xl:pb-4
        '.pb-box': {
          paddingBottom: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            paddingBottom: theme('spacing.4'),
          },
        },
        // top-2 xl:top-4
        '.top-box': {
          top: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            top: theme('spacing.4'),
          },
        },
        // bottom-2 xl:bottom-4
        '.bottom-box': {
          bottom: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            bottom: theme('spacing.4'),
          },
        },
        // left-2 xl:left-4
        '.left-box': {
          left: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            left: theme('spacing.4'),
          },
        },
        // right-2 xl:right-4
        '.right-box': {
          right: theme('spacing.2'),
          '@media (min-width: 1440px)': {
            right: theme('spacing.4'),
          },
        },
        // gap-3 md:gap-4 xl:gap-6
        '.gap-card-sm': {
          gap: theme('spacing.3'),
          '@media (min-width: 768px)': {
            gap: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            gap: theme('spacing.6'),
          },
        },
        '.gap-y-card-sm': {
          rowGap: theme('spacing.3'),
          '@media (min-width: 768px)': {
            rowGap: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            rowGap: theme('spacing.6'),
          },
        },
        '.gap-x-card-sm': {
          columnGap: theme('spacing.3'),
          '@media (min-width: 768px)': {
            columnGap: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            columnGap: theme('spacing.6'),
          },
        },
        // mt-3 md:mt-4 xl:mt-6
        '.mt-card-sm': {
          marginTop: theme('spacing.3'),
          '@media (min-width: 768px)': {
            marginTop: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            marginTop: theme('spacing.6'),
          },
        },
        // mb-3 md:mb-4 xl:mb-6
        '.mb-card-sm': {
          marginBottom: theme('spacing.3'),
          '@media (min-width: 768px)': {
            marginBottom: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            marginBottom: theme('spacing.6'),
          },
        },
        // pt-3 md:pt-4 xl:pt-6
        '.pt-card-sm': {
          paddingTop: theme('spacing.3'),
          '@media (min-width: 768px)': {
            paddingTop: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            paddingTop: theme('spacing.6'),
          },
        },
        // pb-3 md:pb-4 xl:pb-6
        '.pb-card-sm': {
          paddingBottom: theme('spacing.3'),
          '@media (min-width: 768px)': {
            paddingBottom: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            paddingBottom: theme('spacing.6'),
          },
        },
        // top-3 md:top-4 xl:top-6
        '.top-card-sm': {
          top: theme('spacing.3'),
          '@media (min-width: 768px)': {
            top: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            top: theme('spacing.6'),
          },
        },
        // bottom-3 md:bottom-4 xl:bottom-6
        '.bottom-card-sm': {
          bottom: theme('spacing.3'),
          '@media (min-width: 768px)': {
            bottom: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            bottom: theme('spacing.6'),
          },
        },
        // left-3 md:left-4 xl:left-6
        '.left-card-sm': {
          left: theme('spacing.3'),
          '@media (min-width: 768px)': {
            left: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            left: theme('spacing.6'),
          },
        },
        // right-3 md:right-4 xl:right-6
        '.right-card-sm': {
          right: theme('spacing.3'),
          '@media (min-width: 768px)': {
            right: theme('spacing.4'),
          },
          '@media (min-width: 1440px)': {
            right: theme('spacing.6'),
          },
        },
        '.style-card': {
          boxShadow: theme('boxShadow.lg'),
          borderRadius: theme('borderRadius.lg'),
        },
        // gap-4 md:gap-6 xl:gap-8
        '.gap-card': {
          gap: theme('spacing.4'),
          '@media (min-width: 768px)': {
            gap: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            gap: theme('spacing.8'),
          },
        },
        '.gap-y-card': {
          rowGap: theme('spacing.4'),
          '@media (min-width: 768px)': {
            rowGap: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            rowGap: theme('spacing.8'),
          },
        },
        '.gap-x-card': {
          columnGap: theme('spacing.4'),
          '@media (min-width: 768px)': {
            columnGap: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            columnGap: theme('spacing.8'),
          },
        },
        // mt-4 md:mt-6 xl:mt-8
        '.mt-card': {
          marginTop: theme('spacing.4'),
          '@media (min-width: 768px)': {
            marginTop: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            marginTop: theme('spacing.8'),
          },
        },
        // mb-4 md:mb-6 xl:mb-8
        '.mb-card': {
          marginBottom: theme('spacing.4'),
          '@media (min-width: 768px)': {
            marginBottom: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            marginBottom: theme('spacing.8'),
          },
        },
        // pt-4 md:pt-6 xl:pt-8
        '.pt-card': {
          paddingTop: theme('spacing.4'),
          '@media (min-width: 768px)': {
            paddingTop: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            paddingTop: theme('spacing.8'),
          },
        },
        // pb-4 md:pb-6 xl:pb-8
        '.pb-card': {
          paddingBottom: theme('spacing.4'),
          '@media (min-width: 768px)': {
            paddingBottom: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            paddingBottom: theme('spacing.8'),
          },
        },
        // top-4 md:top-6 xl:top-8
        '.top-card': {
          top: theme('spacing.4'),
          '@media (min-width: 768px)': {
            top: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            top: theme('spacing.8'),
          },
        },
        // bottom-4 md:bottom-6 xl:bottom-8
        '.bottom-card': {
          bottom: theme('spacing.4'),
          '@media (min-width: 768px)': {
            bottom: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            bottom: theme('spacing.8'),
          },
        },
        // left-4 md:left-6 xl:left-8
        '.left-card': {
          left: theme('spacing.4'),
          '@media (min-width: 768px)': {
            left: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            left: theme('spacing.8'),
          },
        },
        // right-4 md:right-6 xl:right-8
        '.right-card': {
          right: theme('spacing.4'),
          '@media (min-width: 768px)': {
            right: theme('spacing.6'),
          },
          '@media (min-width: 1440px)': {
            right: theme('spacing.8'),
          },
        },
        // gap-6 sm:gap-10 md:gap-12 lg:gap-16 xl:gap-20
        // gap-4 sm:gap-6 md:gap-10 lg:gap-12 xl:gap-16
        // gap-6 sm:gap-10 md:gap-12 lg:gap-16
        '.gap-container': {
          gap: theme('spacing.6'),
          '@media (min-width: 425px)': {
            gap: theme('spacing.10'),
          },
          '@media (min-width: 768px)': {
            gap: theme('spacing.12'),
          },
          '@media (min-width: 1024px)': {
            gap: theme('spacing.16'),
          },
          // '@media (min-width: 1440px)': {
          // 	gap: theme('spacing.20'),
          // },
        },
        '.gap-y-container': {
          rowGap: theme('spacing.6'),
          '@media (min-width: 425px)': {
            rowGap: theme('spacing.10'),
          },
          '@media (min-width: 768px)': {
            rowGap: theme('spacing.12'),
          },
          '@media (min-width: 1024px)': {
            rowGap: theme('spacing.16'),
          },
          '@media (min-width: 1440px)': {
            rowGap: theme('spacing.20'),
          },
        },
        '.gap-x-container': {
          columnGap: theme('spacing.6'),
          '@media (min-width: 425px)': {
            columnGap: theme('spacing.10'),
          },
          '@media (min-width: 768px)': {
            columnGap: theme('spacing.12'),
          },
          '@media (min-width: 1024px)': {
            columnGap: theme('spacing.16'),
          },
          '@media (min-width: 1440px)': {
            columnGap: theme('spacing.20'),
          },
        },
        // mt-10 md:mt-12 lg:mt-16 xl:mt-24
        '.mt-container': {
          marginTop: theme('spacing.10'),
          '@media (min-width: 425px)': {
            marginTop: theme('spacing.10'),
          },
          '@media (min-width: 768px)': {
            marginTop: theme('spacing.12'),
          },
          '@media (min-width: 1024px)': {
            marginTop: theme('spacing.16'),
          },
          '@media (min-width: 1440px)': {
            marginTop: theme('spacing.24'),
          },
        },
        // mb-10 md:mb-12 lg:mb-16 xl:mb-24
        '.mb-container': {
          marginBottom: theme('spacing.10'),
          '@media (min-width: 425px)': {
            marginBottom: theme('spacing.10'),
          },
          '@media (min-width: 768px)': {
            marginBottom: theme('spacing.12'),
          },
          '@media (min-width: 1024px)': {
            marginBottom: theme('spacing.16'),
          },
          '@media (min-width: 1440px)': {
            marginBottom: theme('spacing.24'),
          },
        },
        // pt-6 sm:pt-10 md:pt-12 lg:pt-16 xl:pt-20
        '.pt-container': {
          paddingTop: theme('spacing.6'),
          '@media (min-width: 425px)': {
            paddingTop: theme('spacing.10'),
          },
          '@media (min-width: 768px)': {
            paddingTop: theme('spacing.12'),
          },
          '@media (min-width: 1024px)': {
            paddingTop: theme('spacing.16'),
          },
          '@media (min-width: 1440px)': {
            paddingTop: theme('spacing.20'),
          },
        },
        // pb-6 sm:pb-10 md:pb-12 lg:pb-16 xl:pb-20
        '.pb-container': {
          paddingBottom: theme('spacing.6'),
          '@media (min-width: 425px)': {
            paddingBottom: theme('spacing.10'),
          },
          '@media (min-width: 768px)': {
            paddingBottom: theme('spacing.12'),
          },
          '@media (min-width: 1024px)': {
            paddingBottom: theme('spacing.16'),
          },
          '@media (min-width: 1440px)': {
            paddingBottom: theme('spacing.20'),
          },
        },
        // top-4 sm:top-6 md:top-10 lg:top-12 xl:top-16
        '.top-container': {
          top: theme('spacing.4'),
          '@media (min-width: 425px)': {
            top: theme('spacing.6'),
          },
          '@media (min-width: 768px)': {
            top: theme('spacing.10'),
          },
          '@media (min-width: 1024px)': {
            top: theme('spacing.12'),
          },
          '@media (min-width: 1440px)': {
            top: theme('spacing.16'),
          },
        },
        // bottom-4 sm:bottom-6 md:bottom-10 lg:bottom-12 xl:bottom-16
        '.bottom-container': {
          bottom: theme('spacing.4'),
          '@media (min-width: 425px)': {
            bottom: theme('spacing.6'),
          },
          '@media (min-width: 768px)': {
            bottom: theme('spacing.10'),
          },
          '@media (min-width: 1024px)': {
            bottom: theme('spacing.12'),
          },
          '@media (min-width: 1440px)': {
            bottom: theme('spacing.16'),
          },
        },
        // left-[5vw] sm:left-9 md:left-16 lg:left-32 xl:left-48
        '.left-container': {
          left: '5vw',
          '@media (min-width: 425px)': {
            left: theme('spacing.9'),
          },
          '@media (min-width: 768px)': {
            left: theme('spacing.16'),
          },
          '@media (min-width: 1024px)': {
            left: theme('spacing.32'),
          },
          '@media (min-width: 1440px)': {
            left: theme('spacing.48'),
          },
        },
        // right-[5vw] sm:right-9 md:right-16 lg:right-32 xl:right-48
        '.right-container': {
          right: '5vw',
          '@media (min-width: 425px)': {
            right: theme('spacing.9'),
          },
          '@media (min-width: 768px)': {
            right: theme('spacing.16'),
          },
          '@media (min-width: 1024px)': {
            right: theme('spacing.32'),
          },
          '@media (min-width: 1440px)': {
            right: theme('spacing.48'),
          },
        },
      });
    }),
  ],
};
