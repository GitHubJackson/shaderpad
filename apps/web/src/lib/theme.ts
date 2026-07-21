/**
 * 全局主题 store
 * - 'dark' | 'light' | 'system'
 * - 持久化到 localStorage
 * - system 模式跟随 prefers-color-scheme
 */

import { atom } from 'nanostores';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'shaderpad:theme';
const DEFAULT_MODE: ThemeMode = 'dark';

export const themeMode = atom<ThemeMode>(DEFAULT_MODE);

/** 当前解析后的主题（考虑 system 模式） */
export const resolvedTheme = atom<ResolvedTheme>('dark');

/** 加载 localStorage 中的主题偏好 */
function loadMode(): ThemeMode {
  if (typeof window === 'undefined') return DEFAULT_MODE;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'dark' || v === 'light' || v === 'system') return v;
  } catch {
    // ignore
  }
  return DEFAULT_MODE;
}

/** 根据 mode 解析出实际主题 */
function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode !== 'system') return mode;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** 把主题应用到 <html data-theme="..."> */
function applyTheme(theme: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  // Monaco 需要 meta colorScheme 提示
  document.documentElement.style.colorScheme = theme;
}

/** 切换主题（在 dark / light / system 之间循环） */
export function cycleTheme() {
  const current = themeMode.get();
  const next: ThemeMode = current === 'dark' ? 'light' : current === 'light' ? 'system' : 'dark';
  setTheme(next);
}

/** 直接设置主题 */
export function setTheme(mode: ThemeMode) {
  themeMode.set(mode);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }
  const resolved = resolveMode(mode);
  resolvedTheme.set(resolved);
  applyTheme(resolved);
}

/** 初始化（在客户端 mount 时调用） */
export function initTheme() {
  const mode = loadMode();
  setTheme(mode);

  // 监听系统主题变化
  if (typeof window !== 'undefined' && window.matchMedia) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (themeMode.get() === 'system') {
        const resolved = mq.matches ? 'dark' : 'light';
        resolvedTheme.set(resolved);
        applyTheme(resolved);
      }
    };
    mq.addEventListener('change', onChange);
  }
}

/** 主题对应的图标字符 */
export function themeIcon(mode: ThemeMode): string {
  return mode === 'dark' ? '🌙' : mode === 'light' ? '☀️' : '💻';
}

/** 主题对应的显示文本 */
export function themeLabel(mode: ThemeMode): string {
  return mode === 'dark' ? '暗色' : mode === 'light' ? '亮色' : '跟随系统';
}

/** SSR 时预读取 localStorage 注入到 html，避免首次渲染闪烁 */
export function getInitialThemeScript(): string {
  return `
    (function() {
      try {
        var v = localStorage.getItem('${STORAGE_KEY}');
        var mode = (v === 'dark' || v === 'light' || v === 'system') ? v : 'dark';
        var resolved = mode;
        if (mode === 'system') {
          resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', resolved);
        document.documentElement.style.colorScheme = resolved;
      } catch (e) {}
    })();
  `;
}
