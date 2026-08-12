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
    // `.md` is bundled with esbuild's `text` loader (see build.js) exactly like `.svg`, so it is
    // an asset here too - without the stub jest tries to PARSE the markdown as JavaScript.
    "\\.(svg|png|jpg|jpeg|gif|webp|ttf|woff2?|md)$": "<rootDir>/__mocks__/fileMock.js",
    ...hq.get("jest"),
  },
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/types/"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  setupFiles: ["<rootDir>/jest.setup.js"],
  testTimeout: 3 * 60 * 1000,
};
