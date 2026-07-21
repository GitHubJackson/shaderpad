/**
 * ThemeToggle —— 主题切换按钮
 * 点击循环 dark → light → system → dark
 */

import { useStore } from '@nanostores/react';
import { themeMode, cycleTheme, themeIcon, themeLabel } from '@/lib/theme';

export function ThemeToggle() {
  const mode = useStore(themeMode);

  return (
    <button
      onClick={cycleTheme}
      title={`主题：${themeLabel(mode)}（点击切换）`}
      style={{
        minWidth: 36,
        fontSize: 14,
        padding: '5px 10px',
      }}
    >
      <span style={{ marginRight: 4 }}>{themeIcon(mode)}</span>
      <span style={{ fontSize: 12, opacity: 0.8 }}>{themeLabel(mode)}</span>
    </button>
  );
}
