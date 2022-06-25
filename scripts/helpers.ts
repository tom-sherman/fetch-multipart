import { build as dntBuild } from "https://deno.land/x/dnt@0.26.0/mod.ts";
import type { ShimOptions } from "https://deno.land/x/dnt@0.26.0/mod.ts";
import denoConfig from "../deno.json" assert { type: "json" };

interface BuildOptions {
  outDir: string;
  shims: ShimOptions;
  test: boolean;
}

export async function build({ outDir, shims, test }: BuildOptions) {
  await dntBuild({
    entryPoints: ["./src/mod.ts"],
    outDir,
    shims,
    typeCheck: false,
    package: {
      name: "your-package",
      version: Deno.args[0]!,
      description: "Your package.",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/username/repo.git",
      },
      bugs: {
        url: "https://github.com/username/repo/issues",
      },
    },
    compilerOptions: {
      lib: [
        "es2021",
        "dom",
      ],
    },
    test,
    importMap: denoConfig.importMap,
  });
}
