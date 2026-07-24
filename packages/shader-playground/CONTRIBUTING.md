# Contributing

本包对应 monorepo 内部位置 `packages/shader-playground/`，是 [ShaderPad](https://shaderpad.lucaslib.net) 主站核心模块的开源版本。发布到 npm 的名称是 **`@lucascv/shaderpad-playground`**。

## 开发环境

monorepo 使用 pnpm：

```bash
git clone https://github.com/GitHubJackson/shaderpad.git
cd shaderpad
pnpm install
```

Node 要求 `>= 20`，pnpm `>= 8`（见根 `package.json` 的 `engines` / `packageManager`）。

## 包目录结构

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
│   │   └── playground.css         # 嵌入式样式（独立 CSS 变量，前缀 spg-）
│   └── index.ts                   # 公共 API
├── examples/                      # 独立 MDX 示例（不在构建产物内）
├── package.json
├── tsconfig.json
└── tsup.config.ts                 # 打包配置（CJS-only + 经典 JSX 转换）
```

## 常用命令

所有命令都在 monorepo 根目录跑：

```bash
# 类型检查
pnpm -F @lucascv/shaderpad-playground typecheck

# 监听模式构建（tsup --watch）
pnpm -F @lucascv/shaderpad-playground dev

# 一次性构建
pnpm -F @lucascv/shaderpad-playground build

# 构建 + 打 tarball
pnpm -F @lucascv/shaderpad-playground pack
```

## 本地联调

跑 `pnpm dev` 会启动 `apps/web` 站点（默认 `http://localhost:4321/embed-test`）。修改本包代码通过 Vite workspace 链接**热更新**到 `apps/web`，无需重启。

跨框架验证用单独的 Docusaurus 站点 `my-docs`，通过 `file:../shaderPad/packages/shader-playground` 安装本包。

## 调试小贴士

- **Monaco 编辑器不显示**：检查 `<ShaderPlayground>` 是否被 SSR 渲染（Astro 必须 `client:only="react"`，Next.js 顶层必须 `"use client"`）。
- **WebGL 黑屏**：打开 DevTools Console 看 GLSL 编译错误浮条（默认右上角）；同时确认浏览器支持 WebGL2。
- **样式丢了**：忘了 `import "@lucascv/shaderpad-playground/styles"`。
- **包名找不到**：CI 场景用 OIDC（Trusted Publishing），本地用 `npm login` 后跑 `pnpm publish --otp=...`。

## 提交规范

- **一个 PR 只做一件事**：拆分功能 / 重构 / 文档为多个 PR。
- **改 `src/` 必跑 `pnpm -F @lucascv/shaderpad-playground typecheck`**。
- **改 `src/styles/` 必跑 `pnpm dev` 在浏览器里验证视觉效果**（看主题切换、窄屏堆叠）。
- **新增 / 修改 Props 必同步更新 [README.md](./README.md) 的 Props 表**。
- **优先兼容 React 17**（Docusaurus 2.x 用户基数大，需要走经典 JSX 转换，不能用 `react/jsx-runtime` 子路径）。
- **Commit message**：用 conventional commits 风格（`feat:` / `fix:` / `chore:` / `docs:`），方便阅读历史。不强制接 changesets（单包场景用 CI 手动 bump 更简单）。

## 版本号与发版

**本项目不依赖 changesets**（单包场景过度设计）。发版流程：

1. **本地**：把改完的代码 commit + push 到 main
2. **CI**：在 GitHub → Actions → Release workflow → Run workflow
   - 选 `bump`：patch（修 bug）/ minor（新功能）/ major（破坏性变更）
   - 选 `prerelease`：留空 = 正式版；填 `beta` / `rc` = 预发版
3. **CI 自动完成**：build → 升版本号 → publish 到 npm → 推回 version commit + tag

详见 [`.github/workflows/release.yml`](file:///Users/lucas/Documents/workspace/docs/glsl快速调试网页/shaderPad/.github/workflows/release.yml)。

## 测试

本包暂未引入单元测试（Three.js 渲染层 + Monaco 编辑器的单测 ROI 低），主要依赖端到端验证：

| 验证场景                                 | 工具                                        |
| ---------------------------------------- | ------------------------------------------- |
| 核心交互（编辑器 + 预览 + 持久化）       | `apps/web/src/pages/embed-test.astro`       |
| Docusaurus 2 + React 17 + Webpack 5 兼容 | 外部 Docusaurus 站点 `my-docs`              |
| 包名 / exports / types 完整性            | `pnpm dlx publint` + `tsc --noEmit` on dist |

## License

贡献的代码同样以 [MIT](./LICENSE) 协议发布。
