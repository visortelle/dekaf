const hq = require("alias-hq");

module.exports = {
  transform: {
    "\\.[jt]sx?$": [
      "esbuild-jest",
      {
        loaders: {
          ".spec.js": "jsx",
          ".js": "jsx",
        },
      },
    ],
  },
  /// This will resolve any tsconfig.compilerOptions.paths, plus stub CSS-module and asset imports so
  /// component tests (jsdom) can render real components without a CSS/SVG transform.
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/__mocks__/styleMock.js",
    "\\.(svg|png|jpg|jpeg|gif|webp|ttf|woff2?)$": "<rootDir>/__mocks__/fileMock.js",
    ...hq.get("jest"),
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/types/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  testTimeout: 3 * 60 * 1000,
};
