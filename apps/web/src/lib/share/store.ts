/**
 * localStorage 自动保存
 *
 * - 每次编辑器内容变化后 300ms 防抖
 * - key 前缀：shaderpad:code:
 * - 同一 key 在不同 language + stage 下分开保存
 */

import type { ShaderLanguageId, ShaderStage } from "@shaderpad/runtime";

const STORAGE_PREFIX = "shaderpad:code:";
const STORAGE_LANG_KEY = "shaderpad:lang";
const STORAGE_STAGE_KEY = "shaderpad:stage";
const DEBOUNCE_MS = 300;

function storageKey(lang: ShaderLanguageId, stage: ShaderStage): string {
  return `${STORAGE_PREFIX}${lang}:${stage}`;
}

export function loadSavedCode(
  lang: ShaderLanguageId,
  stage: ShaderStage,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(storageKey(lang, stage));
  } catch {
    return null;
  }
}

export function saveCode(
  lang: ShaderLanguageId,
  stage: ShaderStage,
  code: string,
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(lang, stage), code);
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

/**
 * 创建防抖自动保存器
 * @param getCode 获取当前代码的函数
 * @returns trigger 函数，调用后 300ms 自动写入 localStorage
 */
export function createAutoSaver(
  lang: ShaderLanguageId,
  stage: ShaderStage,
  getCode: () => string,
  onSaved?: (code: string) => void,
) {
  let timer: number | undefined;
  return () => {
    if (timer) clearTimeout(timer);
    timer = window.setTimeout(() => {
      const code = getCode();
      saveCode(lang, stage, code);
      onSaved?.(code);
    }, DEBOUNCE_MS);
  };
}
