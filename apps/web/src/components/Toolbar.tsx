/**
 * Toolbar —— 顶部工具栏
 *
 * 左侧：Brand + 几何体下拉 + Examples 下拉
 * 右侧：Share / ThemeToggle / LanguageSwitcher / GitHub
 *
 * 两个下拉菜单通过 `openMenu` 互斥：只允许一个展开。
 * 点击外部关闭由各下拉组件自身处理。
 */

import { useState } from "react";
import type { ReactNode } from "react";
import type { GeometryType } from "@shaderpad/playground";
import type { ShaderExample } from "@/shaders/examples";
import { GeometrySelect } from "./GeometrySelect";
import { ThemeToggle } from "./ThemeToggle";

type Menu = "geometry" | "examples" | null;

interface Props {
  examples: ShaderExample[];
  onLoadExample: (id: string) => void;
  geometry: GeometryType;
  onChangeGeometry: (next: GeometryType) => void;
  rightSlot?: ReactNode;
}

export function Toolbar({
  examples,
  onLoadExample,
  geometry,
  onChangeGeometry,
  rightSlot,
}: Props) {
  const [openMenu, setOpenMenu] = useState<Menu>(null);
  const [shareCopied, setShareCopied] = useState(false);

  const toggle = (m: Exclude<Menu, null>) =>
    setOpenMenu((cur) => (cur === m ? null : m));

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

        <GeometrySelect
          current={geometry}
          onChange={onChangeGeometry}
          open={openMenu === "geometry"}
          onOpenChange={(o) => setOpenMenu(o ? "geometry" : null)}
        />

        <div style={{ position: "relative" }}>
          <button
            onClick={() => toggle("examples")}
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
            <span>Examples</span>
            <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
          </button>
          {openMenu === "examples" && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                marginTop: 4,
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                minWidth: 240,
                zIndex: 100,
                padding: 4,
                boxShadow: "0 4px 12px var(--shadow)",
              }}
            >
              {examples.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => {
                    onLoadExample(ex.id);
                    setOpenMenu(null);
                  }}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: 4,
                    color: "var(--text-primary)",
                  }}
                >
                  <div style={{ fontWeight: 500, fontSize: 13 }}>{ex.name}</div>
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
      </div>

      <div className="toolbar-right">
        {rightSlot}

        <button onClick={handleShare} title="复制当前 URL 到剪贴板">
          {shareCopied ? "✓ Copied" : "Share"}
        </button>

        <ThemeToggle />

        <a
          href="https://docs.zhouweibin.top/docs/%E5%9B%BE%E5%BD%A2%E5%AD%A6/glsl_tutorial/"
          target="_blank"
          rel="noopener noreferrer"
          title="GLSL 教程文档"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            padding: "4px 10px",
            color: "var(--text-primary)",
            textDecoration: "none",
            borderRadius: 5,
            opacity: 0.85,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.85";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M1 2.828c.885-.37 2.154-.769 3.388-.893 1.33-.134 2.458.063 3.112.752v9.746c-.935-.53-2.12-.603-3.213-.493-1.18.12-2.37.461-3.287.811V2.828zm7.5-.141c.654-.689 1.782-.886 3.112-.752 1.234.124 2.503.523 3.388.893v9.923c-.918-.35-2.107-.692-3.287-.81-1.094-.111-2.278-.039-3.213.492V2.687zM8 1.783C7.015.936 5.587.81 4.287.94c-1.514.153-3.042.672-3.994 1.105A.5.5 0 0 0 0 2.5v11a.5.5 0 0 0 .707.455c.882-.4 2.303-.881 3.68-1.02 1.409-.142 2.59.087 3.223.877a.5.5 0 0 0 .78 0c.633-.79 1.814-1.019 3.222-.877 1.378.139 2.8.62 3.681 1.02A.5.5 0 0 0 16 13.5v-11a.5.5 0 0 0-.293-.455c-.952-.433-2.48-.952-3.994-1.105C10.413.809 8.985.936 8 1.783z" />
          </svg>
          <span>GLSL 教程</span>
        </a>

        <a
          href="https://github.com/GitHubJackson/shaderpad"
          target="_blank"
          rel="noopener noreferrer"
          title="View source on GitHub"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            fontSize: 12,
            padding: "4px 10px",
            color: "var(--text-primary)",
            textDecoration: "none",
            borderRadius: 5,
            opacity: 0.85,
            transition: "all 0.15s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.85";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>
    </div>
  );
}
