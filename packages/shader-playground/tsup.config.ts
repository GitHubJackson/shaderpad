/**
 * tsup 配置 —— @lucascv/shaderpad-playground
 *
 * 目标产物：
 *   - dist/index.js + dist/index.cjs + dist/index.d.ts   主入口（ESM + CJS + 类型）
 *   - dist/runtime/*.js + .cjs + .d.ts                  独立暴露 ShaderEngine
 *   - dist/styles/playground.css                        由 build:css 脚本拷贝
 *
 * 为什么同时输出 ESM 和 CJS：
 *   - ESM：现代 bundler（Vite / Astro / Next.js / Webpack 5）的首选，支持命名导出 / tree-shaking
 *   - CJS：Docusaurus 2.4.1 的 Webpack 5 也能用 CJS；旧工具链（Jest 27 / Node 14-）的兜底
 *
 * external 列表与 package.json peerDependencies 保持一致，
 * 避免把 React / monaco / three 打进去。
 *
 * JSX 用经典转换（React.createElement）而非自动 import "react/jsx-runtime"，
 * 以兼容 Docusaurus 2.x + React 17（没有 react/jsx-runtime 子路径）。
 */
import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "runtime/three-engine": "src/runtime/three-engine.ts",
  },
  format: ["esm", "cjs"],
  outExtension({ format }) {
    // ESM → .js   CJS → .cjs
    // 这样 package.json 的 exports.import / exports.require 才有明确指向
    return { js: format === "cjs" ? ".cjs" : ".js" };
  },
  dts: true,
  sourcemap: true,
  clean: true,
  splitting: false,
  target: "es2020",
  treeshake: true,
  external: [
    "react",
    "react-dom",
    "react/jsx-runtime",
    "@monaco-editor/react",
    "monaco-editor",
    "three",
  ],
});
