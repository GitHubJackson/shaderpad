/**
 * CodeEditor —— Monaco Editor 的薄封装
 *
 * - 注册自定义 GLSL 语言与主题（在 beforeMount 完成）
 * - 暴露 onChange 给外部；高度由父容器决定
 * - 不关心持久化、不关心父级布局
 */

import Editor, { type OnMount } from "@monaco-editor/react";
import { useCallback } from "react";
import { registerGLSLLanguage } from "./glsl-monarch";
import {
  getMonacoThemeName,
  registerMonacoThemes,
} from "./monaco-themes";

export interface CodeEditorProps {
  value: string;
  onChange: (next: string) => void;
  language?: string;
  theme: "dark" | "light";
  readOnly?: boolean;
}

export function CodeEditor({
  value,
  onChange,
  language = "glsl",
  theme,
  readOnly = false,
}: CodeEditorProps) {
  // beforeMount: 在编辑器创建前注册主题和语言
  const handleBeforeMount = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (monaco: any) => {
      registerMonacoThemes(monaco);
      registerGLSLLanguage(monaco);
    },
    [],
  );

  const handleMount: OnMount = useCallback(() => {
    /* 留空：GLSL 语言已在 beforeMount 注册 */
  }, []);

  return (
    <Editor
      height="100%"
      language={language}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      beforeMount={handleBeforeMount}
      theme={getMonacoThemeName(theme)}
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
        readOnly,
        domReadOnly: readOnly,
      }}
    />
  );
}
