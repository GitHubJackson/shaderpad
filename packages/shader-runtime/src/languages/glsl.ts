/**
 * GLSL Adapter —— MVP 唯一实现的语言适配器
 *
 * 走 Three.js WebGPURenderer + RawShaderMaterial。
 * Three.js 内部使用 naga 把 GLSL 编译为 WGSL 后再走 WebGPU 驱动。
 */

import type {
  CompileResult,
  GpuError,
  LanguageAdapter,
  ShaderStage,
  UniformDecl,
} from "./types.js";

// ============================================================================
// Uniform 注入：抽象 -> GLSL
// ============================================================================

function uniformToGLSL(u: UniformDecl): string {
  // sampler 走 binding = binding 数字（与 iChannel 顺序对齐）
  return `uniform ${u.type} ${u.name};`;
}

const DEFAULT_UNIFORMS: UniformDecl[] = [
  { name: "u_time", type: "float" },
  { name: "u_resolution", type: "vec2" },
  { name: "u_mouse", type: "vec2" },
  { name: "u_random", type: "float" },
  { name: "u_channel0", type: "sampler2D" },
  { name: "u_channel1", type: "sampler2D" },
  { name: "u_channel2", type: "sampler2D" },
  { name: "u_channel3", type: "sampler2D" },
];

// ============================================================================
// 默认 entry 注入（用户没写 main 时保底）
// ============================================================================

function defaultEntryGLSL(stage: ShaderStage): string {
  switch (stage) {
    case "fragment":
      return "void main() {\n  gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);\n}";
    case "vertex":
      return `void main() {\n  gl_Position = vec4(position, 1.0);\n}`;
    case "compute":
      return `layout(local_size_x = 8, local_size_y = 8) in;\nvoid main() {}`;
  }
}

// ============================================================================
// 错误解析：WebGPU diagnostic -> GpuError
// ============================================================================

interface WGPUCompilationMessage {
  message: string;
  type: "error" | "warning" | "info";
  lineNum?: number;
  linePos?: number;
  offset?: number;
  length?: number;
}

function parseWGPUCompilationInfo(raw: unknown): GpuError[] {
  // Three.js RawShaderMaterial.getCompilationInfo() 返回 WebGPU 的
  // GPUCompilationInfo，messages 是 GPUCompilationMessage 数组
  const info = raw as { messages?: WGPUCompilationMessage[] } | undefined;
  if (!info?.messages) return [];

  const severity = (s: string): "error" | "warning" =>
    s === "error" ? "error" : "warning";

  return info.messages
    .filter((m) => m.type === "error" || m.type === "warning")
    .map<GpuError>((m) => ({
      line: m.lineNum ?? 0,
      column: m.linePos ?? 0,
      message: m.message,
      severity: severity(m.type),
    }));
}

// ============================================================================
// GLSL Adapter
// ============================================================================

export const glslAdapter: LanguageAdapter = {
  id: "glsl",
  monacoLanguage: "glsl",
  displayName: "GLSL",
  implemented: true,
  docUrl: "https://www.khronos.org/opengl/wiki/OpenGL_Shading_Language",
  defaultHeader:
    "// GLSL Fragment Shader\n// Available uniforms: u_time, u_resolution, u_mouse, u_random, u_channel0~3\n",

  defaultEntry(stage) {
    return defaultEntryGLSL(stage);
  },

  injectUniforms(uniforms: UniformDecl[] = DEFAULT_UNIFORMS): string {
    return uniforms.map(uniformToGLSL).join("\n");
  },

  async compile(code, stage): Promise<CompileResult> {
    // ==========================================================================
    // MVP 策略：GLSL → WGSL 转译交给 Three.js WebGLRenderer 处理
    //
    // 流程：
    // 1. 这里只做最轻量的语法 sanity check（void main 是否存在）
    // 2. 实际 GLSL 编译在 engine.applyShader() 创建 RawShaderMaterial 后，
    //    Three.js 首次 render 时由 WebGL 驱动完成
    // 3. 编译错误写到浏览器 console（WebGL 的 getShaderInfoLog）
    // 4. UI 层通过 canvas 是否成功渲染来反馈（空 canvas = 编译失败）
    //
    // Phase 2 改进：接入 naga-bin（wasm）做静态校验，
    // 把错误反哺到 error panel，提供 IDE 级别的红波浪线
    // ==========================================================================

    // 轻量 sanity check：用户至少得写个 main 入口
    if (!/\bvoid\s+main\s*\(/.test(code)) {
      const entry = this.defaultEntry(stage);
      return {
        ok: false,
        errors: [
          {
            line: 0,
            column: 0,
            severity: "error",
            message: `未找到 main() 入口。已自动追加默认实现：\n${entry}`,
          },
        ],
      };
    }

    return { ok: true };
  },

  parseErrors(raw) {
    return parseWGPUCompilationInfo(raw);
  },
};

export { DEFAULT_UNIFORMS };
