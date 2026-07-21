/**
 * @shaderpad/runtime —— 跨端共享渲染核心
 */

export {
  getAdapter,
  listAdapters,
  glslAdapter,
  tslAdapter,
  wgslAdapter,
} from './languages/index.js';

export type {
  LanguageAdapter,
  ShaderLanguageId,
  ShaderStage,
  GpuError,
  UniformDecl,
  CompileResult,
} from './languages/types.js';

export { DEFAULT_UNIFORMS } from './languages/glsl.js';
