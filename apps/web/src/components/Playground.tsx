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

export function Playground() {
  // ===== Theme（监听全局主题，Monaco 主题跟随）=====
  const theme = useStore(resolvedTheme);

  // ===== State =====
  const [lang, setLang] = useState<ShaderLanguageId>(
    () => loadLastLang() || "glsl",
  );
  const [stage, setStage] = useState<ShaderStage>(
    () => loadLastStage() || "fragment",
  );
  const [geometry, setGeometryState] = useState<GeometryType>(
    () => loadLastGeometry() || "plane",
  );
  const [code, setCode] = useState<string>("");
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
  const codeRef = useRef<string>(""); // 用于在 engine 闭包中读到最新值

  // ===== Adapters =====
  const adapters = useMemo(() => listAdapters(), []);
  const currentAdapter = useMemo(
    () => adapters.find((a) => a.id === lang)!,
    [adapters, lang],
  );

  // ===== 初始化主题（SSR 后客户端挂载）=====
  useEffect(() => {
    initTheme();
  }, []);

  // ===== 初始化代码（按优先级：URL > localStorage > 默认示例）=====
  // 依赖 [lang, stage, geometry] —— 三个维度任一变化都重新解析"该组合"下的代码
  useEffect(() => {
    const saved = loadSavedCode(lang, stage, geometry);
    if (saved) {
      setCode(saved);
      codeRef.current = saved;
    } else {
      // 几何体维度也参与默认选择，确保每个几何体首访看到对应的 default 示例
      const example = getDefaultExample(lang, stage, geometry);
      setCode(example.code);
      codeRef.current = example.code;
    }
  }, [lang, stage, geometry]);

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

      // 引擎就绪，应用初始 shader
      compileAndRun(codeRef.current);
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
  const autoSaveRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    autoSaveRef.current = createAutoSaver(
      lang,
      stage,
      geometry,
      () => codeRef.current,
    );
  }, [lang, stage, geometry]);

  // ===== 编译 + 运行 =====
  const compileAndRun = async (source: string) => {
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
    const result = await currentAdapter.compile(source, stage);
    if (!result.ok) {
      setStatus("error");
      setErrors(result.errors);
      // 记录到 logs
      appendLog(
        "error",
        `Pre-check failed: ${result.errors[0]?.message || "unknown"}`,
      );
      return;
    }

    // 编译通过，应用到引擎（实际 GLSL → WebGL 编译由 Three.js 内部完成）
    const editMode = stage === "vertex" ? "vertex" : "fragment";
    const applied = engineRef.current.applyShader(source, editMode);
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
        appendLog("info", `${editMode} shader compiled successfully`);
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
  const handleEditorChange = (value: string | undefined) => {
    const v = value ?? "";
    setCode(v);
    codeRef.current = v;
    autoSaveRef.current?.();
    compileAndRun(v);
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
  const handleLoadExample = (exampleId: string) => {
    const example = EXAMPLES.find((e) => e.id === exampleId);
    if (!example) return;
    setCode(example.code);
    codeRef.current = example.code;
    compileAndRun(example.code);
  };

  // ===== 切换 stage =====
  const handleStageChange = (next: ShaderStage) => {
    if (next === stage) return;
    setStage(next);
  };

  // ===== 手动 Run：立即写 localStorage + 强制重新编译 =====
  const handleRun = () => {
    const code = codeRef.current;
    saveCode(lang, stage, code, geometry);
    compileAndRun(code);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Toolbar
        examples={EXAMPLES.filter(
          (e) =>
            e.language === lang &&
            e.stage === stage &&
            (!e.geometry || e.geometry === geometry),
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
              <CopyButton text={code} />
              <SaveButton onRun={handleRun} />
            </div>
            {stage === "compute" ? (
              <ComputePlaceholder />
            ) : (
              <Editor
                height="100%"
                language={currentAdapter.monacoLanguage}
                value={code}
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
