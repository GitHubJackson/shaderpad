/**
 * Three.js 渲染引擎
 *
 * MVP 范围：
 * - 静态全屏四边形 (PlaneGeometry) + WebGLRenderer
 * - RawShaderMaterial 注入用户 fragment / vertex shader
 * - 每帧更新 u_time / u_resolution / u_mouse
 *
 * 为何不用 WebGPURenderer：
 * Three.js 0.170 的 WebGPURenderer 走 TSL NodeMaterial 路径，
 * 与 RawShaderMaterial 不兼容（"Material is not compatible"）。
 * WebGLRenderer + RawShaderMaterial 是 raw GLSL 调试的成熟稳定组合，
 * MVP 阶段优先选它。Phase 2 再考虑 WebGPU + TSL 适配。
 */

import * as THREE from "three";

export interface EngineOptions {
  container: HTMLElement;
}

export interface ShaderError {
  line: number;
  column: number;
  message: string;
}

/** 编辑模式：用户当前在编辑哪个 stage */
export type EditMode = "vertex" | "fragment";

/**
 * 公共 uniform 声明块
 * RawShaderMaterial 不会自动注入任何 uniform/attribute 声明。
 * 用户 shader 引用了 u_time / u_resolution / u_mouse 等，必须在引擎层 prepend。
 *
 * 注意：
 * 1. GLSL ES 1.0 fragment shader 必须显式声明默认 float 精度（vertex 虽可选，
 *    统一声明更稳，避免 naga 解析失败）。
 * 2. u_channel0-3（sampler2D）暂未注入 —— WebGPU 不允许 null sampler binding，
 *    待 Phase 2 引入纹理示例时再加回。
 */
const COMMON_UNIFORMS = /* glsl */ `
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
`;

/** 默认 vertex shader：全屏四边形（GLSL 1.0） */
const DEFAULT_VERTEX_SHADER = /* glsl */ `
attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;
void main() {
  v_uv = uv;
  gl_Position = vec4(position, 1.0);
}
`;

/** 默认 fragment shader：passthrough UV 显示（GLSL 1.0） */
const DEFAULT_FRAGMENT_SHADER = /* glsl */ `
precision highp float;
precision highp int;
varying vec2 v_uv;
void main() {
  gl_FragColor = vec4(v_uv, 0.5, 1.0);
}
`;

export class ShaderEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.RawShaderMaterial | null = null;
  private mesh: THREE.Mesh;
  private container: HTMLElement;
  private startTime: number = performance.now();
  private mouse: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private animationId: number = 0;

  constructor(options: EngineOptions) {
    this.container = options.container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    this.camera.position.z = 1;
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.RawShaderMaterial(),
    );
  }

  /** 检测 WebGL 支持 */
  static isSupported(): boolean {
    if (typeof window === "undefined") return false;
    try {
      const canvas = document.createElement("canvas");
      const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
      return !!gl;
    } catch {
      return false;
    }
  }

  async init(): Promise<{ ok: true } | { ok: false; reason: string }> {
    if (!ShaderEngine.isSupported()) {
      return {
        ok: false,
        reason: "当前浏览器不支持 WebGL，请升级浏览器或开启硬件加速",
      };
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(
        this.container.clientWidth,
        this.container.clientHeight,
      );
      this.renderer.setClearColor(new THREE.Color(0x0a0a0a), 1);
      this.container.appendChild(this.renderer.domElement);
      this.canvas = this.renderer.domElement;
      this.canvas.style.display = "block";
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        reason: `WebGL 初始化失败：${(e as Error).message}`,
      };
    }
  }

  private canvas: HTMLCanvasElement | null = null;

  /**
   * 应用 shader。
   * - mode='fragment'：用户 source 注入为 fragment，默认 vertex
   * - mode='vertex'：用户 source 注入为 vertex，默认 fragment（passthrough UV）
   * @returns ok=true 表示成功；ok=false 时 errors 包含行号+消息
   */
  applyShader(
    source: string,
    mode: EditMode = "fragment",
  ): { ok: true } | { ok: false; errors: ShaderError[] } {
    if (!this.renderer)
      return {
        ok: false,
        errors: [{ line: 0, column: 0, message: "Renderer 未初始化" }],
      };

    // 移除旧材质
    const oldMaterial = Array.isArray(this.mesh.material)
      ? null
      : this.mesh.material;
    if (oldMaterial) {
      oldMaterial.dispose();
    }
    this.material = null;

    // RawShaderMaterial 不自动注入：
    // 1. GLSL 1.0 fragment 必须显式声明默认 float 精度
    // 2. 所有引用的 uniform 必须显式声明
    // 引擎层统一 prepend，用户 shader 无需关心样板代码
    const userFragment =
      mode === "fragment" ? COMMON_UNIFORMS + source : DEFAULT_FRAGMENT_SHADER;
    const userVertex =
      mode === "vertex" ? COMMON_UNIFORMS + source : DEFAULT_VERTEX_SHADER;

    this.material = new THREE.RawShaderMaterial({
      vertexShader: userVertex,
      fragmentShader: userFragment,
      uniforms: {
        u_time: { value: 0 },
        u_resolution: {
          value: new THREE.Vector2(
            this.container.clientWidth,
            this.container.clientHeight,
          ),
        },
        u_mouse: { value: this.mouse },
        u_random: { value: Math.random() },
      },
    });

    this.mesh.material = this.material;
    this.scene.clear();
    this.scene.add(this.mesh);

    // 调试：验证引擎里存的 source 是用户代码 + COMMON_UNIFORMS
    // eslint-disable-next-line no-console
    console.log(
      `[shaderpad] applyShader mode=${mode} fragmentLen=${this.material.fragmentShader.length} vertexLen=${this.material.vertexShader.length}`,
    );

    return { ok: true };
  }

  /**
   * 强制立即编译当前 material 并返回 WebGL 诊断信息。
   * 直接调 WebGL API 编译 user source（不走 Three.js 内部路径），
   * 因为 material.program.diagnostics 路径在 Three.js 0.170 不可靠
   * （program 对象不一定存在，diagnostics 字段也不一致）。
   *
   * line 偏移：user source 前有 7 行引擎 prepend（6 行内容 + 末尾换行），
   * 错误行号需要减去这个偏移才能对应到编辑器中的行。
   */
  forceCompile():
    | { ok: true; log: string; warnings: string[] }
    | { ok: false; errors: ShaderError[] } {
    if (!this.renderer || !this.material) {
      return {
        ok: false,
        errors: [
          { line: 0, column: 0, message: "Renderer 或 material 未初始化" },
        ],
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gl = (this.renderer as any).getContext() as
      | WebGL2RenderingContext
      | WebGLRenderingContext
      | null;
    if (!gl) {
      return {
        ok: false,
        errors: [{ line: 0, column: 0, message: "无法获取 WebGL context" }],
      };
    }

    const LINE_OFFSET = 7; // COMMON_UNIFORMS 占用的行数

    const allErrors: ShaderError[] = [];
    const allWarnings: string[] = [];

    if (this.material.vertexShader) {
      const r = this.compileShaderRaw(
        gl,
        gl.VERTEX_SHADER,
        this.material.vertexShader,
        "vertex",
      );
      if (!r.ok) allErrors.push(...r.errors);
      else if (r.warnings) allWarnings.push(`[vertex] ${r.warnings}`);
    }

    if (this.material.fragmentShader) {
      const r = this.compileShaderRaw(
        gl,
        gl.FRAGMENT_SHADER,
        this.material.fragmentShader,
        "fragment",
      );
      if (!r.ok) allErrors.push(...r.errors);
      else if (r.warnings) allWarnings.push(`[fragment] ${r.warnings}`);
    }

    if (allErrors.length > 0) {
      // 把引擎 prepend 的偏移去掉，让错误行号对应到编辑器
      const adjusted = allErrors.map((e) => ({
        ...e,
        line: Math.max(1, e.line - LINE_OFFSET),
      }));
      return { ok: false, errors: adjusted };
    }

    return { ok: true, log: "", warnings: allWarnings };
  }

  /**
   * 直接调 WebGL API 编译单个 shader。返回 ok / 详细错误。
   */
  private compileShaderRaw(
    gl: WebGL2RenderingContext | WebGLRenderingContext,
    type: number,
    source: string,
    stage: "vertex" | "fragment",
  ): { ok: true; warnings: string } | { ok: false; errors: ShaderError[] } {
    const shader = gl.createShader(type);
    if (!shader) {
      return {
        ok: false,
        errors: [
          { line: 0, column: 0, message: `createShader(${stage}) 失败` },
        ],
      };
    }

    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    const log = gl.getShaderInfoLog(shader) || "";
    gl.deleteShader(shader);

    // 调试：暴露原始编译状态到控制台，方便排查
    // eslint-disable-next-line no-console
    console.log(
      `[shaderpad] ${stage} compile:`,
      { compiled, logLen: log.length, srcLen: source.length },
      log ? `\n${log}` : "",
    );

    if (compiled) {
      return { ok: true, warnings: log.trim() };
    }

    // 解析 GLSL 错误：ERROR: 5:12: 'foo' : undeclared identifier
    const errors: ShaderError[] = [];
    const errorRegex = /ERROR:\s*(\d+):(\d+):\s*(.+)/g;
    let m: RegExpExecArray | null;
    while ((m = errorRegex.exec(log)) !== null) {
      errors.push({
        line: parseInt(m[1], 10),
        column: parseInt(m[2], 10),
        message: `[${stage}] ${m[3].trim()}`,
      });
    }
    if (errors.length === 0) {
      errors.push({
        line: 0,
        column: 0,
        message: `[${stage}] ${log.trim() || "Shader 编译失败（无详细信息）"}`,
      });
    }
    return { ok: false, errors };
  }

  start() {
    if (!this.renderer) return;
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (!this.material || !this.renderer) return;

      // 更新 uniforms
      const u = this.material.uniforms;
      if (u.u_time)
        u.u_time.value = (performance.now() - this.startTime) / 1000;

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  stop() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  resize() {
    if (!this.renderer) return;
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.renderer.setSize(w, h);
    if (this.material?.uniforms.u_resolution) {
      (this.material.uniforms.u_resolution.value as THREE.Vector2).set(w, h);
    }
  }

  setMouse(nx: number, ny: number) {
    this.mouse.set(nx, ny);
  }

  /** 获取 canvas 元素（用于截图等） */
  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  dispose() {
    this.stop();
    if (this.material) this.material.dispose();
    this.renderer?.dispose();
    if (this.canvas?.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    this.material = null;
    this.renderer = null;
  }
}
