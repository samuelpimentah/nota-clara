'use client';
import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check, CircleHelp, X, XCircle } from 'lucide-react';
import { fmt, parseGrade, type Status } from '@/lib/calculations';
export function GradeInput({ value, onChange, label, compact = false }: { value: number | null; onChange: (value: number | null) => void; label: string; compact?: boolean }) {
  const [text, setText] = useState(value === null ? '' : fmt(value, 4));
  const [error, setError] = useState('');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setText(value === null ? '' : fmt(value, 4)); }, [value]);
  function update(next: string) {
    setText(next);
    try { const parsed = parseGrade(next); onChange(parsed); setError(''); }
    catch (err) { setError((err as Error).message); }
  }
  return <span className={`grade-field ${compact ? 'compact' : ''}`}>
    <input aria-label={label} aria-invalid={!!error} title={error || label} inputMode="decimal" placeholder="—" value={text}
      onFocus={() => { focused.current = true; }} onChange={e => update(e.target.value)}
      onBlur={() => { focused.current = false; if (!error) setText(value === null ? '' : fmt(value, 4)); }} onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }} />
    {error && <span className="field-error" role="alert">{error}</span>}
  </span>;
}
export const statusLabels: Record<Status, string> = { guaranteed: 'Garantida', possible: 'Atenção', impossible: 'Fora do alcance', unknown: 'Sem definição' };
export function StatusBadge({ status }: { status: Status }) {
  const Icon = status === 'guaranteed' ? Check : status === 'possible' ? AlertTriangle : status === 'impossible' ? XCircle : CircleHelp;
  return <span className={`status ${status}`}><Icon size={13} />{statusLabels[status]}</span>;
}
export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = ref.current; element?.showModal(); return () => element?.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="modal-inner"><header><h2>{title}</h2><button className="icon-button" aria-label="Fechar janela" onClick={onClose}><X size={20} /></button></header>{children}</div>
  </dialog>;
}
