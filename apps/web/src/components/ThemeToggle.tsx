/**
 * ThemeToggle —— 主题切换按钮
 *
 * 纯图标按钮：dark ↔ light 二态循环。
 * 不显示文字，悬停通过 title 提示当前模式。
 *
 * 图标使用 SVG（与工具栏里 GitHub 按钮风格一致），保证跨平台一致渲染。
 */

import { useStore } from "@nanostores/react";
import { themeMode, cycleTheme, themeLabel } from "@/lib/theme";
import type { ThemeMode } from "@/lib/theme";

export function ThemeToggle() {
  const mode = useStore(themeMode);

  return (
    <button
      onClick={cycleTheme}
      title={`主题：${themeLabel(mode)}（点击切换）`}
      aria-label="切换主题"
      style={{
        width: 32,
        height: 32,
        padding: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        color: "var(--text-primary)",
        border: "1px solid transparent",
        borderRadius: 5,
        cursor: "pointer",
        transition: "background 0.15s, border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-tertiary)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <ThemeIcon mode={mode} />
    </button>
  );
}

/** 当前主题对应的 SVG 图标 */
function ThemeIcon({ mode }: { mode: ThemeMode }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (mode === "dark") {
    // 月亮
    return (
      <svg {...common}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
  }

  // light
  // 太阳
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m4.93 19.07 1.41-1.41" />
      <path d="m17.66 6.34 1.41-1.41" />
    </svg>
  );
}
