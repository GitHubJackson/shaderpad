/**
 * WGSL Adapter —— WebGPU Shading Language
 * 状态：占位，Phase 4 启用
 */

import type {
  LanguageAdapter,
  UniformDecl,
  CompileResult,
  ShaderStage,
} from "./types.js";

function notImplemented(): never {
  throw new Error(
    "[WGSL Adapter] WGSL support is planned for Phase 4. Coming soon.",
  );
}

export const wgslAdapter: LanguageAdapter = {
  id: "wgsl",
  monacoLanguage: "wgsl",
  displayName: "WGSL (WebGPU)",
  implemented: false,
  docUrl: "https://www.w3.org/TR/WGSL/",
  defaultHeader:
    "// WGSL · WebGPU Shading Language\n// 原生 WebGPU 语法，Phase 4 启用\n",

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
