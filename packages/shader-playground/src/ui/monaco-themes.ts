/**
 * Monaco 自定义主题 —— dark / light 二态
 * 必须在编辑器 beforeMount 时注册，否则首帧会 fallback 到内置主题造成闪烁
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerMonacoThemes(monaco: any) {
  if (!monaco.editor.__shaderpadThemesRegistered) {
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

    monaco.editor.__shaderpadThemesRegistered = true;
  }
}

export function getMonacoThemeName(theme: "dark" | "light"): string {
  return theme === "light" ? "shaderpad-light" : "shaderpad-dark";
}
