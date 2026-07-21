/**
 * CopyButton —— 复制按钮
 *
 * 按钮自身只管视觉样式和点击行为，定位由父级容器提供（通常用 flex 容器包起来）。
 */

import { useState } from "react";
import type { CSSProperties } from "react";

interface Props {
  text: string;
  label?: string;
  style?: CSSProperties;
  title?: string;
}

export function CopyButton({ text, label = "Copy", style, title }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for older browsers / iframe
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        // ignore
      } finally {
        document.body.removeChild(ta);
      }
    }
  };

  return (
    <button
      onClick={handleCopy}
      title={title || "Copy code to clipboard"}
      style={{
        fontSize: 12,
        padding: "4px 10px",
        background: copied ? "var(--success)" : "var(--bg-tertiary)",
        color: copied ? "#0a0a0f" : "var(--text-primary)",
        border: "1px solid var(--border)",
        borderRadius: 5,
        boxShadow: "0 2px 6px var(--shadow)",
        opacity: 0.85,
        transition: "all 0.15s",
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = "1";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = "0.85";
      }}
    >
      {copied ? "✓ Copied" : `📋 ${label}`}
    </button>
  );
}
