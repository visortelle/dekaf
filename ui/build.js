const path = require("path");
const cssModulesPlugin = require("esbuild-css-modules-plugin");

const outdir = path.resolve(
  __dirname,
  "..",
  "server",
  "src",
  "main",
  "resources",
  "ui",
  "static",
  "dist"
);

require("esbuild")
  .build({
    target: ["chrome100"],
    entryPoints: ["entrypoint.tsx"],
    bundle: true,
    loader: {
      ".svg": "text",
    },
    minify: true,
    globalName: "pulsarUiEntrypoint",
    sourcemap: "external",
    outdir,
    plugins: [
      cssModulesPlugin({
        usePascalCase: true,
        v2: true,
      }),
    ],
    define: { "process.env.NODE_ENV": '"production"' },
    watch: process.argv.includes("--watch"),
    logLevel: "info",
  })
  .catch(() => process.exit(1));
