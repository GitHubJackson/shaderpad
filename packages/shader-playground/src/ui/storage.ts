/**
 * Playground 的 localStorage 辅助
 *
 * 每个 ShaderPlayground 实例在用户编辑时把代码存到
 * `shaderpad:playground:${storageKey}`，下次打开文章时恢复。
 *
 * storageKey 由调用方提供；不提供时跳过持久化（每次都是初始 code）。
 */

const PREFIX = "shaderpad:playground:";

export function loadPlaygroundDraft(storageKey: string | undefined): string | null {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    return localStorage.getItem(PREFIX + storageKey);
  } catch {
    return null;
  }
}

export function savePlaygroundDraft(storageKey: string | undefined, code: string): void {
  if (!storageKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + storageKey, code);
  } catch {
    // quota exceeded 等异常静默处理
  }
}

export function clearPlaygroundDraft(storageKey: string | undefined): void {
  if (!storageKey || typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFIX + storageKey);
  } catch {
    // ignore
  }
}
