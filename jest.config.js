module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      diagnostics: true,
      tsconfig: "tsconfig.json",
      typescript: require.resolve("typescript"),
    },
  },
};
