# ShaderPad

> 在线 shader 调试工具，零环境配置。

[shaderpad.lucaslib.net](https://shaderpad.lucaslib.net) — 打开浏览器，30 秒写一个能跑的 shader。

## 它是什么

ShaderPad 是一个面向 Web 着色器学习的在线 playground。左边写 GLSL，右边 Three.js 实时渲染，自动保存，URL 一键分享。

无需安装任何东西，无需配置环境，复制链接就能协作。

## 功能

- **实时预览** — 改一行代码，效果立刻变
- **多 stage 切换** — Vertex / Fragment 独立编辑
- **多几何体** — PlaneGeometry / BoxGeometry / SphereGeometry，切换时 Examples 列表自动筛选匹配示例
- **3D 场景控制** — 内置 OrbitControls，左键旋转 / 右键平移 / 滚轮缩放
- **辅助定位** — GridHelper（地面网格）+ AxesHelper（X 红 / Y 绿 / Z 蓝 坐标轴）
- **主题切换** — 暗 / 亮两态，纯 SVG 图标按钮
- **示例集合** — 渐变、噪声、FBM、顶点位移、MVP 矩阵、几何体专属示例...
- **分享 & 保存** — 复制当前 URL、localStorage 自动保存（按 lang × stage × geometry 三维独立）
- **手动 Run** — 编辑器右上角 Copy / ▶ Run 双按钮组
- **错误诊断** — 编译错误实时显示在右下角面板，行号 1:1 对应源码
- **场景说明** — Canvas 右上角 `?` 浮窗，解释坐标轴颜色和鼠标操作

## 本地开发

需要 [Node.js 20+](https://nodejs.org) 和 [pnpm 8.11+](https://pnpm.io)。

```bash
pnpm install
pnpm dev
```

然后打开 [http://localhost:4321](http://localhost:4321)。

## 技术栈

- **Astro 4** + React Island（内容站 + 单页 playground 混合架构）
- **Three.js 0.170** + WebGLRenderer + RawShaderMaterial（用户 source 即最终 GLSL）
- **Monaco Editor 0.50**（VSCode 同款编辑器）
- **nanostores** 0.11（极简状态管理）
- **pnpm 8.11** workspace monorepo

## 状态

- ✅ GLSL 编辑器 + 实时预览
- ✅ Vertex / Fragment stage 切换
- ✅ 主题切换（暗 / 亮）
- ✅ URL 分享、localStorage 自动保存（按三维键）
- ✅ 编译错误诊断面板（行号 1:1）
- ✅ 多几何体（Plane / Box / Sphere）切换
- ✅ OrbitControls + Grid/Axes 辅助
- ✅ 3/4 视角透视相机
- ✅ TSL / WGSL adapter 已在 `@shaderpad/runtime` 中就位（UI 集成中）
- ⏳ 性能分析器（FPS / 编译耗时）
- ⏳ TSL / WGSL UI 集成

## 许可证

MIT
