module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts?(x)'],
  // jest-expo defaults to react-native export conditions; the empty condition
  // keeps node-targeted packages (e.g. msw) resolvable in tests.
  testEnvironmentOptions: { customExportConditions: [''] },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|nativewind|react-native-css-interop|react-native-svg|zustand))',
  ],
};
