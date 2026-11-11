'use client';
import { useEffect, useState } from 'react';
// Buffer local: vírgula decimal e texto inválido nunca substituem o peso válido.
export function WeightInput({ label, value, min = 0, max = 100, onChange }: { label: string; value: number; min?: number; max?: number; onChange: (value: number) => boolean }) {
  const [text, setText] = useState(String(value).replace('.', ','));
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setText(String(value).replace('.', ',')); setError(''); setDirty(false); }, [value]);
  function commit() {
    const v = Number(text.trim().replace(',', '.'));
    if (!/^\d+([.,]\d+)?$/.test(text.trim()) || !Number.isFinite(v) || v < min || v > max) {
      setText(String(value).replace('.', ',')); setDirty(false);
      setError(`Informe um peso entre ${String(min).replace('.', ',')} e ${max}. O peso anterior continua em uso.`);
    } else if (!onChange(v)) {
      setText(String(value).replace('.', ',')); setDirty(false);
      setError('N1 e N2 não podem ser ambos zero. O peso anterior continua em uso.');
    } else { setText(String(v).replace('.', ',')); setError(''); setDirty(false); }
  }
  return <span className="weight-input"><input aria-label={label} aria-invalid={!!error} inputMode="decimal" value={text} onChange={e => { setText(e.target.value); setError(''); setDirty(true); }} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />{(error || dirty) && <small role={error ? 'alert' : 'status'}>{error || 'Confirme saindo do campo ou pressionando Enter.'}</small>}</span>;
}
