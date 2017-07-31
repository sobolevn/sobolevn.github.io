const ignorePattern = '^_'

module.exports = {
  root: true,
  parser: 'babel-eslint',
  env: {
    browser: true,
    node: true
  },
  extends: 'standard',
  // required to lint *.vue files
  plugins: [
    'html'
  ],
  // add your custom rules here
  rules: {
    'import/no-unresolved': 0,
    'import/no-unassigned-import': 0,

    'no-unused-vars': ['error', {
      argsIgnorePattern: ignorePattern,
      varsIgnorePattern: ignorePattern
    }],

    // allow paren-less arrow functions
    'arrow-parens': 0,
    // allow async-await
    'generator-star-spacing': 0,
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 2 : 0
  },
  globals: {}
}
