/**
 * Three.js 渲染引擎
 *
 * MVP 范围：
 * - Plane / Box / Sphere 三种几何体 + WebGLRenderer
 * - RawShaderMaterial 注入用户 fragment / vertex shader
 * - 每帧更新 u_time / u_resolution / u_mouse / MVP 矩阵
 * - 内置 OrbitControls：左键旋转、右键平移、滚轮缩放
 * - 场景内 GridHelper + AxesHelper 辅助定位
 *
 * 为何不用 WebGPURenderer：
 * Three.js 0.170 的 WebGPURenderer 走 TSL NodeMaterial 路径，
 * 与 RawShaderMaterial 不兼容（"Material is not compatible"）。
 * WebGLRenderer + RawShaderMaterial 是 raw GLSL 调试的成熟稳定组合。
 *
 * 此文件从 apps/web/src/lib/runtime/three-engine.ts 平移而来，
 * 作为 @shaderpad/playground 的运行时核心，与站点共用同一份代码。
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface EngineOptions {
  container: HTMLElement;
  /** 是否显示辅助线（grid + axes），默认 true */
  showHelpers?: boolean;
  /** 背景色，0x0a0a0a 默认 */
  clearColor?: number;
}

export interface ShaderError {
  line: number;
  column: number;
  message: string;
}

/** 几何体类型 */
export type GeometryType = "plane" | "box" | "sphere";

export class ShaderEngine {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private material: THREE.RawShaderMaterial | null = null;
  private mesh: THREE.Mesh;
  private container: HTMLElement;
  private startTime: number = performance.now();
  private mouse: THREE.Vector2 = new THREE.Vector2(0.5, 0.5);
  private animationId: number = 0;
  private geometryType: GeometryType = "plane";
  private controls: OrbitControls | null = null;
  private helpers: THREE.Group | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private showHelpers: boolean = true;
  private clearColor: number = 0x0a0a0a;

  constructor(options: EngineOptions) {
    this.container = options.container;
    this.showHelpers = options.showHelpers ?? true;
    this.clearColor = options.clearColor ?? 0x0a0a0a;

    this.scene = new THREE.Scene();

    // 透视相机：3/4 视角（右上后方），更好看、立体感更强。
    const aspect =
      options.container.clientWidth / options.container.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 100);
    this.camera.position.set(2.5, 2, 3.5);
    this.camera.lookAt(0, 0, 0);

    this.mesh = new THREE.Mesh(
      this.createGeometry("plane"),
      new THREE.RawShaderMaterial(),
    );
  }

  private createGeometry(type: GeometryType): THREE.BufferGeometry {
    switch (type) {
      case "plane":
        return new THREE.PlaneGeometry(1.5, 1.5);
      case "box":
        return new THREE.BoxGeometry(1.2, 1.2, 1.2);
      case "sphere":
        return new THREE.SphereGeometry(0.6, 32, 16);
    }
  }

  setGeometry(type: GeometryType) {
    if (this.geometryType === type) return;
    this.geometryType = type;
    const oldGeo = this.mesh.geometry;
    this.mesh.geometry = this.createGeometry(type);
    oldGeo.dispose();
  }

  getGeometryType(): GeometryType {
    return this.geometryType;
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
      this.renderer.setClearColor(new THREE.Color(this.clearColor), 1);
      this.container.appendChild(this.renderer.domElement);
      this.canvas = this.renderer.domElement;
      this.canvas.style.display = "block";
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";

      // OrbitControls
      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.target.set(0, 0, 0);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.update();

      if (this.showHelpers) {
        this.helpers = new THREE.Group();
        const grid = new THREE.GridHelper(
          10,
          10,
          0x666666,
          0x2a2a35,
        );
        grid.position.y = -0.001;
        this.helpers.add(grid);

        const axes = new THREE.AxesHelper(1.5);
        this.helpers.add(axes);
        this.scene.add(this.helpers);
      }

      this.scene.add(this.mesh);

      return { ok: true };
    } catch (e) {
      return {
        ok: false,
        reason: `WebGL 初始化失败：${(e as Error).message}`,
      };
    }
  }

  /**
   * 应用一组合法 vertex + fragment GLSL 源码。
   */
  applyShader(
    vertexSource: string,
    fragmentSource: string,
  ): { ok: true } | { ok: false; errors: ShaderError[] } {
    if (!this.renderer)
      return {
        ok: false,
        errors: [{ line: 0, column: 0, message: "Renderer 未初始化" }],
      };

    const oldMaterial = Array.isArray(this.mesh.material)
      ? null
      : this.mesh.material;
    if (oldMaterial) {
      oldMaterial.dispose();
    }
    this.material = null;

    this.material = new THREE.RawShaderMaterial({
      vertexShader: vertexSource,
      fragmentShader: fragmentSource,
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
        projectionMatrix: { value: new THREE.Matrix4() },
        viewMatrix: { value: new THREE.Matrix4() },
        modelMatrix: { value: new THREE.Matrix4() },
      },
    });

    this.mesh.material = this.material;

    return { ok: true };
  }

  /**
   * 强制立即编译当前 material 并返回 WebGL 诊断信息。
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
      return { ok: false, errors: allErrors };
    }

    return { ok: true, log: "", warnings: allWarnings };
  }

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

    if (compiled) {
      return { ok: true, warnings: log.trim() };
    }

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

      this.controls?.update();

      const u = this.material.uniforms;
      if (u.u_time)
        u.u_time.value = (performance.now() - this.startTime) / 1000;

      if (u.projectionMatrix)
        u.projectionMatrix.value.copy(this.camera.projectionMatrix);
      if (u.viewMatrix) u.viewMatrix.value.copy(this.camera.matrixWorldInverse);
      if (u.modelMatrix) u.modelMatrix.value.copy(this.mesh.matrixWorld);

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
    this.camera.aspect = w / h || 1;
    this.camera.updateProjectionMatrix();
    if (this.material?.uniforms.u_resolution) {
      (this.material.uniforms.u_resolution.value as THREE.Vector2).set(w, h);
    }
  }

  setMouse(nx: number, ny: number) {
    this.mouse.set(nx, ny);
  }

  getCanvas(): HTMLCanvasElement | null {
    return this.canvas;
  }

  dispose() {
    this.stop();
    this.controls?.dispose();
    this.controls = null;
    this.helpers?.traverse((obj) => {
      if (obj instanceof THREE.Line) {
        obj.geometry?.dispose();
        const mat = obj.material as
          | THREE.Material
          | THREE.Material[]
          | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else mat?.dispose();
      }
    });
    if (this.helpers) {
      this.scene.remove(this.helpers);
      this.helpers = null;
    }
    this.scene.remove(this.mesh);
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
