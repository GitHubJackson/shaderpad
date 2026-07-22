/**
 * URL 分享协议
 *
 * https://shaderpad.io/play?vertex=<base64url>&fragment=<base64url>&lang=glsl&v=1
 *
 * - vertex:   顶点源码（LZString 压缩 + base64url）
 * - fragment: 片元源码（LZString 压缩 + base64url）
 * - lang:     'glsl' | 'tsl' | 'wgsl'
 * - v:        schema 版本
 *
 * 一个完整 shader = vertex + fragment 一对，stage 信息冗余（旧协议的 t 已废弃）。
 */

import LZString from "lz-string";
import type { ShaderLanguageId } from "@shaderpad/runtime";

const SCHEMA_VERSION = "1";

export interface SharePayload {
  vertex: string;
  fragment: string;
  lang: ShaderLanguageId;
}

export function encodeShareUrl(payload: SharePayload): string {
  const v = LZString.compressToEncodedURIComponent(payload.vertex);
  const f = LZString.compressToEncodedURIComponent(payload.fragment);
  const params = new URLSearchParams({
    vertex: v,
    fragment: f,
    lang: payload.lang,
    v: SCHEMA_VERSION,
  });
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/play?${params.toString()}`;
}

export function decodeShareUrl(search: string): SharePayload | null {
  try {
    const params = new URLSearchParams(search);
    const vComp = params.get("vertex");
    const fComp = params.get("fragment");
    // 向后兼容旧协议：单 code 字段当作 fragment 传入
    const legacyCode = params.get("code");
    if (!vComp && !fComp && !legacyCode) return null;

    const vertex = vComp
      ? LZString.decompressFromEncodedURIComponent(vComp) || ""
      : "";
    const fragment = fComp
      ? LZString.decompressFromEncodedURIComponent(fComp) ||
        (legacyCode
          ? LZString.decompressFromEncodedURIComponent(legacyCode) || ""
          : "")
      : "";

    const lang = (params.get("lang") as ShaderLanguageId) || "glsl";

    return { vertex, fragment, lang };
  } catch {
    return null;
  }
}

export function getCurrentSharePayload(): SharePayload | null {
  if (typeof window === "undefined") return null;
  return decodeShareUrl(window.location.search);
}
