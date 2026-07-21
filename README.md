# ShaderPad

> 在线 shader 调试工具，零环境配置。

[shaderpad.io](https://shaderpad.lucaslib.net) — 打开浏览器，30 秒写一个能跑的 shader。

## 它是什么

ShaderPad 是一个面向 Web 着色器学习的在线 playground。左边写代码，右边实时看效果，自动保存，URL 一键分享。

无需安装任何东西，无需配置环境，复制链接就能协作。

## 功能

- **实时预览** — 改一行代码，效果立刻变
- **多 stage 切换** — Vertex / Fragment 独立编辑
- **多语言支持** — GLSL（TSL / WGSL 规划中）
- **主题切换** — 暗 / 亮 / 跟随系统
- **示例集合** — 渐变、噪声、FBM、鼠标交互...
- **分享 & 保存** — URL 一键分享、localStorage 自动保存
- **错误诊断** — 编译错误实时显示在右下角面板

## 本地开发

需要 [Node.js 20+](https://nodejs.org) 和 [pnpm](https://pnpm.io)。

```bash
pnpm install
pnpm dev
```

然后打开 [http://localhost:4321](http://localhost:4321)。

## 状态

- ✅ GLSL 编辑器 + 实时预览
- ✅ Vertex / Fragment stage 切换
- ✅ 主题切换（暗 / 亮 / 跟随系统）
- ✅ URL 分享、localStorage 自动保存
- ✅ 编译错误诊断面板
- ⏳ TSL / WGSL 支持
- ⏳ 性能分析器

## 文档

- [部署文档](./DEPLOYMENT.md) — 生产环境部署 + Nginx Proxy Manager + SSL
- [技术方案](./index.md) — 架构设计与实现细节
