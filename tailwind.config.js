module.exports = {
  content: [
    './views/*.eta'
  ],
  corePlugins: {
    fontFamily: false
  },
  theme: {
    extend: {
      colors: {
        primary: '#96323A',
        light: '#FAF5F5',
        cinza1: '#7a7a7a',
        cinza2: '#54595f',
        verde1: '#61CE70',
        verde2: '#23A455',
        azul: '#4054b2',
        vermelho: '#EE1C25',
        'vermelho-claro': '#F9EAEB',
        laranja: '#F4A261'
      }
    }
  },
  plugins: [
    require('daisyui')
  ],
  daisyui: {
    logs: false,
    themes: [
      {
        light: {
          primary: '#96323a',
          'primary-focus': '#96323a',
          'primary-content': '#FAF5F5',
          secondary: '#54595f',
          'secondary-focus': '#54595f',
          'secondary-content': '#FAF5F5',
          accent: '#61ce70',
          'accent-focus': '#61ce70',
          'accent-content': '#FAF5F5',
          neutral: '#7a7a7a',
          'neutral-focus': '#7a7a7a',
          'neutral-content': '#FAF5F5',
          'base-100': '#ffffff',
          'base-200': '#FAF5F5',
          'base-300': '#d1d5db',
          'base-content': '#1f2937',
          info: '#365E94',
          success: '#23a455',
          warning: '#f4a261',
          error: '#ee1c25'
        }
      }
    ]
  }
}
