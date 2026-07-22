/**
 * Playground —— 编辑器 + Canvas 集成 Island
 *
 * 这是 ShaderPad 的核心交互组件，包含：
 * - LanguageSwitcher（顶部）
 * - Monaco Editor（左侧）
 * - WebGPU Canvas（右侧）
 * - 错误面板（底部浮层）
 */

import { useEffect, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { useStore } from "@nanostores/react";
import {
  listAdapters,
  type GpuError,
  type ShaderLanguageId,
  type ShaderStage,
} from "@shaderpad/runtime";
import { ShaderEngine, type GeometryType } from "@/lib/runtime/three-engine";
import { EXAMPLES, getDefaultExample } from "@/shaders/examples";
import {
  createAutoSaver,
  loadLastGeometry,
  loadLastLang,
  loadLastStage,
  loadSavedCode,
  saveCode,
  saveLastGeometry,
  saveLastLang,
  saveLastStage,
} from "@/lib/share/store";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { Toolbar } from "./Toolbar";
import { CopyButton } from "./CopyButton";
import { SaveButton } from "./SaveButton";
import { StageTabs } from "./StageTabs";
import { LogPanel, type LogEntry } from "./LogPanel";
import { SceneInfoButton } from "./SceneInfoButton";
import { resolvedTheme, initTheme } from "@/lib/theme";

type Status = "idle" | "compiling" | "ok" | "error";
type EditorMountFn = (
  editor: MonacoEditor.IStandaloneCodeEditor,
  monaco: any,
) => void;

/**
 * Playground props
 *
 * - `initialVertex` / `initialFragment`：Learn 页面用，用于预填一个示例的
 *   vertex+fragment 一对（与「Examples 列表里选中某项」行为一致）。
 *   不传则走「localStorage > 默认示例」的常规解析流程。
 */
interface PlaygroundProps {
  initialVertex?: string;
  initialFragment?: string;
}

// ============================================================================
// Monaco 自定义主题 —— 必须在编辑器创建前（beforeMount）注册
// 否则第一帧会 fallback 到内置 "vs"(light) 主题，造成暗→亮闪烁
// ============================================================================
function setupMonacoThemes(monaco: any) {
  monaco.editor.defineTheme("shaderpad-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "5a5a6a", fontStyle: "italic" },
      { token: "type", foreground: "5eb3ff" },
      { token: "function", foreground: "b45eff" },
      { token: "number", foreground: "ffb86b" },
    ],
    colors: {
      "editor.background": "#0a0a0f",
    },
  });

  monaco.editor.defineTheme("shaderpad-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: "9090a0", fontStyle: "italic" },
      { token: "type", foreground: "0070d8" },
      { token: "function", foreground: "8b3fbf" },
      { token: "number", foreground: "d97a1e" },
    ],
    colors: {
      "editor.background": "#ffffff",
    },
  });
}

export function Playground({
  initialVertex,
  initialFragment,
}: PlaygroundProps = {}) {
  // ===== Theme（监听全局主题，Monaco 主题跟随）=====
  const theme = useStore(resolvedTheme);

  // ===== State =====
  const [lang, setLang] = useState<ShaderLanguageId>(
    () => loadLastLang() || "glsl",
  );
  // stage 仅作为「当前编辑哪个 tab」的 UI 状态 —— 3D 场景同时使用 vertex+fragment
  const [stage, setStage] = useState<ShaderStage>(
    () => loadLastStage() || "fragment",
  );
  const [geometry, setGeometryState] = useState<GeometryType>(
    () => loadLastGeometry() || "plane",
  );
  // 每个示例 = vertex + fragment 一对。两个 stage 的代码独立保存，
  // 切换 tab 只换编辑器里展示的代码，不动引擎里的 material。
  const [vertexCode, setVertexCode] = useState<string>("");
  const [fragmentCode, setFragmentCode] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<GpuError[]>([]);
  const [supportMsg, setSupportMsg] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // 切换几何体：更新 state + 同步到引擎 + 持久化
  const handleGeometryChange = (next: GeometryType) => {
    setGeometryState(next);
    engineRef.current?.setGeometry(next);
    saveLastGeometry(next);
  };

  // ===== Refs =====
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ShaderEngine | null>(null);
  // vertexCodeRef / fragmentCodeRef 供引擎闭包与 autoSave 读最新值。
  // 两个 stage 独立保存（localStorage 维度含 stage），独立刷引擎 material。
  const vertexCodeRef = useRef<string>("");
  const fragmentCodeRef = useRef<string>("");

  // ===== Adapters =====
  const adapters = useMemo(() => listAdapters(), []);
  const currentAdapter = useMemo(
    () => adapters.find((a: { id: string }) => a.id === lang)!,
    [adapters, lang],
  );

  // ===== 初始化主题（SSR 后客户端挂载）=====
  useEffect(() => {
    initTheme();
  }, []);

  // ===== 初始化代码（按优先级：props > localStorage > 默认示例）=====
  // 依赖 [lang, geometry] —— 切换 stage tab 不重新解析（不会清空用户编辑）
  // 依赖 [geometry] 触发「每个几何体独立代码空间」的隔离语义
  useEffect(() => {
    const example = getDefaultExample(lang, geometry);
    // 优先 localStorage；缺失时 fallback 到示例对应 stage 的代码
    const savedV = loadSavedCode(lang, "vertex", geometry);
    const savedF = loadSavedCode(lang, "fragment", geometry);
    // Learn 页面 props 优先（仅在首屏 / 没有 localStorage 时生效）
    const nextV = initialVertex ?? savedV ?? example.vertex;
    const nextF = initialFragment ?? savedF ?? example.fragment;
    setVertexCode(nextV);
    setFragmentCode(nextF);
    vertexCodeRef.current = nextV;
    fragmentCodeRef.current = nextF;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang, geometry]);

  // ===== 持久化 lang & stage =====
  useEffect(() => {
    saveLastLang(lang);
  }, [lang]);
  useEffect(() => {
    saveLastStage(stage);
  }, [stage]);

  // 引擎挂载后，把恢复出的 geometry 应用到引擎
  useEffect(() => {
    engineRef.current?.setGeometry(geometry);
  }, [geometry]);

  // ===== WebGPU 引擎初始化 =====
  useEffect(() => {
    if (!canvasContainerRef.current) return;

    let cancelled = false;
    const engine = new ShaderEngine({ container: canvasContainerRef.current });
    engineRef.current = engine;

    (async () => {
      const init = await engine.init();
      if (cancelled) return;

      if (!init.ok) {
        setSupportMsg(init.reason);
        return;
      }

      // 引擎就绪，应用初始 shader（vertex+fragment 一对）
      compileAndRun(vertexCodeRef.current, fragmentCodeRef.current);
      engine.start();

      // 监听 resize
      const ro = new ResizeObserver(() => engine.resize());
      ro.observe(canvasContainerRef.current!);

      // 鼠标事件：归一化到 [0,1]
      const onMouseMove = (e: MouseEvent) => {
        const rect = canvasContainerRef.current!.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1.0 - (e.clientY - rect.top) / rect.height; // Y 翻转
        engine.setMouse(x, y);
      };
      canvasContainerRef.current!.addEventListener("mousemove", onMouseMove);

      return () => {
        ro.disconnect();
        canvasContainerRef.current?.removeEventListener(
          "mousemove",
          onMouseMove,
        );
        engine.dispose();
      };
    })();

    return () => {
      cancelled = true;
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 自动保存 =====
  // 每个 stage 独立 autoSave —— 编辑 vertex 只写 vertex 的 slot，
  // 编辑 fragment 只写 fragment 的 slot。引擎拿到的永远是最新一对。
  const vertexAutoSaveRef = useRef<(() => void) | null>(null);
  const fragmentAutoSaveRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    vertexAutoSaveRef.current = createAutoSaver(
      lang,
      "vertex",
      geometry,
      () => vertexCodeRef.current,
    );
    fragmentAutoSaveRef.current = createAutoSaver(
      lang,
      "fragment",
      geometry,
      () => fragmentCodeRef.current,
    );
  }, [lang, geometry]);

  // ===== 编译 + 运行 =====
  // 同时编译 vertex+fragment 两个 stage；任一 pre-check 失败立即返回。
  const compileAndRun = async (vertex: string, fragment: string) => {
    if (!engineRef.current) return;

    // Compute stage 暂未实现：跳过 apply，避免误把 compute 代码当作 fragment
    if (stage === "compute") {
      setStatus("idle");
      setErrors([]);
      return;
    }

    setStatus("compiling");
    setErrors([]);

    // MVP：compile() 只做轻量语法检查（main 入口存在性），无设备依赖
    // 两个 stage 各自过一遍 pre-check
    const [rV, rF] = await Promise.all([
      currentAdapter.compile(vertex, "vertex"),
      currentAdapter.compile(fragment, "fragment"),
    ]);
    const failed = !rV.ok
      ? { stage: "vertex" as const, res: rV }
      : !rF.ok
        ? { stage: "fragment" as const, res: rF }
        : null;
    if (failed) {
      setStatus("error");
      setErrors(failed.res.errors);
      appendLog(
        "error",
        `[${failed.stage}] Pre-check failed: ${failed.res.errors[0]?.message || "unknown"}`,
      );
      return;
    }

    // 编译通过，应用到引擎（实际 GLSL → WebGL 编译由 Three.js 内部完成）
    const applied = engineRef.current.applyShader(vertex, fragment);
    if (!applied.ok) {
      setStatus("error");
      setErrors(
        applied.errors.map((e) => ({ ...e, severity: "error" as const })),
      );
      return;
    }

    // 强制立即编译，捕获 WebGL 诊断信息（错误 + 警告）
    const compileResult = engineRef.current.forceCompile();
    if (compileResult.ok) {
      if (compileResult.warnings.length > 0) {
        compileResult.warnings.forEach((w) => appendLog("warn", w));
      } else {
        appendLog("info", "shader compiled successfully");
      }
      setStatus("ok");
      setErrors([]);
    } else {
      setStatus("error");
      setErrors(compileResult.errors);
      compileResult.errors.forEach((e) =>
        appendLog("error", `L${e.line}:${e.column} ${e.message}`),
      );
    }
  };

  // ===== Logs =====
  const appendLog = (level: LogEntry["level"], message: string) => {
    setLogs((prev) => {
      // 限制最大条数，避免无限增长
      const next = [...prev, { level, message, timestamp: Date.now() }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  };

  const clearLogs = () => {
    setLogs([]);
    setErrors([]);
  };

  // ===== 编辑器回调 =====
  // 只更新当前 stage 的 state/ref + 触发对应 stage 的 autoSave；
  // 引擎同时收到 vertex+fragment 一对，所以传两个 ref 的最新值。
  const handleEditorChange = (value: string | undefined) => {
    const v = value ?? "";
    if (stage === "vertex") {
      setVertexCode(v);
      vertexCodeRef.current = v;
      vertexAutoSaveRef.current?.();
    } else if (stage === "fragment") {
      setFragmentCode(v);
      fragmentCodeRef.current = v;
      fragmentAutoSaveRef.current?.();
    } else {
      // compute 暂不支持写入
      return;
    }
    compileAndRun(vertexCodeRef.current, fragmentCodeRef.current);
  };

  const handleEditorMount: EditorMountFn = (_editor, monaco) => {
    // 注册 GLSL 语言
    if (
      !monaco.languages
        .getLanguages()
        .some((l: { id: string }) => l.id === "glsl")
    ) {
      monaco.languages.register({ id: "glsl" });
      monaco.languages.setMonarchTokensProvider("glsl", {
        keywords: [
          "attribute",
          "const",
          "uniform",
          "varying",
          "break",
          "continue",
          "do",
          "for",
          "while",
          "if",
          "else",
          "in",
          "out",
          "inout",
          "true",
          "false",
          "lowp",
          "mediump",
          "highp",
          "precision",
          "invariant",
          "discard",
          "return",
          "mat2",
          "mat3",
          "mat4",
          "vec2",
          "vec3",
          "vec4",
          "ivec2",
          "ivec3",
          "ivec4",
          "bvec2",
          "bvec3",
          "bvec4",
          "sampler2D",
          "samplerCube",
          "void",
          "struct",
        ],
        builtins: [
          "gl_Position",
          "gl_FragColor",
          "gl_FragCoord",
          "gl_PointSize",
          "gl_FrontFacing",
          "gl_PointCoord",
          "sin",
          "cos",
          "tan",
          "asin",
          "acos",
          "atan",
          "pow",
          "exp",
          "log",
          "sqrt",
          "inversesqrt",
          "abs",
          "sign",
          "floor",
          "ceil",
          "fract",
          "mod",
          "min",
          "max",
          "clamp",
          "mix",
          "step",
          "smoothstep",
          "length",
          "distance",
          "dot",
          "cross",
          "normalize",
          "reflect",
          "refract",
          "texture",
          "texture2D",
          "textureCube",
          "radians",
          "degrees",
        ],
        tokenizer: {
          root: [
            [/\/\/.*$/, "comment"],
            [/\/\*/, "comment", "@comment"],
            [/\b(?:void|bool|int|float|vec[234]|ivec[234]|mat[234])\b/, "type"],
            [/\b\w+(?=\s*\()/, "function"],
            [/[0-9]+\.[0-9]+/, "number.float"],
            [/\.[0-9]+/, "number.float"],
            [/[0-9]+/, "number"],
            [/"([^"\\]|\\.)*$/, "string.invalid"],
            [/"/, "string", "@string"],
          ],
          comment: [
            [/[^/*]+/, "comment"],
            [/\*\//, "comment", "@pop"],
            [/[/*]/, "comment"],
          ],
          string: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape"],
            [/"/, "string", "@pop"],
          ],
        },
      } as any);
    }
  };

  // ===== 主题切换时实时更新 Monaco 主题 =====
  useEffect(() => {
    // 通过 window.monaco 访问已加载的 monaco 实例
    const w = window as any;
    if (w.monaco) {
      w.monaco.editor.setTheme(
        theme === "light" ? "shaderpad-light" : "shaderpad-dark",
      );
    }
  }, [theme]);

  // ===== 切换 stage：不重新编译，3D 场景保持稳定 =====
  // 设计：切 tab 只是切换编辑器里展示的代码（vertex/fragment 各有独立 state），
  // 3D 场景只在用户实际编辑代码时（handleEditorChange）才更新。
  // 这样切 tab 不会让场景"跳一下"（u_time 重置带来的视觉跳动）。
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  useEffect(() => {
    // 故意不做事 —— 仅占位以表明设计意图
  }, [stage]);

  // ===== 切换示例 =====
  // 一个示例 = 一对 (vertex, fragment)。同时写入两个 stage 的 state/ref，
  // 引擎拿到完整一对直接编译。
  const handleLoadExample = (exampleId: string) => {
    const example = EXAMPLES.find((e) => e.id === exampleId);
    if (!example) return;
    setVertexCode(example.vertex);
    setFragmentCode(example.fragment);
    vertexCodeRef.current = example.vertex;
    fragmentCodeRef.current = example.fragment;
    // 加载示例时同步落盘到对应 stage 的 slot
    saveCode(lang, "vertex", example.vertex, geometry);
    saveCode(lang, "fragment", example.fragment, geometry);
    compileAndRun(example.vertex, example.fragment);
  };

  // ===== 切换 stage =====
  const handleStageChange = (next: ShaderStage) => {
    if (next === stage) return;
    setStage(next);
  };

  // ===== 手动 Run：立即写当前 stage 的 localStorage + 强制重新编译 =====
  // 编辑器只展示了当前 stage，但引擎需要 vertex+fragment 一对才能编译。
  const handleRun = () => {
    if (stage === "vertex") {
      saveCode(lang, "vertex", vertexCodeRef.current, geometry);
    } else if (stage === "fragment") {
      saveCode(lang, "fragment", fragmentCodeRef.current, geometry);
    }
    compileAndRun(vertexCodeRef.current, fragmentCodeRef.current);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar
        examples={EXAMPLES.filter(
          (e) =>
            e.language === lang && (!e.geometry || e.geometry === geometry),
        )}
        onLoadExample={handleLoadExample}
        geometry={geometry}
        onChangeGeometry={handleGeometryChange}
        rightSlot={
          <LanguageSwitcher
            current={lang}
            adapters={adapters}
            onChange={setLang}
          />
        }
      />

      <div className="main">
        <div
          className="pane pane-editor"
          style={{ display: "flex", flexDirection: "column" }}
        >
          <StageTabs current={stage} onChange={handleStageChange} />
          <div style={{ position: "relative", flex: 1, minHeight: 0 }}>
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                zIndex: 5,
                display: "flex",
                gap: 6,
              }}
            >
              <CopyButton
                text={stage === "vertex" ? vertexCode : fragmentCode}
              />
              <SaveButton onRun={handleRun} />
            </div>
            {stage === "compute" ? (
              <ComputePlaceholder />
            ) : (
              <Editor
                height="100%"
                language={currentAdapter.monacoLanguage}
                value={stage === "vertex" ? vertexCode : fragmentCode}
                onChange={handleEditorChange}
                onMount={handleEditorMount}
                theme={theme === "light" ? "shaderpad-light" : "shaderpad-dark"}
                beforeMount={(monaco) => {
                  // 在编辑器创建前注册自定义主题，避免 fallback 到 "vs"(light)
                  setupMonacoThemes(monaco);
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  tabSize: 2,
                  automaticLayout: true,
                  scrollBeyondLastLine: false,
                  fontFamily: "JetBrains Mono, Menlo, Consolas, monospace",
                  fontLigatures: true,
                  padding: { top: 12 },
                }}
              />
            )}
          </div>
        </div>

        <div className="pane pane-canvas" ref={canvasContainerRef}>
          <SceneInfoButton geometry={geometry} />
          {supportMsg && (
            <div style={{ padding: 24, color: "var(--error)" }}>
              <strong>WebGL 不可用</strong>
              <p style={{ marginTop: 8, color: "var(--text-secondary)" }}>
                {supportMsg}
              </p>
            </div>
          )}
        </div>
      </div>

      <LogPanel
        status={status}
        errors={errors}
        logs={logs}
        onClear={clearLogs}
      />
    </div>
  );
}

/**
 * Compute stage placeholder
 * WebGPU Compute Shader — Phase 4
 */
function ComputePlaceholder() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        padding: 24,
        textAlign: "center",
        background: "var(--bg-primary)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: 0.5,
        }}
      >
        Compute Shader
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          maxWidth: 320,
        }}
      >
        WebGPU Compute Shader is coming soon.
        <br />
        Future use cases: GPGPU, particle simulation, image processing.
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 10,
          padding: "2px 8px",
          background: "var(--bg-tertiary)",
          color: "var(--text-muted)",
          borderRadius: 4,
          fontFamily: "var(--font-mono)",
        }}
      >
        Phase 4
      </div>
    </div>
  );
}
