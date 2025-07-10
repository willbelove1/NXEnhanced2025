module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  testEnvironmentOptions: {
    url: 'http://localhost/', // A common default for jsdom
    customExportConditions: ['node', 'node-addons'], // Added this based on some Jest troubleshooting threads for similar issues
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  // Attempt to help Jest resolve modules, especially in a mixed ESM/CJS context
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  // Explicitly point to the resolver, though default should work
  // resolver: undefined, // Or specify a custom resolver if needed
};
