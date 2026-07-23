/**
 * 内置示例 shader
 *
 * 设计原则：
 * - 每个示例 = 一个完整 shader（含 vertex + fragment 两段 GLSL），
 *   选中后两个 stage 一起加载。避免之前「切换 stage tab 时 vertex/fragment
 *   来自不同示例」导致的视觉不一致（比如改了 fragment 后 vertex 动画丢失）。
 * - 几何体维度控制可见性：
 *     `geometry` 不设置 → 通用（plane/box/sphere 都能看到）
 *     `geometry: "box"`   → 仅 box 几何体下出现
 *     `geometry: "sphere"`→ 仅 sphere 几何体下出现
 * - `default: true` 标记该 (language, geometry) 组合的首访默认示例。
 */

import type { GeometryType } from "@shaderpad/playground";
import type { ShaderLanguageId } from "@shaderpad/runtime";

export interface ShaderExample {
  id: string;
  name: string;
  description: string;
  language: ShaderLanguageId;
  /** 限定到特定几何体；不设置 = 通用 */
  geometry?: GeometryType;
  /** 该 (language, geometry) 组合下的默认示例 */
  default?: boolean;
  /** 顶点着色器（GLSL ES 1.0，RawShaderMaterial 视角：需自声明 attribute / uniform） */
  vertex: string;
  /** 片元着色器（GLSL ES 1.0，需自带 precision） */
  fragment: string;
}

// ============================================================================
// 通用顶点着色器：基础 X 方向脉冲
// 让所有 fragment-only 编辑场景里几何体仍可见动画，避免「切到 fragment 后
// 几何体静止」的迷惑感。
// ============================================================================
const UNIVERSAL_VERTEX = `// 顶点沿 X 轴随时间往返 —— fragment 编辑时几何体仍可见动画
uniform float u_time;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;
void main() {
  vec3 pos = position;
  pos.x += sin(u_time) * 0.3;
  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`;

// ============================================================================
// ShaderPad 提供的 uniform 文档注释（每个示例都会在顶部复述一次，
// 让用户复制示例后能看到这些 hint，又不会与运行时代码冲突）
// ============================================================================
const UNIFORM_HINT = `// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)
`;

export const EXAMPLES: ShaderExample[] = [
  // ==========================================================================
  // 通用示例（无 geometry 字段 → 三个几何体都能看到）
  // ==========================================================================
  {
    id: "time-gradient",
    name: "时间渐变",
    description: "基础：u_time 驱动 HSL 色相渐变",
    language: "glsl",
    default: true,
    vertex: UNIVERSAL_VERTEX,
    fragment: `// 时间驱动的 HSL 渐变
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;
void main() {
  float hue = u_time * 0.15 + v_uv.x * 0.3 + v_uv.y * 0.2;
  vec3 rgb = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + hue));
  gl_FragColor = vec4(rgb, 1.0);
}
`,
  },
  {
    id: "uv-checker",
    name: "UV 棋盘格",
    description: "UV 坐标可视化，理解 shader 坐标系",
    language: "glsl",
    vertex: UNIVERSAL_VERTEX,
    fragment: `// 10×10 棋盘格
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;
void main() {
  vec2 grid = floor(v_uv * 10.0);
  float checker = mod(grid.x + grid.y, 2.0);
  vec2 g = fract(v_uv * 10.0);
  float line = step(0.95, max(g.x, g.y));
  vec3 color = mix(vec3(0.95), vec3(0.1), checker);
  color = mix(color, vec3(1.0, 0.5, 0.0), line);
  gl_FragColor = vec4(color, 1.0);
}
`,
  },
  {
    id: "mouse-circle",
    name: "鼠标跟随圆",
    description: "u_mouse 制造跟随光圈",
    language: "glsl",
    vertex: UNIVERSAL_VERTEX,
    fragment: `// 鼠标位置的高亮圆
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;
void main() {
  // v_uv 与 u_mouse 同空间（[0,1]）
  float dist = distance(v_uv, u_mouse);
  float radius = 0.1 + 0.05 * sin(u_time * 2.0);
  float circle = 1.0 - smoothstep(radius - 0.01, radius, dist);
  vec3 bg = 0.5 + 0.5 * cos(u_time * 0.5 + v_uv.xyx * 3.0);
  vec3 col = mix(bg, vec3(1.0), circle);
  gl_FragColor = vec4(col, 1.0);
}
`,
  },
  {
    id: "fbm-cloud",
    name: "FBM 云雾",
    description: "多层 Value Noise 叠加制造云雾感",
    language: "glsl",
    vertex: UNIVERSAL_VERTEX,
    fragment: `// FBM (Fractional Brownian Motion)
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
    u.y
  );
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}
void main() {
  float n = fbm(v_uv * 4.0 + u_time * 0.3);
  vec3 col = mix(vec3(0.05, 0.1, 0.3), vec3(0.6, 0.9, 1.0), n);
  gl_FragColor = vec4(col, 1.0);
}
`,
  },
  {
    id: "noise-2d",
    name: "Value Noise 2D",
    description: "基础伪随机噪声函数（hash + 双线性插值）",
    language: "glsl",
    vertex: UNIVERSAL_VERTEX,
    fragment: `// 经典 2D Value Noise：hash 采样 + 双线性插值
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0,0)), hash(i + vec2(1,0)), u.x),
    mix(hash(i + vec2(0,1)), hash(i + vec2(1,1)), u.x),
    u.y
  );
}
void main() {
  float n = noise(v_uv * 8.0 + u_time * 0.5);
  gl_FragColor = vec4(vec3(n), 1.0);
}
`,
  },

  // ==========================================================================
  // Box 专用示例（geometry: "box"）
  // ==========================================================================
  {
    id: "box-spin",
    name: "立方体自转",
    description: "Box: 绕 Y 轴持续旋转 + HSL 渐变",
    language: "glsl",
    geometry: "box",
    default: true,
    vertex: `// 立方体绕 Y 轴持续旋转 —— 配合 OrbitControls 观察各面颜色
${UNIFORM_HINT}
uniform float u_time;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;
void main() {
  vec3 pos = position;
  float angle = u_time * 0.8;
  float c = cos(angle);
  float s = sin(angle);
  pos.xz = mat2(c, -s, s, c) * pos.xz;
  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
    fragment: `// HSL 渐变（Box 6 面颜色随时间变化）
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;
void main() {
  float hue = u_time * 0.15 + v_uv.x * 0.3 + v_uv.y * 0.2;
  vec3 rgb = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + hue));
  gl_FragColor = vec4(rgb, 1.0);
}
`,
  },
  {
    id: "box-explode",
    name: "立方体六面爆破",
    description: "Box: 6 个面沿外法线聚散",
    language: "glsl",
    geometry: "box",
    vertex: `// 立方体六面爆破/聚合
// 根据顶点位置的绝对值判断所属面，每个面沿外法线 sin 波动
${UNIFORM_HINT}
uniform float u_time;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;
void main() {
  vec3 pos = position;
  vec3 absPos = abs(pos);
  // 找主导轴 → 该方向就是面法线方向
  vec3 faceDir = vec3(0.0);
  if (absPos.x >= absPos.y && absPos.x >= absPos.z) {
    faceDir = vec3(sign(pos.x), 0.0, 0.0);
  } else if (absPos.y >= absPos.z) {
    faceDir = vec3(0.0, sign(pos.y), 0.0);
  } else {
    faceDir = vec3(0.0, 0.0, sign(pos.z));
  }
  pos += faceDir * sin(u_time * 1.5) * 0.3;
  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
    fragment: `// UV 色彩条纹（看面与面之间的接缝爆破效果）
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;
void main() {
  vec3 col = 0.5 + 0.5 * cos(u_time * 0.6 + v_uv.xyx * 6.28);
  gl_FragColor = vec4(col, 1.0);
}
`,
  },

  // ==========================================================================
  // Sphere 专用示例（geometry: "sphere"）
  // SphereGeometry 自带 normal attribute，顶点着色器可访问
  // ==========================================================================
  {
    id: "sphere-spin",
    name: "球体自转",
    description: "Sphere: 绕 Y 轴旋转 + Lambert 光照",
    language: "glsl",
    geometry: "sphere",
    default: true,
    vertex: `// 球体绕 Y 轴持续旋转（normal 同步旋转，避免光照错位）
${UNIFORM_HINT}
uniform float u_time;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;
varying vec2 v_uv;
varying vec3 v_normal;
void main() {
  vec3 pos = position;
  float angle = u_time * 0.5;
  float c = cos(angle);
  float s = sin(angle);
  pos.xz = mat2(c, -s, s, c) * pos.xz;
  vec3 nrm = normal;
  nrm.xz = mat2(c, -s, s, c) * nrm.xz;
  v_uv = uv;
  v_normal = nrm;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
    fragment: `// 简单 Lambert 光照 + 基础 HSL 颜色
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;
varying vec3 v_normal;
void main() {
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
  float diff = max(dot(v_normal, lightDir), 0.0);
  float hue = u_time * 0.1 + v_uv.x * 0.3;
  vec3 base = 0.5 + 0.5 * cos(6.28318 * (vec3(0.0, 0.33, 0.67) + hue));
  vec3 col = base * 0.25 + base * diff;
  gl_FragColor = vec4(col, 1.0);
}
`,
  },
  {
    id: "sphere-wave",
    name: "球体法线波动",
    description: "Sphere: 沿 normal 方向 sin 波动，制造涟漪",
    language: "glsl",
    geometry: "sphere",
    vertex: `// 球体沿 normal 方向按 sin(position.y) 波动
${UNIFORM_HINT}
uniform float u_time;
uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;
attribute vec3 position;
attribute vec2 uv;
attribute vec3 normal;
varying vec2 v_uv;
varying vec3 v_normal;
void main() {
  vec3 pos = position;
  pos += normal * sin(u_time * 2.0 + position.y * 5.0) * 0.05;
  v_uv = uv;
  v_normal = normal;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
    fragment: `// 球面 Lambert + 蓝色基调
${UNIFORM_HINT}
precision highp float;
precision highp int;
uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;
varying vec2 v_uv;
varying vec3 v_normal;
void main() {
  vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
  float diff = max(dot(v_normal, lightDir), 0.0);
  vec3 col = vec3(0.3, 0.6, 1.0) * (0.2 + diff);
  gl_FragColor = vec4(col, 1.0);
}
`,
  },
];

/**
 * 选出指定 (language, geometry) 组合下的默认示例。
 *
 * 优先级：
 * 1. 标了 `default: true` 且匹配 geometry 的示例
 * 2. 同 language 的通用示例（无 geometry 字段）
 * 3. 同 language 的任意示例
 * 4. EXAMPLES[0]（兜底）
 */
export function getDefaultExample(
  language: ShaderLanguageId,
  geometry?: GeometryType,
): ShaderExample {
  // 1) 标了 default 且匹配 geometry（含通用 default）
  const explicitDefault = EXAMPLES.find(
    (e) =>
      e.language === language &&
      e.default === true &&
      (!e.geometry || e.geometry === geometry),
  );
  if (explicitDefault) return explicitDefault;

  // 2) 同 language 的通用示例
  const universal = EXAMPLES.find(
    (e) => e.language === language && !e.geometry,
  );
  if (universal) return universal;

  // 3) 同 language 任意
  const anyLang = EXAMPLES.find((e) => e.language === language);
  if (anyLang) return anyLang;

  // 4) 兜底
  return EXAMPLES[0];
}
