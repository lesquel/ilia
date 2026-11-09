const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['.web-build/*', 'dist/*'] },
  // Some Expo packages point `main` at a .ts source file; the TypeScript
  // resolver follows their `types` entry so imports like expo-image-picker resolve.
  { settings: { 'import/resolver': { typescript: true, node: true } } },
]);
