/**
 * @shaderpad/playground —— 公共 API
 *
 * 嵌入式 GLSL Playground 组件：在 MDX/MD 文章中嵌入可交互的 GLSL 编辑器+预览。
 *
 * 最小示例：
 *
 *   import { ShaderPlayground } from '@shaderpad/playground';
 *
 *   <ShaderPlayground
 *     code={`precision highp float;
 * void main() {
 *   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
 * }`}
 *     storageKey="my-article/greeting"
 *   />
 *
 * 样式（可选）：
 *   import '@shaderpad/playground/styles';
 */

export { ShaderPlayground } from "./ui/ShaderPlayground";
export type {
  ShaderPlaygroundProps,
  ShaderType,
  ResolvedTheme,
} from "./ui/ShaderPlayground";

export { ShaderEngine } from "./runtime/three-engine";
export type {
  GeometryType,
  ShaderError,
  EngineOptions,
} from "./runtime/three-engine";

export { CodeEditor } from "./ui/CodeEditor";
export { PreviewCanvas } from "./ui/PreviewCanvas";
