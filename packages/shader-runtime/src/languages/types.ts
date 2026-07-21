/**
 * LanguageAdapter —— 着色器语言抽象层
 *
 * 设计目的：让 Editor / Canvas / Compiler 与具体 shading language 解耦，
 * 支持 GLSL/TSL/WGSL 在同一编辑器中共存，扩展新语言零侵入。
 */

// WebGPU 类型别名 —— MVP 阶段不实际依赖 WebGPU，仅为 Phase 2 接口预留。
// 用 any 而非导入 @webgpu/types，避免给 runtime 包加额外依赖。
type GPUShaderModule = any;
type GPUDevice = any;

export type ShaderStage = "fragment" | "vertex" | "compute";
export type ShaderLanguageId = "glsl" | "tsl" | "wgsl";

export interface UniformDecl {
  name: string;
  type:
    | "float"
    | "vec2"
    | "vec3"
    | "vec4"
    | "int"
    | "sampler2D"
    | "samplerCube";
  binding?: number; // WGSL 用，TSL/GLSL 可选
  group?: number; // WGSL 用
}

export interface GpuError {
  line: number;
  column: number;
  message: string;
  severity: "error" | "warning";
}

export type CompileResult =
  | { ok: true; module?: GPUShaderModule }
  | { ok: false; errors: GpuError[] };

export interface LanguageAdapter {
  /** 唯一标识 */
  readonly id: ShaderLanguageId;

  /** Monaco language id（用于编辑器高亮） */
  readonly monacoLanguage: string;

  /** 显示名（UI 用） */
  readonly displayName: string;

  /** 是否已实现（MVP 阶段只有 glsl=true） */
  readonly implemented: boolean;

  /** 生成默认 entry（用户没写 main 时） */
  defaultEntry(stage: ShaderStage): string;

  /** 把抽象的 Uniform 列表注入到该语言的语法中 */
  injectUniforms(uniforms: UniformDecl[]): string;

  /**
   * 编译入口。
   * MVP 阶段（GLSL + WebGL）：仅做轻量校验，返回 ok=true，
   *   真正的 GLSL 编译由 Three.js WebGLRenderer 在首次渲染时完成，
   *   编译错误会写到浏览器 console。
   * Phase 2（WGSL/TSL + WebGPU）：可通过 device 参数调用 device.createShaderModule。
   */
  compile(
    code: string,
    stage: ShaderStage,
    device?: GPUDevice,
  ): Promise<CompileResult>;

  /** 解析原生编译错误为统一 GpuError 格式 */
  parseErrors(raw: unknown): GpuError[];

  /** 该语言官方文档链接（编辑器 help 按钮用） */
  readonly docUrl: string;

  /** 该语言的 import 头（用于自动 import） */
  readonly defaultHeader: string;
}
