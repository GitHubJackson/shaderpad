/// <reference path="../.astro/types.d.ts" />
/// <reference types="@webgpu/types" />

/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Google Analytics 4 测量 ID（G-XXXXXXXXXX），未设置时不启用 */
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  /** 站点 URL（用于 OG/canonical 标签） */
  readonly PUBLIC_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google Analytics 全局类型
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

export {};
