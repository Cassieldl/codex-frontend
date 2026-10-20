import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig([
  globalIgnores(['dist', '.routegen', 'coverage', 'src/routeTree.gen.ts']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Arrow curta que devolve void (`onClick={() => setAberto(true)}`) é idioma do React, não confusão.
      '@typescript-eslint/no-confusing-void-expression': ['error', { ignoreArrowShorthand: true }],
      // Número interpolado em texto tem conversão previsível; o resto continua barrado.
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
      // `onSubmit={handleSubmit(...)}` do React Hook Form passa promise para atributo por design.
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
      // Prefixo `_` marca de propósito o parâmetro ou desestruturação descartada.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // O TanStack Router interrompe o loader lançando o `redirect`, que não é um Error.
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'package', package: '@tanstack/router-core', name: 'Redirect' }] },
      ],
      // Dado da API pode divergir do tipo declarado; a checagem defensiva fica.
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // Região rolável rotulada recebe foco para a rolagem ser alcançável por teclado (WCAG 2.1.1).
      'jsx-a11y/no-noninteractive-tabindex': [
        'error',
        { tags: [], roles: ['tabpanel', 'region'], allowExpressionValues: true },
      ],
      // Regras do React Compiler, que o projeto não usa; corrigir mudaria comportamento.
      'react-hooks/incompatible-library': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
  {
    // O plugin do TanStack Router separa o componente da rota, então o arquivo de rota exporta `Route`.
    files: ['src/routes/**/*.tsx'],
    rules: { 'react-refresh/only-export-components': 'off' },
  },
  {
    // Em teste, o `!` documenta a premissa do cenário; se ela falhar, o teste quebra como deve.
    files: ['**/*.test.{ts,tsx}', 'src/test/**'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  {
    files: ['**/*.{js,mjs}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['public/**/*.js'],
    languageOptions: { globals: globals.browser },
  },
  {
    // Execução de texto como código fica barrada em todo o repo; o preset recomendado não liga estas.
    files: ['**/*.{ts,tsx,js,mjs}'],
    rules: { 'no-eval': 'error', 'no-new-func': 'error', 'no-script-url': 'error' },
  },
  {
    // Teste do saneador de URL usa `javascript:` como entrada hostil de propósito.
    files: ['**/*.test.{ts,tsx}'],
    rules: { 'no-script-url': 'off' },
  },
  prettier,
])
