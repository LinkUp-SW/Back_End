export default {
  preset: "ts-jest",
  testEnvironment: "node",
  globalSetup: "<rootDir>/config/fakeMongo.ts",
  transform: { "^.+\\.tsx?$": ["ts-jest", { useESM: true }] },
  moduleFileExtensions: ["ts", "js", "json", "node"],
  globals: {
    "ts-jest": {
      useESM: true
    }
  },
  testTimeout: 15000
};
