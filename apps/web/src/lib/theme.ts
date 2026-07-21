/**
 * 全局主题 store
 * - 'dark' | 'light' 二选一循环
 * - 持久化到 localStorage
 */

import { atom } from "nanostores";

export type ThemeMode = "dark" | "light";
export type ResolvedTheme = "dark" | "light";

const STORAGE_KEY = "shaderpad:theme";
const DEFAULT_MODE: ThemeMode = "dark";

export const themeMode = atom<ThemeMode>(DEFAULT_MODE);

/** 当前解析后的主题（这里等同于 themeMode） */
export const resolvedTheme = atom<ResolvedTheme>("dark");

/** 加载 localStorage 中的主题偏好 */
function loadMode(): ThemeMode {
  if (typeof window === "undefined") return DEFAULT_MODE;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "dark" || v === "light") return v;
  } catch {
    // ignore
  }
  return DEFAULT_MODE;
}

/** 把主题应用到 <html data-theme="..."> */
function applyTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  // Monaco 需要 meta colorScheme 提示
  document.documentElement.style.colorScheme = theme;
}

/** 切换主题（dark ↔ light 二态循环） */
export function cycleTheme() {
  const current = themeMode.get();
  const next: ThemeMode = current === "dark" ? "light" : "dark";
  setTheme(next);
}

/** 直接设置主题 */
export function setTheme(mode: ThemeMode) {
  themeMode.set(mode);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }
  resolvedTheme.set(mode);
  applyTheme(mode);
}

/** 初始化（在客户端 mount 时调用） */
export function initTheme() {
  const mode = loadMode();
  setTheme(mode);
}

/** 主题对应的显示文本 */
export function themeLabel(mode: ThemeMode): string {
  return mode === "dark" ? "暗色" : "亮色";
}

/** SSR 时预读取 localStorage 注入到 html，避免首次渲染闪烁 */
export function getInitialThemeScript(): string {
  return `
    (function() {
      try {
        var v = localStorage.getItem('${STORAGE_KEY}');
        var mode = (v === 'dark' || v === 'light') ? v : 'dark';
        document.documentElement.setAttribute('data-theme', mode);
        document.documentElement.style.colorScheme = mode;
      } catch (e) {}
    })();
  `;
}
