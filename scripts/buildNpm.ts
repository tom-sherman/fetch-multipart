import { emptyDir } from "https://deno.land/x/dnt@0.26.0/mod.ts";
import { build } from "./helpers.ts";

await Promise.all([
  emptyDir("./npm"),
  emptyDir("./npm-test"),
]);

console.log("Building for test purposes...");
// We build a to ./npm-test so that we can shim undici globals. These are expected to exist when running in node.
await build({
  test: true,
  outDir: "./npm-test",
  shims: {
    deno: {
      test: "dev",
    },
    custom: [{
      package: {
        name: "undici",
        version: "^5.2.0",
      },
      globalNames: ["Headers", "FormData", "Response", "Request"],
    }, {
      module: "node:stream/web",
      globalNames: ["ReadableStream"],
    }],
  },
});

console.log("Building for publish purposes...");
await build({
  test: false,
  outDir: "./npm",
  shims: {},
});

// TODO: Add license and uncomment
// Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
