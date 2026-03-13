import type { Config } from "jest";

const config: Config = {
  moduleFileExtensions: ["js", "json", "ts"],
  rootDir: "src",
  testRegex: ".*\\.spec\\.ts$",
  transform: {
    "^.+\\.(ts|js)$": "ts-jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!uuid/)",
  ],
  collectCoverageFrom: [
    "**/*.ts",
    "!main.ts",
    "!**/*.module.ts",
  ],
  coverageDirectory: "../coverage",
  testEnvironment: "node",
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};

export default config;
