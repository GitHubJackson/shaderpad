/**
 * localStorage 自动保存
 *
 * - 每次编辑器内容变化后 1s 防抖写入 localStorage
 * - key 前缀：shaderpad:code:
 * - 同一 key 在不同 language + stage + geometry 下分开保存
 *   （每个几何体独立的代码空间，切换几何体不会"污染"代码）
 */

import type { GeometryType } from "@/lib/runtime/three-engine";
import type { ShaderLanguageId, ShaderStage } from "@shaderpad/runtime";

const STORAGE_PREFIX = "shaderpad:code:";
const STORAGE_LANG_KEY = "shaderpad:lang";
const STORAGE_STAGE_KEY = "shaderpad:stage";
const STORAGE_GEOMETRY_KEY = "shaderpad:geometry";
const DEBOUNCE_MS = 1000;

function storageKey(
  lang: ShaderLanguageId,
  stage: ShaderStage,
  geometry: GeometryType,
): string {
  return `${STORAGE_PREFIX}${lang}:${stage}:${geometry}`;
}

export function loadSavedCode(
  lang: ShaderLanguageId,
  stage: ShaderStage,
  geometry: GeometryType,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(storageKey(lang, stage, geometry));
  } catch {
    return null;
  }
}

export function saveCode(
  lang: ShaderLanguageId,
  stage: ShaderStage,
  code: string,
  geometry: GeometryType,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(lang, stage, geometry), code);
  } catch {
    // quota exceeded 等异常静默处理
  }
}

export function loadLastLang(): ShaderLanguageId | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_LANG_KEY);
    if (v === "glsl" || v === "tsl" || v === "wgsl") return v;
    return null;
  } catch {
    return null;
  }
}

export function saveLastLang(lang: ShaderLanguageId): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_LANG_KEY, lang);
  } catch {
    // ignore
  }
}

export function loadLastStage(): ShaderStage | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_STAGE_KEY);
    if (v === "vertex" || v === "fragment" || v === "compute") return v;
    return null;
  } catch {
    return null;
  }
}

export function saveLastStage(stage: ShaderStage): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_STAGE_KEY, stage);
  } catch {
    // ignore
  }
}

export function loadLastGeometry(): GeometryType | null {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_GEOMETRY_KEY);
    if (v === "plane" || v === "box" || v === "sphere") return v;
    return null;
  } catch {
    return null;
  }
}

export function saveLastGeometry(geometry: GeometryType): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_GEOMETRY_KEY, geometry);
  } catch {
    // ignore
  }
}

/**
 * 创建防抖自动保存器
 * @param getCode 获取当前代码的函数
 * @returns trigger 函数，调用后 1s 自动写入 localStorage
 */
export function createAutoSaver(
  lang: ShaderLanguageId,
  stage: ShaderStage,
  geometry: GeometryType,
  getCode: () => string,
  onSaved?: (code: string) => void,
) {
  let timer: number | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      const code = getCode();
      saveCode(lang, stage, code, geometry);
      onSaved?.(code);
    }, DEBOUNCE_MS);
  };
}
