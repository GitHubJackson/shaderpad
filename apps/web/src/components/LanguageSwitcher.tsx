/**
 * LanguageSwitcher —— 语言切换器（MVP 仅 GLSL 可用）
 */

import type { LanguageAdapter, ShaderLanguageId } from '@shaderpad/runtime';

interface Props {
  current: ShaderLanguageId;
  adapters: LanguageAdapter[];
  onChange: (id: ShaderLanguageId) => void;
}

export function LanguageSwitcher({ current, adapters, onChange }: Props) {
  return (
    <select
      className="lang-select"
      value={current}
      onChange={(e) => onChange(e.target.value as ShaderLanguageId)}
      title="切换着色器语言（TSL/WGSL Coming Soon）"
    >
      {adapters.map((a) => (
        <option key={a.id} value={a.id} disabled={!a.implemented}>
          {a.displayName}{!a.implemented ? ' (Soon)' : ''}
        </option>
      ))}
    </select>
  );
}
