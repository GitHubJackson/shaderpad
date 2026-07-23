# @shaderpad/playground

可嵌入到 MDX / Markdown 文章中的 **GLSL 编辑器 + 实时预览** 组件。源自 [ShaderPad](https://shaderpad.lucaslib.net) 站点的核心交互模块。

## 安装

monorepo 内已通过 `workspace:*` 引用，**无需手动安装**。

```jsonc
// apps/<your-site>/package.json
{
  "dependencies": {
    "@shaderpad/playground": "workspace:*"
  }
}
```

## 在 MDX 中使用

```mdx
---
title: 我的 GLSL 教程
---

import { ShaderPlayground } from "@shaderpad/playground";
import "@shaderpad/playground/styles";

试试把 `vec4(1.0, 0.0, 0.0, 1.0)` 改成别的颜色：

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

在 Astro 中：

```astro
---
import { ShaderPlayground } from "@shaderpad/playground";
import "@shaderpad/playground/styles";
---

<ShaderPlayground
  client:only="react"
  code="..."
  storageKey="my-article/greeting"
/>
```

## Props

| Prop           | 类型                                  | 默认值       | 说明 |
| -------------- | ------------------------------------- | ------------ | ---- |
| `code`         | `string`                              | —            | 初始 GLSL 源码（必填） |
| `type`         | `"vertex" \| "fragment"`              | `"fragment"` | 当前编辑的是哪个 stage，另一个 stage 会用占位默认 |
| `geometry`     | `"plane" \| "box" \| "sphere"`        | `"plane"`    | 渲染目标几何体 |
| `height`       | `number`                              | `360`        | 画布高度（像素） |
| `readonly`     | `boolean`                             | `false`      | 设为 `true` 则只读，无编辑器交互 |
| `theme`        | `"auto" \| "dark" \| "light"`         | `"auto"`     | 主题：auto 跟随 `<html data-theme>`，否则强制 |
| `storageKey`   | `string`                              | —            | 持久化用户编辑的 localStorage 键（建议用文章路径） |
| `showHelpers`  | `boolean`                             | `true`       | 是否显示 3D 辅助线（grid + axes） |
| `title`        | `string`                              | 自动         | 顶部小条标题，传 `""` 隐藏 |

## 内置 Uniforms

引擎会在每帧把以下 uniforms 写入 material，文章中的 GLSL 可直接使用：

| Uniform            | 类型      | 含义 |
| ------------------ | --------- | ---- |
| `u_time`           | `float`   | 启动到当前的秒数 |
| `u_resolution`     | `vec2`    | 画布像素尺寸（容器 clientWidth/clientHeight） |
| `u_mouse`           | `vec2`    | 鼠标归一化坐标（Y 已翻转，[0,1]） |
| `u_random`         | `float`   | 引擎初始化时的 `Math.random()` |
| `projectionMatrix` | `mat4`    | 相机投影矩阵 |
| `viewMatrix`       | `mat4`    | 相机世界变换的逆 |
| `modelMatrix`      | `mat4`    | mesh 世界变换 |

## 导出

| 名称                | 类型                | 用途 |
| ------------------- | ------------------- | ---- |
| `ShaderPlayground`  | React 组件          | **主入口**，直接在 MDX 里用 |
| `ShaderEngine`      | class               | 独立 Three.js 渲染引擎，可单独使用 |
| `CodeEditor`        | React 组件          | Monaco 封装（不带引擎） |
| `PreviewCanvas`     | React 组件          | 画布封装（不带编辑器） |
| `GeometryType`      | type                | `"plane" \| "box" \| "sphere"` |
| `ShaderError`       | type                | 编译错误结构体 |

## 架构

```
packages/shader-playground/
├── src/
│   ├── runtime/
│   │   └── three-engine.ts        # ShaderEngine: Three.js + RawShaderMaterial
│   ├── ui/
│   │   ├── ShaderPlayground.tsx   # 容器组件（公开 API）
│   │   ├── CodeEditor.tsx         # Monaco 封装
│   │   ├── PreviewCanvas.tsx      # 3D 画布
│   │   ├── monaco-themes.ts       # 自定义暗/亮主题
│   │   ├── glsl-monarch.ts        # GLSL 语法高亮
│   │   └── storage.ts             # localStorage 草稿
│   ├── styles/
│   │   └── playground.css         # 嵌入式样式（独立 CSS 变量）
│   └── index.ts                   # 公共 API
├── package.json
└── tsconfig.json
```

## 已知约束

- 必须**客户端渲染**：Astro 中使用 `client:only="react"`，否则 SSR 阶段 WebGL 调用会报错。
- GLSL 编译依赖浏览器的 WebGL2 驱动，所以编辑器中的代码**要符合 RawShaderMaterial 约定**：
  - 显式声明 `precision highp float;`
  - 顶点着色器需输出 `gl_Position`
  - 片元着色器需写入 `gl_FragColor`
- 嵌入到多篇文章时务必为每个实例设置**不同的 `storageKey`**，否则用户编辑会跨文章串扰。

## 开发

```bash
# 类型检查
pnpm -F @shaderpad/playground typecheck
```

修改代码后，`apps/web` 站点会自动热更新（Vite workspace 链接）。
