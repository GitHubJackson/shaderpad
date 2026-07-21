/**
 * Language Adapter 注册表
 *
 * Editor / Canvas 通过此注册表加载具体 adapter，扩展新语言只需：
 * 1. 实现新的 adapter
 * 2. 在此注册
 */

import type { LanguageAdapter, ShaderLanguageId } from './types.js';
import { glslAdapter } from './glsl.js';
import { tslAdapter } from './tsl.js';
import { wgslAdapter } from './wgsl.js';

const ADAPTERS: Record<ShaderLanguageId, LanguageAdapter> = {
  glsl: glslAdapter,
  tsl: tslAdapter,
  wgsl: wgslAdapter,
};

export function getAdapter(id: ShaderLanguageId): LanguageAdapter {
  return ADAPTERS[id];
}

export function listAdapters(): LanguageAdapter[] {
  return Object.values(ADAPTERS);
}

export { glslAdapter, tslAdapter, wgslAdapter };
export type { LanguageAdapter, ShaderLanguageId, GpuError, UniformDecl } from './types.js';
