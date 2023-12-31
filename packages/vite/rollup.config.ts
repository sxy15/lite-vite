import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import nodeResolve from "@rollup/plugin-node-resolve";
import typescript from "@rollup/plugin-typescript";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";
import type { RollupOptions } from "rollup";
import { defineConfig } from "rollup";

const pkg = JSON.parse(
  readFileSync(new URL("./package.json", import.meta.url)).toString()
);

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// sharedNodeOptions 是为了后续增加其他打包入口时提取用于公用的配置项

const sharedNodeOptions = defineConfig({
  treeshake: {
    moduleSideEffects: "no-external",
    propertyReadSideEffects: false,
    tryCatchDeoptimization: false,
  },
  output: {
    dir: "./dist",
    entryFileNames: `node/[name].js`,
    chunkFileNames: "node/chunks/dep-[hash].js",
    exports: "named",
    format: "esm",
    externalLiveBindings: false,
    freeze: false,
  },
  onwarn(warning, warn) {
    if (warning.message.includes("Circular dependency")) {
      return;
    }
    warn(warning);
  },
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    typescript({
      tsconfig: path.resolve(__dirname, "src/node/tsconfig.json"),
      sourceMap: true,
      declaration: true,
      declarationDir: "./dist/node",
    }),
    commonjs({
      extensions: [".js"],
      ignore: ["bufferutil", "utf-8-validate"],
    }),
    json(),
  ],
});

const config = defineConfig({
  ...sharedNodeOptions,
  input: {
    // 打包入口
    index: path.resolve(__dirname, "src/node/index.ts"),
  },
  output: {
    ...sharedNodeOptions.output,
    sourcemap: true,
  },
  // 使用 external 将本地开发环境依赖剔除有利于提高构建效率
  external: [
    ...Object.keys(pkg.dependencies),
    ...Object.keys(pkg.devDependencies),
  ],
});

export default (): RollupOptions[] => {
  return defineConfig([config]);
};
