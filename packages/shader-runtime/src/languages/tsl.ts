/**
 * TSL Adapter —— Three.js Shading Language
 * 状态：占位，Phase 3 启用
 */

import type {
  LanguageAdapter,
  UniformDecl,
  CompileResult,
  ShaderStage,
} from "./types.js";

function notImplemented(): never {
  throw new Error(
    "[TSL Adapter] TSL support is planned for Phase 3. Coming soon.",
  );
}

export const tslAdapter: LanguageAdapter = {
  id: "tsl",
  monacoLanguage: "javascript", // TSL 是 JS/TS 风格的节点式语法
  displayName: "TSL (Three.js)",
  implemented: false,
  docUrl: "https://threejs.org/docs/#manual/en/introduction/TSL",
  defaultHeader:
    "// TSL · Three.js Shading Language\n// 节点式构造，依赖 three/tsl\n",

  defaultEntry(_stage: ShaderStage): string {
    notImplemented();
  },

  injectUniforms(_uniforms: UniformDecl[]): string {
    notImplemented();
  },

  async compile(_code, _stage): Promise<CompileResult> {
    notImplemented();
  },

  parseErrors() {
    return [];
  },
};
