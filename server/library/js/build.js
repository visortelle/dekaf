const path = require("path");

const outdir = path.resolve(
  __dirname,
  ".",
  "dist",
);

const isDevelopment = process.argv.includes("--dev");
const isWatch = process.argv.includes("--watch");

require("esbuild")
  .build({
    target: ["node16"],
    entryPoints: ["libs.js"],
    bundle: true,
    minify: false,
    globalName: "jsLibs",
    sourcemap: false,
    outdir,
    define: {
      "process.env.NODE_ENV": isDevelopment ? '"development"' : '"production"',
    },
    watch: isWatch,
    logLevel: "info",
  })
  .catch(() => process.exit(1));
