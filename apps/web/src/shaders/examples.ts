/**
 * 内置示例 shader
 * MVP 阶段提供 4-6 个，覆盖教学场景
 */

import type { ShaderLanguageId, ShaderStage } from "@shaderpad/runtime";

export interface ShaderExample {
  id: string;
  name: string;
  description: string;
  language: ShaderLanguageId;
  stage: ShaderStage;
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
    code: `// 时间驱动的色相渐变
// u_time 单位为秒，u_resolution 是画布宽高

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

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 mouse = u_mouse;
  // 注意：WebGPU 帧缓冲 Y 方向已翻转，u_mouse 同步归一化到 [0,1]

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
    id: "vertex-wave",
    name: "正弦波浪",
    description: "基础：使用 u_time 在 Y 方向波动",
    language: "glsl",
    stage: "vertex",
    code: `// 顶点沿 Y 轴正弦波动的方阵
// 必传 attribute: position (vec3), uv (vec2)

attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;

void main() {
  vec3 pos = position;

  // 越靠近中心的顶点波动越大
  float wave = sin(pos.x * 4.0 + u_time * 2.0) * 0.1;
  pos.y += wave * (1.0 - abs(uv.x - 0.5) * 2.0);

  v_uv = uv;
  gl_Position = vec4(pos, 1.0);
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
  gl_Position = vec4(pos, 1.0);
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

attribute vec3 position;
attribute vec2 uv;
varying vec2 v_uv;

void main() {
  vec3 pos = position;
  float scale = 1.0 + 0.15 * sin(u_time * 2.0);
  pos.xy *= scale;

  v_uv = uv;
  gl_Position = vec4(pos, 1.0);
}
`,
  },
];

export function getDefaultExample(
  language: ShaderLanguageId,
  stage: ShaderStage = "fragment",
): ShaderExample {
  const found = EXAMPLES.find(
    (e) => e.language === language && e.stage === stage,
  );
  if (found) return found;
  // fallback: 同语言任意 stage
  const anyStage = EXAMPLES.find((e) => e.language === language);
  return anyStage || EXAMPLES[0];
}
