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
 * WebGLRenderer + RawShaderMaterial 是 raw GLSL 调试的成熟稳定组合，
 * MVP 阶段优先选它。Phase 2 再考虑 WebGPU + TSL 适配。
 */

import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export interface EngineOptions {
  container: HTMLElement;
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

  constructor(options: EngineOptions) {
    this.container = options.container;
    this.scene = new THREE.Scene();

    // 透视相机：3/4 视角（右上后方），更好看、立体感更强。
    // fov=45 在距离 ≈4.7 处视野高度 ≈ 3.9，几何体约占 25%~38% 视口。
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

  /**
   * 创建指定类型的几何体。
   * - plane: 1.5 边长正方形（XY 平面）
   * - box: 1.2 边长立方体
   * - sphere: 半径 0.6 的球体（32x16 段）
   */
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

  /**
   * 切换几何体。Material 不变（attribute 接口一致：position/uv），
   * 仅替换 mesh.geometry。
   */
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
      this.renderer.setClearColor(new THREE.Color(0x0a0a0a), 1);
      this.container.appendChild(this.renderer.domElement);
      this.canvas = this.renderer.domElement;
      this.canvas.style.display = "block";
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";

      // OrbitControls：左键旋转、右键平移、滚轮缩放
      // target 设为原点（mesh 居中），rotate/pan 围绕 mesh 中心
      this.controls = new OrbitControls(this.camera, this.canvas);
      this.controls.target.set(0, 0, 0);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.update();

      // 场景辅助物：grid（XZ 平面，10x10）+ axes（原点，1.5 长度）
      // 颜色用偏暗的灰阶，背景为 #0a0a0a 时仍有对比但不会喧宾夺主
      this.helpers = new THREE.Group();
      const grid = new THREE.GridHelper(
        10,
        10,
        0x666666, // 中心十字
        0x2a2a35, // 普通格线
      );
      // GridHelper 默认材质 side=DoubleSide，且 depthWrite=true
      // 这里让它绘制在物体之后（z 值小于 mesh），避免遮挡
      grid.position.y = -0.001;
      this.helpers.add(grid);

      const axes = new THREE.AxesHelper(1.5);
      // AxesHelper 默认三色：X 红 (0xff0000) / Y 绿 (0x00ff00) / Z 蓝 (0x0000ff)
      // 与 GridHelper 一起方便判断模型朝向和缩放比例
      this.helpers.add(axes);

      this.scene.add(this.helpers);
      this.scene.add(this.mesh);

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
   * 应用一组合法 vertex + fragment GLSL 源码。
   *
   * 两者都是完整 GLSL（RawShaderMaterial 不自动注入任何 attribute / uniform / precision），
   * 由调用方负责保证两者一致：vertex 必须输出 fragment 期望的 varying，
   * fragment 必须自带 `precision highp float;`。
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

    // 移除旧材质
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
        // 标准 Three.js MVP 矩阵
        // RawShaderMaterial 不会自动注入，需要手动从 camera / mesh 读取
        projectionMatrix: { value: new THREE.Matrix4() },
        viewMatrix: { value: new THREE.Matrix4() },
        modelMatrix: { value: new THREE.Matrix4() },
      },
    });

    this.mesh.material = this.material;
    // 不再 scene.clear()，否则会清掉 init() 中加入的 grid / axes
    // mesh 在 init() 已经加入 scene，此处只需更新 material

    // 调试：验证引擎里存的 source 长度
    // eslint-disable-next-line no-console
    console.log(
      `[shaderpad] applyShader fragmentLen=${this.material.fragmentShader.length} vertexLen=${this.material.vertexShader.length}`,
    );

    return { ok: true };
  }

  /**
   * 强制立即编译当前 material 并返回 WebGL 诊断信息。
   * 直接调 WebGL API 编译 user source（不走 Three.js 内部路径），
   * 因为 material.program.diagnostics 路径在 Three.js 0.170 不可靠
   * （program 对象不一定存在，diagnostics 字段也不一致）。
   *
   * 错误行号：现在用户 source 即为完整 GLSL，无需 offset 调整。
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

      // OrbitControls：damping 需要每帧 update
      this.controls?.update();

      // 更新 uniforms
      const u = this.material.uniforms;
      if (u.u_time)
        u.u_time.value = (performance.now() - this.startTime) / 1000;

      // MVP 矩阵：每帧从 camera / mesh 读取
      // projectionMatrix: 相机投影矩阵
      // viewMatrix: 相机世界变换的逆
      // modelMatrix: mesh 的世界变换
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
    // PerspectiveCamera 需要随容器尺寸更新 aspect，否则变形
    this.camera.aspect = w / h || 1;
    this.camera.updateProjectionMatrix();
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
    this.controls?.dispose();
    this.controls = null;
    // 释放 helpers 内所有 Line/Geometry 资源
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
    this.scene.remove(this.helpers!);
    this.helpers = null;
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
