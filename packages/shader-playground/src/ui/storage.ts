/**
 * Playground 的 localStorage 辅助
 *
 * 每个 ShaderPlayground 实例在用户编辑时把代码存到
 * `shaderpad:playground:${storageKey}:v${version}:${sourceHash}`，
 * 下次打开文章时恢复。
 *
 * v1 → v2 的关键变化：把"源文件 hash"纳入 key。
 * 这样当源文件 (props.code/pair.vertex/pair.fragment) 改变时，
 * 自动生成新的 key，旧的草稿会被自然绕过而不是"幽灵生效"。
 *
 * 旧 key 保留 fallback 读取，迁移期不丢失用户数据。
 *
 * storageKey 由调用方提供；不提供时跳过持久化（每次都是初始 code）。
 */

const PREFIX = "shaderpad:playground:";
const SCHEMA_VERSION = 2;

/**
 * 把 source 算成一个 8 字符短 hash。djb2 算法，碰撞率可接受（仅用于 cache key）。
 */
function shortHash(source: string): string {
  let hash = 5381;
  for (let i = 0; i < source.length; i++) {
    hash = (hash * 33) ^ source.charCodeAt(i);
  }
  // 转成无符号 32 位，再 base36
  return (hash >>> 0).toString(36).padStart(7, "0").slice(0, 8);
}

/**
 * 生成实际存到 localStorage 的 key。
 * 格式：v2:embed-test/pair-box:a3f9b1c2
 */
function buildKey(storageKey: string, source: string): string {
  return `v${SCHEMA_VERSION}:${storageKey}:${shortHash(source)}`;
}

/**
 * 加载草稿。优先读 v2 格式（新 key），回退到旧 v1 格式（无 hash），
 * 回退到比 v1 更早的格式（裸 storageKey）。
 */
export function loadPlaygroundDraft(
  storageKey: string | undefined,
  source: string,
): string | null {
  if (!storageKey || typeof window === "undefined") return null;
  try {
    // 1. 新格式（带 source hash）
    const v2Key = PREFIX + buildKey(storageKey, source);
    const v2 = localStorage.getItem(v2Key);
    if (v2 !== null) return v2;

    // 2. 旧 v1 格式（无 hash）—— 兼容老用户的草稿
    const v1Key = PREFIX + `v1:${storageKey}`;
    const v1 = localStorage.getItem(v1Key);
    if (v1 !== null) {
      // 第一次读到 v1 草稿，顺手迁移到 v2 key（保留用户编辑）
      try {
        localStorage.setItem(v2Key, v1);
        localStorage.removeItem(v1Key);
      } catch {
        // 迁移失败不影响读取
      }
      return v1;
    }

    // 3. 最老的格式（无版本号前缀）
    const legacy = localStorage.getItem(PREFIX + storageKey);
    if (legacy !== null) {
      try {
        localStorage.setItem(v2Key, legacy);
        localStorage.removeItem(PREFIX + storageKey);
      } catch {
        // ignore
      }
      return legacy;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * 保存草稿。用带 hash 的 key，所以源文件改了下次自动读新 key，不会读到旧草稿。
 */
export function savePlaygroundDraft(
  storageKey: string | undefined,
  source: string,
  code: string,
): void {
  if (!storageKey || typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFIX + buildKey(storageKey, source), code);
  } catch {
    // quota exceeded 等异常静默处理
  }
}

/**
 * 清掉某个 storageKey 下所有版本/所有 hash 的草稿。
 * 用于"Reset to source"按钮：清完用户编辑回到初始 code。
 */
export function clearPlaygroundDraft(
  storageKey: string | undefined,
  source?: string,
): void {
  if (!storageKey || typeof window === "undefined") return;
  try {
    // 1. 删当前 source 对应的 v2 key
    if (source !== undefined) {
      localStorage.removeItem(PREFIX + buildKey(storageKey, source));
    }
    // 2. 删所有 v1 + 裸 key（同一个 storageKey 下可能因为 source 多次改动积累了多个 hash 的草稿）
    const prefixToClean = PREFIX + `v1:${storageKey}`;
    const bareToClean = PREFIX + storageKey;
    Object.keys(localStorage)
      .filter((k) => k.startsWith(prefixToClean) || k === bareToClean)
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}

/**
 * 清掉所有 playground 草稿（应急用，比如页面调试时）。
 * 暴露在 window 上方便 DevTools 调用。
 */
export function clearAllPlaygroundDrafts(): number {
  if (typeof window === "undefined") return 0;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith(PREFIX));
  keys.forEach((k) => localStorage.removeItem(k));
  return keys.length;
}

// 暴露到 window 方便清缓存
if (typeof window !== "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).__spgClearDrafts = clearAllPlaygroundDrafts;
}
