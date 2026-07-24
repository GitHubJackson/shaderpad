# @lucascv/shaderpad-playground

> 可嵌入 MDX / Markdown 文档的 **GLSL 编辑器 + 实时 WebGL 预览** React 组件。

[![npm version](https://img.shields.io/npm/v/@lucascv/shaderpad-playground)](https://www.npmjs.com/package/@lucascv/shaderpad-playground)
[![bundle size](https://img.shields.io/bundlephobia/minzip/@lucascv/shaderpad-playground)](https://bundlephobia.com/package/@lucascv/shaderpad-playground)
[![license](https://img.shields.io/npm/l/@lucascv/shaderpad-playground)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-shaderpad.lucaslib.net-blue)](https://shaderpad.lucaslib.net/embed-test)

源自 [ShaderPad](https://shaderpad.lucaslib.net) 主站的核心交互模块 —— 左右分屏编辑器、实时 WebGL 编译、错误浮条、用户编辑持久化，5 行代码接入任何 React 项目。

## ✨ 特性

- **5 行接入**：MDX / Astro / Next.js / 普通 React 全部支持
- **实时反馈**：改 GLSL 立即重编译，编译错误以浮条提示
- **持久化**：用户编辑自动存到 `localStorage`，按 `storageKey` 隔离
- **响应式**：宽屏左右分屏，窄屏（< 720px）自动堆叠
- **开箱即用**：6 个内置 uniforms（`u_time` / `u_resolution` / `u_mouse` 等）
- **框架兼容**：React 17 / 18 / 19，Docusaurus 2.x（Webpack 5）已验证
- **无外部样式污染**：CSS 变量以 `spg-` 前缀隔离，融入宿主主题

## 📦 安装

> ⚠️ 本包是 UI 组件库，**`react` / `three` / `monaco-editor` 等是 peerDependencies，不打包进 dist**，必须手动装。

```bash
# pnpm（推荐）
pnpm add @lucascv/shaderpad-playground react react-dom three monaco-editor @monaco-editor/react
```

| peerDependency         | 版本要求                  | 必需？                                                         |
| ---------------------- | ------------------------- | -------------------------------------------------------------- |
| `react`                | `^17 \|\| ^18.3 \|\| ^19` | ✅                                                             |
| `react-dom`            | 同上                      | ⚠️ 嵌入式场景可省（已在 `peerDependenciesMeta` 标记 optional） |
| `three`                | `^0.170`                  | ✅                                                             |
| `monaco-editor`        | `^0.50`                   | ✅                                                             |
| `@monaco-editor/react` | `^4.6`                    | ✅                                                             |

## 🚀 5 行快速上手

```jsx
import { ShaderPlayground } from "@lucascv/shaderpad-playground";
import "@lucascv/shaderpad-playground/styles";

<ShaderPlayground
  code="void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }"
  storageKey="my-article/hello"
/>;
```

打开浏览器 —— 左侧编辑 GLSL，右侧实时预览，能动。

## 📖 使用场景

### MDX（Docusaurus 2 / 标准 MDX）

```mdx
---
title: 我的 GLSL 教程
---

import { ShaderPlayground } from "@lucascv/shaderpad-playground";
import "@lucascv/shaderpad-playground/styles";

把 `1.0` 改成 `0.0` 看看会怎样：

<ShaderPlayground
  type="fragment"
  geometry="plane"
  storageKey="tutorial/01-hello"
  code={`precision highp float;
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`}
/>
```

> Docusaurus 2.4 + React 17 用户：在 `src/theme/Root.tsx` 里把 `ShaderPlayground` 注册到 `MDXProvider.components`，文章里就不需要每次 import 了。详见 [Live Demo 源码](https://github.com/GitHubJackson/shaderpad/tree/main/apps/web/src/pages/embed-test.astro)。

### Astro

```astro
---
import { ShaderPlayground } from "@lucascv/shaderpad-playground";
import "@lucascv/shaderpad-playground/styles";
---

<ShaderPlayground
  client:only="react"
  code="..."
  storageKey="my-article/greeting"
/>
```

> ⚠️ 必须用 `client:only="react"`，不能用 `client:load`，否则 SSR 阶段 WebGL 调用会报错。

### Next.js（App Router）

```tsx
"use client";
import { ShaderPlayground } from "@lucascv/shaderpad-playground";
import "@lucascv/shaderpad-playground/styles";

export default function Page() {
  return (
    <ShaderPlayground
      code="void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }"
      storageKey="next/hello"
    />
  );
}
```

> ⚠️ 顶层文件必须加 `"use client"`，因为组件用到 `window` / `WebGL`。

### 普通 React / Vite / CRA

```tsx
import { ShaderPlayground } from "@lucascv/shaderpad-playground";
import "@lucascv/shaderpad-playground/styles";

function App() {
  return (
    <ShaderPlayground
      code="void main() { gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0); }"
      storageKey="app/hello"
    />
  );
}
```

## ⚙️ Props

| Prop          | 类型                           | 默认值       | 说明                                                                       |
| ------------- | ------------------------------ | ------------ | -------------------------------------------------------------------------- |
| `code`        | `string`                       | —            | 初始 GLSL 源码（必填）                                                     |
| `type`        | `"vertex" \| "fragment"`       | `"fragment"` | 当前编辑的是哪个 stage，另一个 stage 用占位默认                            |
| `geometry`    | `"plane" \| "box" \| "sphere"` | `"plane"`    | 渲染目标几何体                                                             |
| `height`      | `number`                       | `360`        | 画布高度（像素）                                                           |
| `readonly`    | `boolean`                      | `false`      | 设为 `true` 则只读，无编辑器交互                                           |
| `theme`       | `"auto" \| "dark" \| "light"`  | `"auto"`     | 主题：`auto` 跟随 `<html data-theme>`，否则强制                            |
| `storageKey`  | `string`                       | —            | 持久化用户编辑的 `localStorage` 键（**建议用文章路径**，多篇文章互不串扰） |
| `showHelpers` | `boolean`                      | `true`       | 是否显示 3D 辅助线（grid + axes）                                          |
| `title`       | `string`                       | 自动         | 顶部小条标题，传 `""` 隐藏                                                 |

## 🎨 内置 Uniforms

引擎在每帧把以下 uniforms 写入 `RawShaderMaterial`，你的 GLSL 可直接使用：

| Uniform            | 类型    | 含义                                                |
| ------------------ | ------- | --------------------------------------------------- |
| `u_time`           | `float` | 启动到当前的秒数                                    |
| `u_resolution`     | `vec2`  | 画布像素尺寸（容器 `clientWidth` / `clientHeight`） |
| `u_mouse`          | `vec2`  | 鼠标归一化坐标（Y 已翻转，`[0, 1]`）                |
| `u_random`         | `float` | 引擎初始化时的 `Math.random()`                      |
| `projectionMatrix` | `mat4`  | 相机投影矩阵                                        |
| `viewMatrix`       | `mat4`  | 相机世界变换的逆                                    |
| `modelMatrix`      | `mat4`  | mesh 世界变换                                       |

## 📤 导出

```ts
import {
  ShaderPlayground, // React 组件 - 主入口
  ShaderEngine, // class     - 独立 Three.js 引擎（不带编辑器）
  CodeEditor, // React 组件 - Monaco 封装（不带引擎）
  PreviewCanvas, // React 组件 - 画布封装（不带编辑器）
  type GeometryType, // "plane" | "box" | "sphere"
  type ShaderError, // 编译错误结构体
} from "@lucascv/shaderpad-playground";
```

CSS 入口：

```ts
import "@lucascv/shaderpad-playground/styles";
// 等价于：import "@lucascv/shaderpad-playground/styles.css";
```

## ⚠️ 已知约束

- **必须客户端渲染**：Astro 用 `client:only="react"`，Next.js App Router 顶层加 `"use client"`。SSR 阶段 `window` / `WebGL` 调用会失败。
- **GLSL 须符合 `RawShaderMaterial` 约定**（Three.js 不会自动注入任何东西）：
  - 显式声明 `precision highp float;`
  - 顶点着色器需输出 `gl_Position`
  - 片元着色器需写入 `gl_FragColor`
- **`storageKey` 必传且全局唯一**：建议用文章路径（如 `"docs/glsl/uv-coords"`），否则用户编辑会跨文章串扰。
- **不支持纹理 / 自定义 uniform / 多 Pass**：保持引擎精简；需要的话 fork 自行扩展 `ShaderEngine`。
- **包体积**：核心 ~66KB（gzip），加上 `monaco-editor` / `three` 仍需由消费方提供。

## 🛠 贡献者

参与本包开发、内部 monorepo 调试、提交 PR，请看 [CONTRIBUTING.md](./CONTRIBUTING.md)。

## 📄 License

[MIT](./LICENSE) © Lucas

## 🙏 Credits

- [ShaderPad](https://shaderpad.lucaslib.net) —— 宿主主站
- [Three.js](https://threejs.org/) / [Monaco Editor](https://microsoft.github.io/monaco-editor/) / [React](https://react.dev/)
