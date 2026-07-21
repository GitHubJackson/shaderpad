/**
 * CopyButton —— 复制按钮
 * 可用两种模式：
 * - inline: 用于 Toolbar
 * - overlay: 绝对定位在容器右上角（编辑器右上方用）
 */

import { useState } from 'react';
import type { CSSProperties } from 'react';

interface Props {
  text: string;
  label?: string;
  variant?: 'inline' | 'overlay';
  style?: CSSProperties;
  title?: string;
}

export function CopyButton({ text, label = '复制', variant = 'inline', style, title }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers / iframe
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // ignore
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  if (variant === 'overlay') {
    return (
      <button
        onClick={handleCopy}
        title={title || '复制代码到剪贴板'}
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 5,
          fontSize: 12,
          padding: '4px 10px',
          background: copied ? 'var(--success)' : 'var(--bg-tertiary)',
          color: copied ? '#0a0a0f' : 'var(--text-primary)',
          border: '1px solid var(--border)',
          borderRadius: 5,
          boxShadow: '0 2px 6px var(--shadow)',
          opacity: 0.85,
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
        {copied ? '✓ 已复制' : `📋 ${label}`}
      </button>
    );
  }

  return (
    <button
      onClick={handleCopy}
      style={style}
    >
      {copied ? '✓ 已复制' : `📋 ${label}`}
    </button>
  );
}
