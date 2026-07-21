/**
 * URL 分享协议
 *
 * https://shaderpad.io/play?code=<base64url>&lang=glsl&v=1&t=fragment
 *
 * - code: 源码（LZString 压缩 + base64url）
 * - lang: 'glsl' | 'tsl' | 'wgsl'
 * - t:    'fragment' | 'vertex' | 'compute'
 * - v:    schema 版本
 */

import LZString from 'lz-string';
import type { ShaderLanguageId, ShaderStage } from '@shaderpad/runtime';

const SCHEMA_VERSION = '1';

export interface SharePayload {
  code: string;
  lang: ShaderLanguageId;
  stage: ShaderStage;
}

export function encodeShareUrl(payload: SharePayload): string {
  const compressed = LZString.compressToEncodedURIComponent(payload.code);
  const params = new URLSearchParams({
    code: compressed,
    lang: payload.lang,
    t: payload.stage,
    v: SCHEMA_VERSION,
  });
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/play?${params.toString()}`;
}

export function decodeShareUrl(search: string): SharePayload | null {
  try {
    const params = new URLSearchParams(search);
    const compressed = params.get('code');
    if (!compressed) return null;

    const code = LZString.decompressFromEncodedURIComponent(compressed);
    if (!code) return null;

    const lang = (params.get('lang') as ShaderLanguageId) || 'glsl';
    const stage = (params.get('t') as ShaderStage) || 'fragment';

    return { code, lang, stage };
  } catch {
    return null;
  }
}

export function getCurrentSharePayload(): SharePayload | null {
  if (typeof window === 'undefined') return null;
  return decodeShareUrl(window.location.search);
}
