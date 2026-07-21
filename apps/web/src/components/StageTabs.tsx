/**
 * StageTabs —— 编辑器顶部 Stage 切换 Tab
 * 三个 stage：Vertex / Fragment / Compute
 * Compute 占位（Phase 4 启用）
 */

import type { ShaderStage } from "@shaderpad/runtime";

interface Tab {
  id: ShaderStage;
  label: string;
  shortcut: string;
  available: boolean;
  badge?: string;
}

const TABS: Tab[] = [
  { id: "vertex", label: "Vertex", shortcut: "V", available: true },
  { id: "fragment", label: "Fragment", shortcut: "F", available: true },
  {
    id: "compute",
    label: "Compute",
    shortcut: "C",
    available: false,
    badge: "Phase 4",
  },
];

interface Props {
  current: ShaderStage;
  onChange: (stage: ShaderStage) => void;
}

export function StageTabs({ current, onChange }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Shader stage"
      style={{
        display: "flex",
        alignItems: "stretch",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        height: 32,
        userSelect: "none",
      }}
    >
      {TABS.map((tab) => {
        const isActive = current === tab.id;
        const isDisabled = !tab.available;
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            disabled={isDisabled}
            onClick={() => !isDisabled && onChange(tab.id)}
            title={
              isDisabled
                ? `${tab.label} Shader (${tab.badge})`
                : `Switch to ${tab.label} Shader (${tab.shortcut})`
            }
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "0 16px",
              background: isActive ? "var(--bg-primary)" : "transparent",
              color: isDisabled
                ? "var(--text-muted)"
                : isActive
                  ? "var(--text-primary)"
                  : "var(--text-secondary)",
              border: "none",
              borderRight: "1px solid var(--border)",
              borderBottom: isActive
                ? "2px solid var(--accent)"
                : "2px solid transparent",
              borderRadius: 0,
              fontSize: 12,
              fontWeight: isActive ? 600 : 400,
              cursor: isDisabled ? "not-allowed" : "pointer",
              opacity: isDisabled ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            <span>{tab.label} Shader</span>
            {tab.badge && (
              <span
                style={{
                  fontSize: 9,
                  padding: "1px 5px",
                  background: "var(--bg-tertiary)",
                  color: "var(--text-muted)",
                  borderRadius: 3,
                  fontWeight: 500,
                }}
              >
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
