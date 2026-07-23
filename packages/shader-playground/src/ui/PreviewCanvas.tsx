/**
 * PreviewCanvas —— 3D 预览画布
 *
 * 接收一对 (vertex, fragment) GLSL 源码，初始化 ShaderEngine 并持续渲染。
 * 仅做"渲染 + 编译错误回调"，不负责编辑器、布局、状态管理。
 */

import { useEffect, useRef, useState } from "react";
import { ShaderEngine, type GeometryType } from "../runtime/three-engine";
import type { ShaderError } from "../runtime/three-engine";

export interface PreviewCanvasProps {
  vertex: string;
  fragment: string;
  geometry: GeometryType;
  /** 显示辅助线（grid + axes），默认 true */
  showHelpers?: boolean;
  /** 编译错误回调，用于父组件展示错误信息 */
  onError?: (errors: ShaderError[]) => void;
  /** 编译成功回调 */
  onSuccess?: () => void;
  /** WebGL 不可用时 */
  onUnsupported?: (reason: string) => void;
}

export function PreviewCanvas({
  vertex,
  fragment,
  geometry,
  showHelpers = true,
  onError,
  onSuccess,
  onUnsupported,
}: PreviewCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<ShaderEngine | null>(null);
  const [ready, setReady] = useState(false);

  // ===== 引擎生命周期 =====
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;
    const engine = new ShaderEngine({
      container: containerRef.current,
      showHelpers,
    });
    engineRef.current = engine;

    (async () => {
      const init = await engine.init();
      if (cancelled) return;
      if (!init.ok) {
        onUnsupported?.(init.reason);
        return;
      }
      setReady(true);
      // 初始编译
      compileAndReport(engine, vertex, fragment, onError, onSuccess);
      engine.start();
      const ro = new ResizeObserver(() => engine.resize());
      ro.observe(containerRef.current!);
      return () => {
        ro.disconnect();
      };
    })();

    return () => {
      cancelled = true;
      engine.dispose();
      engineRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 几何体切换 =====
  useEffect(() => {
    if (!ready) return;
    engineRef.current?.setGeometry(geometry);
  }, [geometry, ready]);

  // ===== 源码更新：每次变化重新编译 + forceCompile 捕获错误 =====
  useEffect(() => {
    if (!ready || !engineRef.current) return;
    compileAndReport(
      engineRef.current,
      vertex,
      fragment,
      onError,
      onSuccess,
    );
  }, [vertex, fragment, ready, onError, onSuccess]);

  // ===== 鼠标交互：归一化到 [0,1] =====
  useEffect(() => {
    if (!ready) return;
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      engineRef.current?.setMouse(x, y);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, [ready]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: 200,
        background: "#0a0a0a",
        overflow: "hidden",
      }}
    />
  );
}

function compileAndReport(
  engine: ShaderEngine,
  vertex: string,
  fragment: string,
  onError?: (errors: ShaderError[]) => void,
  onSuccess?: () => void,
) {
  const applied = engine.applyShader(vertex, fragment);
  if (!applied.ok) {
    onError?.(applied.errors);
    return;
  }
  const result = engine.forceCompile();
  if (result.ok) {
    onSuccess?.();
  } else {
    onError?.(result.errors);
  }
}
