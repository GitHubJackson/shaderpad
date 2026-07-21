/**
 * SaveButton —— 手动触发按钮
 * 文案统一显示 "Run"，不展示保存反馈状态。
 *
 * 按钮自身只管视觉样式，定位由父级容器提供（通常用 flex 容器包起来）。
 */

import type { CSSProperties } from 'react';

interface Props {
  onRun: () => void;
  label?: string;
  style?: CSSProperties;
  title?: string;
}

export function SaveButton({ onRun, label = 'Run', style, title }: Props) {
  return (
    <button
      onClick={onRun}
      title={title || '立即保存到 localStorage'}
      style={{
        fontSize: 12,
        padding: '4px 10px',
        background: 'var(--accent)',
        color: '#0a0a0f',
        border: '1px solid var(--accent)',
        borderRadius: 5,
        boxShadow: '0 2px 6px var(--shadow)',
        opacity: 0.95,
        transition: 'all 0.15s',
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.85';
      }}
    >
      ▶ {label}
    </button>
  );
}


