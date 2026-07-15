import { cp, rm } from "node:fs/promises"
import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import { build as bundle } from "tsup"

/** Bundle the executable and copy the compiled private UI into the public package. */
async function build(): Promise<void> {
  const packageDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..")
  const repositoryDirectory = resolve(packageDirectory, "../..")
  const outputDirectory = resolve(packageDirectory, "dist")

  execFileSync("pnpm", ["--filter", "@beads/ui", "build"], {
    cwd: repositoryDirectory,
    stdio: "inherit",
  })
  await rm(outputDirectory, { force: true, recursive: true })
  await bundle({
    banner: {
      js: 'import { createRequire as __createRequire } from "node:module"; const require = __createRequire(import.meta.url);',
    },
    clean: false,
    dts: false,
    entry: [resolve(packageDirectory, "src/cli.ts")],
    format: ["esm"],
    minify: false,
    noExternal: [/.*/],
    outDir: outputDirectory,
    platform: "node",
    sourcemap: true,
    target: "node22",
  })
  await cp(resolve(repositoryDirectory, "packages/ui/dist"), resolve(outputDirectory, "ui"), {
    recursive: true,
  })
}

await build()
