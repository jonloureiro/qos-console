module.exports = {
  content: [
    "./app/**/*.tsx"
  ],
  corePlugins: {
    fontFamily: false,
  },
  theme: {
    extend: {},
  },
  plugins: [
    require('daisyui'),
  ],
  daisyui: {
    logs: false,
    themes: [
      {
        light: {
          'primary': '#96323a',
          'primary-focus': '#96323a',
          'primary-content': '#f9fafb',
          'secondary': '#54595f',
          'secondary-focus': '#54595f',
          'secondary-content': '#f9fafb',
          'accent': '#61ce70',
          'accent-focus': '#61ce70',
          'accent-content': '#f9fafb',
          'neutral': '#7a7a7a',
          'neutral-focus': '#7a7a7a',
          'neutral-content': '#f9fafb',
          'base-100': '#ffffff',
          'base-200': '#f9fafb',
          'base-300': '#d1d5db',
          'base-content': '#1f2937',
          'info': '#4054b2',
          'success': '#23a455',
          'warning': '#f4a261',
          'error': '#ee1c25',
        },
      },
    ],
  },
}
