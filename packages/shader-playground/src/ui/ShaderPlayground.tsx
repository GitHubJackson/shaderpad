/**
 * ShaderPlayground —— 可嵌入 MDX/MD 文章的 GLSL Playground
 *
 * 支持两种模式：
 *
 * 1. 单 stage（向后兼容）：
 *
 *   <ShaderPlayground
 *     type="fragment"
 *     code={`precision highp float;
 * void main() {
 *   gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
 * }`}
 *   />
 *
 * 2. vertex + fragment 联动（推荐用于完整 shader 演示）：
 *
 *   <ShaderPlayground
 *     pair={{
 *       vertex: `void main() { gl_Position = vec4(position, 1.0); }`,
 *       fragment: `void main() { gl_FragColor = vec4(1.0); }`,
 *     }}
 *   />
 *
 * 布局：左右分屏（窄屏自动堆叠），编辑器和画布同高。
 */

import { useEffect, useMemo, useRef, useState } from "react";
import type { GeometryType, ShaderError } from "../runtime/three-engine";
import { CodeEditor } from "./CodeEditor";
import { PreviewCanvas } from "./PreviewCanvas";
import {
  clearPlaygroundDraft,
  loadPlaygroundDraft,
  savePlaygroundDraft,
} from "./storage";

export type ShaderType = "vertex" | "fragment";
export type ResolvedTheme = "dark" | "light";

/** 完整 shader 一对：vertex + fragment */
export interface ShaderPair {
  vertex: string;
  fragment: string;
}

export interface ShaderPlaygroundProps {
  // ===== 单 stage 模式 =====
  /** 单 stage 模式下的初始 GLSL 源码（与 pair 互斥） */
  code?: string;
  /** 单 stage 模式下当前编辑的是哪个 stage（默认 fragment） */
  type?: ShaderType;

  // ===== 双 stage 联动模式（推荐） =====
  /** 提供此属性时进入 pair 模式：编辑器带 Vertex/Fragment tab 切换，画布始终用两者联动 */
  pair?: ShaderPair;

  // ===== 通用 =====
  /** 渲染目标几何体（默认 plane） */
  geometry?: GeometryType;
  /** 画布高度（像素，默认 420）。编辑器与画布同高（左右分屏） */
  height?: number;
  /** 是否允许用户编辑代码（默认 true） */
  readonly?: boolean;
  /** 主题：auto 跟随 [data-theme]，dark/light 强制 */
  theme?: "auto" | ResolvedTheme;
  /** localStorage 隔离 key（建议用文章路径 + 章节 id） */
  storageKey?: string;
  /** 是否显示 3D 辅助线（grid + axes），默认 true */
  showHelpers?: boolean;
  /** 标题（顶部小条），空字符串隐藏 */
  title?: string;
}

const DEFAULT_VERTEX = `precision highp float;
attribute vec3 position;
void main() {
  gl_Position = vec4(position, 1.0);
}`;

const DEFAULT_FRAGMENT = `precision highp float;
void main() {
  gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
}`;

const DEBOUNCE_MS = 800;

export function ShaderPlayground(props: ShaderPlaygroundProps) {
  const {
    code: initialCode,
    type: initialType = "fragment",
    pair,
    geometry = "plane",
    height = 420,
    readonly = false,
    theme = "auto",
    storageKey,
    showHelpers = true,
    title,
  } = props;

  const isPairMode = pair !== undefined;

  return (
    <ShaderPlaygroundInner
      key={
        isPairMode
          ? `pair:${storageKey ?? "_"}`
          : `single:${initialType}:${storageKey ?? "_"}`
      }
      isPairMode={isPairMode}
      initialCode={initialCode ?? ""}
      initialType={initialType}
      pair={pair}
      geometry={geometry}
      height={height}
      readonly={readonly}
      theme={theme}
      storageKey={storageKey}
      showHelpers={showHelpers}
      title={title}
    />
  );
}

interface InnerProps extends Required<
  Pick<
    ShaderPlaygroundProps,
    "geometry" | "height" | "readonly" | "theme" | "showHelpers"
  >
> {
  isPairMode: boolean;
  initialCode: string;
  initialType: ShaderType;
  pair?: ShaderPair;
  storageKey?: string;
  title?: string;
}

function ShaderPlaygroundInner({
  isPairMode,
  initialCode,
  initialType,
  pair,
  geometry,
  height,
  readonly,
  theme,
  storageKey,
  showHelpers,
  title,
}: InnerProps) {
  const resolvedTheme: ResolvedTheme = useTheme(theme);

  // ===== Pair 模式：双 stage 状态 =====
  const initialPair = pair ?? { vertex: "", fragment: "" };
  const fallbackFor = (stage: ShaderType) =>
    stage === "vertex" ? DEFAULT_VERTEX : DEFAULT_FRAGMENT;

  // 首次 mount：draft > prop > 类型默认
  const [vertexCode, setVertexCode] = useState<string>(() => {
    if (isPairMode && storageKey) {
      const d = loadPlaygroundDraft(`${storageKey}:vertex`);
      if (d !== null) return d;
    }
    return isPairMode
      ? (pair?.vertex ?? fallbackFor("vertex"))
      : fallbackFor("vertex");
  });
  const [fragmentCode, setFragmentCode] = useState<string>(() => {
    if (isPairMode && storageKey) {
      const d = loadPlaygroundDraft(`${storageKey}:fragment`);
      if (d !== null) return d;
    }
    return isPairMode
      ? (pair?.fragment ?? fallbackFor("fragment"))
      : fallbackFor("fragment");
  });

  // 单 stage 模式：当前编辑 stage 的代码
  const [singleCode, setSingleCode] = useState<string>(() => {
    if (!isPairMode && storageKey) {
      const d = loadPlaygroundDraft(storageKey);
      if (d !== null) return d;
    }
    return initialCode || fallbackFor(initialType);
  });
  const [singleType] = useState<ShaderType>(initialType);

  // 当前展示的 stage（pair 模式才有意义）
  const [activeStage, setActiveStage] = useState<ShaderType>(
    isPairMode ? "fragment" : initialType,
  );

  // ===== prop 变化同步（热更新时跟随）=====
  const propSigRef = useRef<string>(
    JSON.stringify({ isPairMode, pair, initialCode, initialType }),
  );
  useEffect(() => {
    const sig = JSON.stringify({ isPairMode, pair, initialCode, initialType });
    if (sig === propSigRef.current) return;
    propSigRef.current = sig;
    if (isPairMode && pair) {
      setVertexCode(
        storageKey
          ? (loadPlaygroundDraft(`${storageKey}:vertex`) ?? pair.vertex)
          : pair.vertex,
      );
      setFragmentCode(
        storageKey
          ? (loadPlaygroundDraft(`${storageKey}:fragment`) ?? pair.fragment)
          : pair.fragment,
      );
    } else {
      setSingleCode(
        storageKey
          ? (loadPlaygroundDraft(storageKey) ??
              initialCode ??
              fallbackFor(initialType))
          : initialCode || fallbackFor(initialType),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPairMode, pair?.vertex, pair?.fragment, initialCode, initialType]);

  // ===== 自动保存 =====
  const saveTimerRef = useRef<number | null>(null);
  useEffect(() => {
    if (readonly || !storageKey) return;
    const persist = () => {
      if (isPairMode) {
        savePlaygroundDraft(`${storageKey}:vertex`, vertexCode);
        savePlaygroundDraft(`${storageKey}:fragment`, fragmentCode);
      } else {
        savePlaygroundDraft(storageKey, singleCode);
      }
    };
    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = window.setTimeout(persist, DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [vertexCode, fragmentCode, singleCode, isPairMode, storageKey, readonly]);

  // ===== 编译错误 =====
  const [errors, setErrors] = useState<ShaderError[]>([]);
  const [unsupportedReason, setUnsupportedReason] = useState<string | null>(
    null,
  );

  // ===== 当前编辑器展示的代码 =====
  const editorValue = isPairMode
    ? activeStage === "vertex"
      ? vertexCode
      : fragmentCode
    : singleCode;

  const handleEditorChange = (next: string) => {
    if (isPairMode) {
      if (activeStage === "vertex") setVertexCode(next);
      else setFragmentCode(next);
    } else {
      setSingleCode(next);
    }
  };

  const handleReset = () => {
    if (isPairMode) {
      if (activeStage === "vertex") {
        setVertexCode(pair?.vertex ?? fallbackFor("vertex"));
        if (storageKey) clearPlaygroundDraft(`${storageKey}:vertex`);
      } else {
        setFragmentCode(pair?.fragment ?? fallbackFor("fragment"));
        if (storageKey) clearPlaygroundDraft(`${storageKey}:fragment`);
      }
    } else {
      setSingleCode(initialCode || fallbackFor(singleType));
      if (storageKey) clearPlaygroundDraft(storageKey);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(editorValue);
    } catch {
      // ignore
    }
  };

  // ===== 给引擎的 vertex/fragment 配对 =====
  // pair 模式：双 stage 都用用户代码
  // single 模式：当前 stage 用用户代码，另一个用默认占位
  const { vertexSource, fragmentSource } = useMemo(() => {
    if (isPairMode) {
      return { vertexSource: vertexCode, fragmentSource: fragmentCode };
    }
    if (singleType === "vertex") {
      return { vertexSource: singleCode, fragmentSource: DEFAULT_FRAGMENT };
    }
    return { vertexSource: DEFAULT_VERTEX, fragmentSource: singleCode };
  }, [isPairMode, vertexCode, fragmentCode, singleType, singleCode]);

  // ===== 主题样式 =====
  const cssVars = useMemo<React.CSSProperties>(
    () =>
      ({
        "--spg-bg": resolvedTheme === "light" ? "#ffffff" : "#0a0a0f",
        "--spg-fg": resolvedTheme === "light" ? "#0a0a0f" : "#e6e6f0",
        "--spg-border":
          resolvedTheme === "light"
            ? "rgba(0,0,0,0.1)"
            : "rgba(255,255,255,0.08)",
        "--spg-accent": "#5b8def",
        "--spg-error": "#ff5470",
        "--spg-muted":
          resolvedTheme === "light"
            ? "rgba(0,0,0,0.55)"
            : "rgba(255,255,255,0.55)",
        "--spg-tab-bg":
          resolvedTheme === "light"
            ? "rgba(0,0,0,0.04)"
            : "rgba(255,255,255,0.04)",
        "--spg-tab-active": resolvedTheme === "light" ? "#ffffff" : "#15151c",
      }) as React.CSSProperties,
    [resolvedTheme],
  );

  const isEditable = !readonly;

  return (
    <div
      className="spg-root"
      data-theme={resolvedTheme}
      data-mode={isPairMode ? "pair" : "single"}
      style={{
        ...cssVars,
        border: "1px solid var(--spg-border)",
        borderRadius: 8,
        overflow: "hidden",
        background: "var(--spg-bg)",
        color: "var(--spg-fg)",
        fontFamily: "inherit",
        margin: "16px 0",
      }}
    >
      {title !== "" && (
        <div
          className="spg-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "6px 10px",
            borderBottom: "1px solid var(--spg-border)",
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.3,
          }}
        >
          <span>{title ?? defaultTitle(isPairMode ? "pair" : singleType)}</span>
          <div style={{ display: "flex", gap: 6 }}>
            {isEditable && storageKey && (
              <button
                type="button"
                onClick={handleReset}
                title={
                  isPairMode ? `恢复 ${activeStage} 原始代码` : "恢复原始代码"
                }
                style={iconButtonStyle()}
              >
                Reset
              </button>
            )}
            {isEditable && (
              <button
                type="button"
                onClick={handleCopy}
                title="复制当前编辑的代码"
                style={iconButtonStyle()}
              >
                Copy
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className="spg-body"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          minHeight: 0,
        }}
      >
        {/* ===== 左侧：编辑器 ===== */}
        <div
          className="spg-editor"
          style={{
            height,
            minHeight: 240,
            borderRight: "1px solid var(--spg-border)",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
          }}
        >
          {isPairMode && (
            <div
              className="spg-tabs"
              style={{
                display: "flex",
                gap: 0,
                background: "var(--spg-tab-bg)",
                borderBottom: "1px solid var(--spg-border)",
                fontSize: 11,
                fontWeight: 500,
                flexShrink: 0,
                lineHeight: 1.2,
              }}
            >
              {(["vertex", "fragment"] as const).map((s) => {
                const active = activeStage === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setActiveStage(s)}
                    style={{
                      padding: "4px 12px",
                      background: active ? "var(--spg-tab-active)" : "transparent",
                      color: active ? "var(--spg-fg)" : "var(--spg-muted)",
                      border: "none",
                      borderBottom: active
                        ? "2px solid var(--spg-accent)"
                        : "2px solid transparent",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    {s === "vertex" ? "Vertex" : "Fragment"}
                  </button>
                );
              })}
            </div>
          )}
          <div className="spg-editor-host">
            <CodeEditor
              value={editorValue}
              onChange={handleEditorChange}
              language="glsl"
              theme={resolvedTheme}
              readOnly={!isEditable}
            />
          </div>
        </div>

        {/* ===== 右侧：3D 画布 ===== */}
        <div
          className="spg-canvas"
          style={{
            height,
            minHeight: 240,
            position: "relative",
            minWidth: 0,
          }}
        >
          <PreviewCanvas
            vertex={vertexSource}
            fragment={fragmentSource}
            geometry={geometry}
            showHelpers={showHelpers}
            onError={setErrors}
            onSuccess={() => setErrors([])}
            onUnsupported={setUnsupportedReason}
          />
          {unsupportedReason && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
                color: "var(--spg-error)",
                fontSize: 13,
                textAlign: "center",
                background: "rgba(0,0,0,0.6)",
              }}
            >
              {unsupportedReason}
            </div>
          )}
        </div>
      </div>

      {errors.length > 0 && (
        <div
          className="spg-errors"
          style={{
            borderTop: "1px solid var(--spg-border)",
            background:
              resolvedTheme === "light" ? "#fff4f5" : "rgba(255,84,112,0.08)",
            color: "var(--spg-error)",
            padding: "8px 10px",
            fontSize: 12,
            fontFamily: "var(--font-mono, monospace)",
            maxHeight: 140,
            overflow: "auto",
          }}
        >
          {errors.map((e, i) => (
            <div key={i}>
              L{e.line}:{e.column} {e.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function defaultTitle(mode: ShaderType | "pair"): string {
  if (mode === "pair") return "GLSL · Shader";
  return mode === "vertex" ? "GLSL · Vertex" : "GLSL · Fragment";
}

function iconButtonStyle(): React.CSSProperties {
  return {
    fontSize: 11,
    padding: "2px 8px",
    background: "transparent",
    color: "var(--spg-fg)",
    border: "1px solid var(--spg-border)",
    borderRadius: 4,
    cursor: "pointer",
    opacity: 0.85,
  };
}

/**
 * 解析 theme：auto 跟随 documentElement[data-theme]，否则强制指定
 */
function useTheme(theme: "auto" | ResolvedTheme): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>(() => {
    if (theme === "dark" || theme === "light") return theme;
    if (typeof document === "undefined") return "dark";
    const attr = document.documentElement.getAttribute("data-theme");
    return attr === "light" ? "light" : "dark";
  });

  useEffect(() => {
    if (theme === "dark" || theme === "light") {
      setResolved(theme);
      return;
    }
    const target = document.documentElement;
    const apply = () => {
      const attr = target.getAttribute("data-theme");
      setResolved(attr === "light" ? "light" : "dark");
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(target, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, [theme]);

  return resolved;
}
