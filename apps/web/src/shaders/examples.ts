/**
 * 内置示例 shader
 * MVP 阶段提供 4-6 个，覆盖教学场景
 *
 * 字段说明：
 * - `geometry?` 为可选：未设置时表示通用示例（所有几何体下都出现）；
 *   设置后只在该几何体下出现。
 *   这样切换几何体类型时 Examples 列表会自动过滤出匹配的示例。
 */

import type { GeometryType } from "@/lib/runtime/three-engine";
import type { ShaderLanguageId, ShaderStage } from "@shaderpad/runtime";

export interface ShaderExample {
  id: string;
  name: string;
  description: string;
  language: ShaderLanguageId;
  stage: ShaderStage;
  /** 限定到特定几何体；不设置 = 通用 */
  geometry?: GeometryType;
  /** 标记为该 (stage, geometry) 组合的默认示例 */
  default?: boolean;
  code: string;
}

export const EXAMPLES: ShaderExample[] = [
  // ============================================================================
  // Fragment Shader 示例
  // ============================================================================
  {
    id: "gradient",
    name: "时间渐变",
    description: "基础：使用 u_time 制造 HSL 渐变",
    language: "glsl",
    stage: "fragment",
    default: true,
    code: `// 时间驱动的色相渐变
// u_time 单位为秒，u_resolution 是画布宽高
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float hue = u_time * 0.15 + uv.x * 0.3 + uv.y * 0.2;

  // HSL -> RGB 转换
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
    stage: "fragment",
    code: `// UV 棋盘格：u_resolution 归一化像素坐标
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;

  // 10x10 棋盘
  vec2 grid = floor(uv * 10.0);
  float checker = mod(grid.x + grid.y, 2.0);

  // 边线高亮
  vec2 g = fract(uv * 10.0);
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
    description: "使用 u_mouse 制造跟随效果",
    language: "glsl",
    stage: "fragment",
    code: `// 鼠标位置的高亮圆 + 拖尾
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 mouse = u_mouse;

  float dist = distance(uv, mouse);
  float radius = 0.1 + 0.05 * sin(u_time * 2.0);

  // 软边缘
  float circle = 1.0 - smoothstep(radius - 0.01, radius, dist);

  vec3 bg = 0.5 + 0.5 * cos(u_time * 0.5 + uv.xyx * 3.0);
  vec3 col = mix(bg, vec3(1.0), circle);

  gl_FragColor = vec4(col, 1.0);
}
`,
  },
  {
    id: "noise-2d",
    name: "Value Noise 2D",
    description: "基础伪随机噪声函数",
    language: "glsl",
    stage: "fragment",
    code: `// 经典 2D Value Noise
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

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
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float n = noise(uv * 8.0 + u_time * 0.5);

  gl_FragColor = vec4(vec3(n), 1.0);
}
`,
  },
  {
    id: "fbm",
    name: "FBM 分形布朗运动",
    description: "多层噪声叠加，制造云雾感",
    language: "glsl",
    stage: "fragment",
    code: `// FBM (Fractional Brownian Motion)
// 通过叠加多个不同频率/振幅的噪声制造自然纹理
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

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
  vec2 uv = gl_FragCoord.xy / u_resolution;
  float n = fbm(uv * 4.0 + u_time * 0.3);

  // 调色：深蓝 -> 浅青
  vec3 col = mix(vec3(0.05, 0.1, 0.3), vec3(0.6, 0.9, 1.0), n);
  gl_FragColor = vec4(col, 1.0);
}
`,
  },

  // ============================================================================
  // Vertex Shader 示例
  // ============================================================================
  {
    id: "vertex-basic",
    name: "基础位移",
    description: "Hello Vertex：顶点沿 X 轴随时间往返",
    language: "glsl",
    stage: "vertex",
    default: true,
    code: `// 顶点沿 X 轴随时间往返 —— 最基础的 u_time 动画
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

// 必传 attribute: position (vec3), uv (vec2)

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;

void main() {
  vec3 pos = position;
  // X 方向随时间在 [-0.3, 0.3] 之间往复
  pos.x += sin(u_time) * 0.3;

  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
  },
  {
    id: "vertex-wave",
    name: "正弦波浪",
    description: "基础：使用 u_time 在 Y 方向波动",
    language: "glsl",
    stage: "vertex",
    code: `// 顶点沿 Y 轴正弦波动的方阵
// 必传 attribute: position (vec3), uv (vec2)
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;

void main() {
  vec3 pos = position;

  // 越靠近中心的顶点波动越大
  float wave = sin(pos.x * 4.0 + u_time * 2.0) * 0.1;
  pos.y += wave * (1.0 - abs(uv.x - 0.5) * 2.0);

  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
  },
  {
    id: "vertex-twist",
    name: "螺旋扭曲",
    description: "随距离中心点旋转，制造螺旋效果",
    language: "glsl",
    stage: "vertex",
    code: `// 顶点绕中心点 Z 轴旋转，距离中心越远旋转越多
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

// 必传 attribute: position (vec3), uv (vec2)

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;

void main() {
  vec3 pos = position;
  float dist = length(pos.xy);
  float angle = dist * 3.0 + u_time * 1.5;

  float c = cos(angle);
  float s = sin(angle);
  pos.xy = mat2(c, -s, s, c) * pos.xy;

  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
  },
  {
    id: "vertex-pulse",
    name: "呼吸缩放",
    description: "全网格随时间整体缩放",
    language: "glsl",
    stage: "vertex",
    code: `// 整体呼吸效果：scale = 1 + 0.2 * sin(u_time)
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数，每帧递增
//   uniform vec2  u_resolution; // 画布宽高（像素）
//   uniform vec2  u_mouse;      // 鼠标位置，归一化到 [0,1]（Y 已翻转）
//   uniform float u_random;     // applyShader 时的随机数 [0,1)

// 必传 attribute: position (vec3), uv (vec2)

uniform float u_time;
uniform vec2  u_resolution;
uniform vec2  u_mouse;
uniform float u_random;

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform mat4 modelMatrix;

attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;

void main() {
  vec3 pos = position;
  float scale = 1.0 + 0.15 * sin(u_time * 2.0);
  pos.xy *= scale;

  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
  },
  // ============================================================================
  // Box-specific Vertex 示例
  // ============================================================================
  {
    id: "vertex-box-rotate",
    name: "立方体旋转",
    description: "Box: 绕 Y 轴持续旋转",
    language: "glsl",
    stage: "vertex",
    geometry: "box",
    code: `// 立方体绕 Y 轴持续旋转 —— 看 OrbitControls 配合使用
//
// ShaderPad 提供的 uniform（需在源码中显式声明才能使用）：
//   uniform float u_time;       // 自启动以来的秒数

// 必传 attribute: position (vec3), uv (vec2)

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

  // 绕 Y 轴旋转
  float c = cos(angle);
  float s = sin(angle);
  pos.xz = mat2(c, -s, s, c) * pos.xz;

  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
  },
  {
    id: "vertex-box-explode",
    name: "立方体六面爆破",
    description: "Box: 6 个面沿外法线聚散",
    language: "glsl",
    stage: "vertex",
    geometry: "box",
    code: `// 立方体六面爆破/聚合
// 根据顶点位置的绝对值判断所属面，每个面沿外法线 sin 波动
//
// ShaderPad 提供的 uniform：
//   uniform float u_time;

// 必传 attribute: position (vec3), uv (vec2)

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

  // 沿面法线 sin 波动（负值收缩、正值爆破）
  pos += faceDir * sin(u_time * 1.5) * 0.3;

  v_uv = uv;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
  },
  // ============================================================================
  // Sphere-specific Vertex 示例
  // ============================================================================
  {
    id: "vertex-sphere-rotate",
    name: "球体自转",
    description: "Sphere: 绕 Y 轴持续旋转",
    language: "glsl",
    stage: "vertex",
    geometry: "sphere",
    code: `// 球体绕 Y 轴持续旋转
//
// ShaderPad 提供的 uniform：
//   uniform float u_time;

// 必传 attribute: position (vec3), uv (vec2), normal (vec3)

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

  // 绕 Y 轴旋转
  float c = cos(angle);
  float s = sin(angle);
  pos.xz = mat2(c, -s, s, c) * pos.xz;

  // 旋转法线（同步旋转，否则光照会错）
  vec3 nrm = normal;
  nrm.xz = mat2(c, -s, s, c) * nrm.xz;

  v_uv = uv;
  v_normal = nrm;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
  },
  {
    id: "vertex-sphere-displace",
    name: "球体法线波动",
    description: "Sphere: 沿 normal 方向 sin 波动，制造涟漪",
    language: "glsl",
    stage: "vertex",
    geometry: "sphere",
    code: `// 球体沿法线方向波动 —— Three.js 几何体自动提供 normal attribute
//
// ShaderPad 提供的 uniform：
//   uniform float u_time;

// 必传 attribute: position (vec3), uv (vec2), normal (vec3)

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

  // 沿 normal 方向按 sin(position.y) 波动
  pos += normal * sin(u_time * 2.0 + position.y * 5.0) * 0.05;

  v_uv = uv;
  v_normal = normal;
  gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(pos, 1.0);
}
`,
  },
];

/**
 * 选出指定 (language, stage, geometry) 组合下的默认示例。
 *
 * 优先级：
 * 1. 标了 `default: true` 且匹配 geometry 的示例
 * 2. 同 stage 的通用示例（无 geometry 字段）
 * 3. 同 stage 的任意示例
 * 4. 同 language 的任意示例
 * 5. EXAMPLES[0]
 */
export function getDefaultExample(
  language: ShaderLanguageId,
  stage: ShaderStage = "fragment",
  geometry?: GeometryType,
): ShaderExample {
  // 1) 标了 default 且匹配 geometry
  const explicitDefault = EXAMPLES.find(
    (e) =>
      e.language === language &&
      e.stage === stage &&
      e.default === true &&
      (!e.geometry || e.geometry === geometry),
  );
  if (explicitDefault) return explicitDefault;

  // 2) 同 stage 的通用示例
  const universal = EXAMPLES.find(
    (e) => e.language === language && e.stage === stage && !e.geometry,
  );
  if (universal) return universal;

  // 3) 同 stage 任意
  const sameStage = EXAMPLES.find(
    (e) => e.language === language && e.stage === stage,
  );
  if (sameStage) return sameStage;

  // 4) 同 language 任意
  const anyLang = EXAMPLES.find((e) => e.language === language);
  if (anyLang) return anyLang;

  // 5) 兜底
  return EXAMPLES[0];
}
