import nextJest from "next/jest.js";

const createJestConfig = nextJest({ dir: "./" });

const customJestConfig = {
  testEnvironment: "jsdom",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  modulePathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/archive/cpp-programs/",
    "<rootDir>/archive/cpp-programs/canvas-service-app/",
    "<rootDir>/archive/cpp-programs/canvas-service-simple-deploy/",
  ],
  setupFilesAfterEnv: [],
};

export default createJestConfig(customJestConfig);
