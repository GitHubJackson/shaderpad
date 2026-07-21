/**
 * Toolbar —— 顶部工具栏
 */

import { useState } from "react";
import type { ReactNode } from "react";
import type { ShaderExample } from "@/shaders/examples";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  status: "idle" | "compiling" | "ok" | "error";
  supportMsg?: string | null;
  examples: ShaderExample[];
  onLoadExample: (id: string) => void;
  onCopyCode?: () => void;
  rightSlot?: ReactNode;
}

export function Toolbar({
  status,
  examples,
  onLoadExample,
  onCopyCode,
  rightSlot,
}: Props) {
  const [showExamples, setShowExamples] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const handleShare = () => {
    const url = window.location.href; // MVP 暂用当前 URL（包含 ?code=）
    navigator.clipboard?.writeText(url).then(
      () => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 1500);
      },
      () => {
        // 失败：传统方案
        prompt("复制此 URL 分享：", url);
      },
    );
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <span className="brand">ShaderPad</span>
        <StatusBadge status={status} />
      </div>

      <div className="toolbar-right">
        {onCopyCode && (
          <button onClick={onCopyCode} title="复制当前代码到剪贴板">
            📋 Copy
          </button>
        )}

        <div style={{ position: "relative" }}>
          <button onClick={() => setShowExamples((s) => !s)}>Examples ▾</button>
          {showExamples && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                minWidth: 220,
                zIndex: 100,
                padding: 4,
              }}
            >
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    onLoadExample(ex.id);
                    setShowExamples(false);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: 4,
                  }}
                >
                  <div style={{ fontWeight: 500 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {ex.description}
                  </div>
                </button>
              ))}
              {examples.length === 0 && (
                <div style={{ padding: 8, color: "var(--text-muted)" }}>
                  No examples for this language
                </div>
              )}
            </div>
          )}
        </div>

        <button onClick={handleShare} title="复制当前 URL 到剪贴板">
          {shareCopied ? "✓ Copied" : "Share"}
        </button>

        <ThemeToggle />

        {rightSlot}
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "idle" | "compiling" | "ok" | "error";
}) {
  const map: Record<string, { text: string; cls: string }> = {
    idle: { text: "Ready", cls: "" },
    compiling: { text: "Compiling…", cls: "compiling" },
    ok: { text: "Running", cls: "ok" },
    error: { text: "Error", cls: "error" },
  };
  const { text, cls } = map[status];
  return <span className={`status-badge ${cls}`}>● {text}</span>;
}
