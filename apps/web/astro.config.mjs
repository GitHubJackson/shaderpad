import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import { fileURLToPath } from "node:url";

// https://astro.build/config
export default defineConfig({
  output: "static",
  site: "https://shaderpad.lucaslib.net",
  integrations: [react()],
  // 关闭 Astro 自带 dev toolbar —— 底部黑条干扰 playground 视觉
  devToolbar: { enabled: false },
  server: {
    host: "0.0.0.0",
    port: 4321,
  },
  vite: {
    resolve: {
      // 与 tsconfig.json 的 paths 对齐：@/* → src/*
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      // Vite 默认 extensions 不含 .astro，加进去后
      // @/components/Foo 才会自动找 Foo.astro
      extensions: [
        ".astro",
        ".mjs",
        ".js",
        ".mts",
        ".ts",
        ".jsx",
        ".tsx",
        ".json",
      ],
    },
    optimizeDeps: {
      // Three.js WebGPU 模块独立入口，避免与 webgl 入口冲突
      exclude: ["three/webgpu"],
    },
    ssr: {
      // three 必须保持 ESM 引入
      noExternal: ["three"],
    },
    build: {
      // 提高 chunk 阈值到 800KB（Monaco 单独 chunk ~500KB 是合理的）
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          // 手动拆分 vendor chunk
          manualChunks: {
            monaco: ["monaco-editor", "@monaco-editor/react"],
            three: ["three", "three/webgpu"],
          },
        },
      },
    },
  },
});
