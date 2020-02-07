module.exports = {
    root: true,
    env: {
        node: true,
        es6: true,
        commonjs: true,
    },
    extends: ['plugin:prettier/recommended'],
    rules: {
        'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
        'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    },
    parserOptions: {
        parser: 'babel-eslint',
        ecmaVersion: 2018,
    },
    plugins: ['prettier'],
    overrides: [
        {
            files: ['**/__tests__/*.{j,t}s?(x)', '**/tests/unit/**/*.spec.{j,t}s?(x)'],
            env: {
                jest: true,
            },
        },
    ],
    rules: {
        'prettier/prettier': 'error',
        curly: ['error', 'all'],
        'no-dupe-else-if': 'error',
        'no-dupe-keys': 'error',
        'no-extra-boolean-cast': 'error',
        'no-irregular-whitespace': 'error',
        'no-unreachable': 'error',
        'no-unused-expressions': 'error',
        'no-useless-catch': 'error',
        'require-await': 'error',
        'no-unused-vars': 'error',
        'comma-dangle': 'error',
        'key-spacing': 'error',
        'prefer-const': 'error',
    },
}
