const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

const customJestConfig = {
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },

  // Ignore Next.js build output, including standalone builds,
  // to avoid duplicate-module / naming collision warnings when
  // running Jest after 'next build'.
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
};

module.exports = createJestConfig(customJestConfig);
