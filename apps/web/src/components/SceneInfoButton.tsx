/**
 * SceneInfoButton —— 场景悬浮说明按钮
 *
 * 位于 canvas pane 的右上角，点击后展开一个浮层面板，说明：
 * - 坐标轴颜色（X 红 / Y 绿 / Z 蓝，与 AxesHelper 一致）
 * - OrbitControls 鼠标操作
 * - 当前几何体类型
 *
 * 点击外部自动关闭。
 */

import { useEffect, useRef, useState } from "react";
import type { GeometryType } from "@/lib/runtime/three-engine";

interface Props {
  geometry: GeometryType;
}

const GEOMETRY_LABEL: Record<GeometryType, string> = {
  plane: "平面 1.5×1.5",
  box: "立方体 1.2³",
  sphere: "球体 r=0.6",
};

const AXES: Array<{
  axis: "X" | "Y" | "Z";
  color: string;
  label: string;
}> = [
  { axis: "X", color: "#ff4d4d", label: "红" },
  { axis: "Y", color: "#5edc4d", label: "绿" },
  { axis: "Z", color: "#4d8bff", label: "蓝" },
];

export function SceneInfoButton({ geometry }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // 点击外部关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      style={{
        position: "absolute",
        top: 12,
        right: 12,
        zIndex: 5,
      }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        title="场景说明"
        aria-label="场景说明"
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--bg-secondary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border)",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 2px 6px var(--shadow)",
          fontFamily: "var(--font-sans, system-ui)",
        }}
      >
        ?
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: 36,
            right: 0,
            width: 240,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "10px 12px",
            fontSize: 12,
            lineHeight: 1.65,
            color: "var(--text-primary)",
            boxShadow: "0 6px 18px var(--shadow)",
            fontFamily: "var(--font-sans, system-ui)",
          }}
        >
          {/* 坐标轴 */}
          <div style={{ fontWeight: 600, marginBottom: 6 }}>
            坐标轴（AxesHelper）
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: "4px 10px",
              alignItems: "center",
              marginBottom: 10,
            }}
          >
            {AXES.map((a) => (
              <Row key={a.axis} axis={a.axis} color={a.color} label={a.label} />
            ))}
          </div>

          <Divider />

          {/* 鼠标操作 */}
          <div style={{ fontWeight: 600, marginBottom: 6 }}>鼠标操作</div>
          <div style={{ color: "var(--text-secondary)" }}>
            <div>
              <Key>左键拖动</Key> 旋转
            </div>
            <div>
              <Key>右键拖动</Key> 平移
            </div>
            <div>
              <Key>滚轮</Key> 缩放
            </div>
          </div>

          <Divider />

          {/* 当前几何体 */}
          <div style={{ fontWeight: 600, marginBottom: 4 }}>当前几何体</div>
          <div style={{ color: "var(--text-secondary)" }}>
            {GEOMETRY_LABEL[geometry]}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({
  axis,
  color,
  label,
}: {
  axis: string;
  color: string;
  label: string;
}) {
  return (
    <>
      <div
        style={{
          width: 14,
          height: 4,
          background: color,
          borderRadius: 1,
        }}
      />
      <div style={{ color: "var(--text-secondary)" }}>{axis} 轴</div>
      <div
        style={{
          color: "var(--text-muted)",
          fontFamily: "var(--font-mono, monospace)",
        }}
      >
        {label}
      </div>
    </>
  );
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: "inline-block",
        fontFamily: "var(--font-mono, monospace)",
        fontSize: 11,
        padding: "0 5px",
        marginRight: 4,
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border)",
        borderRadius: 3,
        color: "var(--text-primary)",
      }}
    >
      {children}
    </span>
  );
}

function Divider() {
  return (
    <div
      style={{
        height: 1,
        background: "var(--border)",
        margin: "8px 0",
      }}
    />
  );
}
