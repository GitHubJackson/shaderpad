/**
 * GeometrySelect —— 几何体类型下拉选择器
 *
 * 风格与 Toolbar 里的 Examples 下拉一致，点击外部区域自动收起。
 */

import { useEffect, useRef, useState } from "react";
import type { GeometryType } from "@shaderpad/playground";

interface Option {
  id: GeometryType;
  label: string;
  icon: string;
}

const OPTIONS: Option[] = [
  { id: "plane", label: "PlaneGeometry", icon: "▭" },
  { id: "box", label: "BoxGeometry", icon: "◻" },
  { id: "sphere", label: "SphereGeometry", icon: "◯" },
];

interface Props {
  current: GeometryType;
  onChange: (geometry: GeometryType) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GeometrySelect({
  current,
  onChange,
  open,
  onOpenChange,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部区域关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onOpenChange]);

  const currentOption = OPTIONS.find((o) => o.id === current) || OPTIONS[0];

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => onOpenChange(!open)}
        title="选择几何体类型"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          fontSize: 13,
          padding: "4px 10px",
          background: "var(--bg-tertiary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          borderRadius: 5,
        }}
      >
        <span style={{ fontSize: 14 }}>{currentOption.icon}</span>
        <span>{currentOption.label}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            minWidth: 180,
            zIndex: 100,
            padding: 4,
            boxShadow: "0 4px 12px var(--shadow)",
          }}
        >
          {OPTIONS.map((opt) => {
            const isActive = current === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => {
                  onChange(opt.id);
                  onOpenChange(false);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  width: "100%",
                  textAlign: "left",
                  background: isActive ? "var(--bg-primary)" : "transparent",
                  color: isActive ? "var(--accent)" : "var(--text-primary)",
                  border: "none",
                  padding: "6px 10px",
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                <span style={{ fontSize: 14, width: 16, textAlign: "center" }}>
                  {opt.icon}
                </span>
                <span style={{ flex: 1 }}>{opt.label}</span>
                {isActive && <span style={{ fontSize: 11 }}>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
