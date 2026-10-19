'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, BookOpen, ChartNoAxesCombined, Check, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles } from 'lucide-react';
export async function api<T = Record<string, unknown>>(url: string, options?: RequestInit): Promise<T> {
  if (process.env.NEXT_PUBLIC_STATIC_HOST === 'true') {
    const { browserApi } = await import('@/lib/browser-api');
    return browserApi<T>(url,options);
  }
  const result = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers }, cache: 'no-store' });
  const body = await result.json();
  if (!result.ok) throw Object.assign(new Error(body.error || 'Não foi possível concluir a solicitação.'), { status: result.status });
  return body as T;
}
export function Brand() { return <span className="brand"><span className="brand-mark"><BookOpen size={22} strokeWidth={2.2} /></span><span>nota<span className="brand-light">clara</span><i /></span></span>; }
export function Auth({ provider, onLogin }: { provider: string; onLogin: () => void }) {
  const [mode, setMode] = useState<'login'|'signup'>('login');
  const [visible, setVisible] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    const data = new FormData(event.currentTarget);
    try {
      await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: mode, username: data.get('username'), password: data.get('password'), name: data.get('name') || undefined }) });
      onLogin();
    } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  return <main className="auth-layout">
    <section className="auth-story"><Brand /><div className="auth-story-content"><span className="eyebrow"><Sparkles size={14} /> MENOS DÚVIDAS. MAIS DIREÇÃO.</span><h1>Seu esforço merece<br />um caminho <em>claro.</em></h1><p>Organize suas notas, entenda suas metas e acompanhe cada passo até a aprovação.</p>
      <div className="auth-visual" aria-hidden="true"><div className="visual-grid" /><span className="visual-orbit orbit-one" /><span className="visual-orbit orbit-two" /><div className="visual-center"><ChartNoAxesCombined size={56} /><span>Um semestre<br /><strong>de cada vez.</strong></span></div><span className="visual-float"><Check size={16} /> Mais clareza para estudar</span></div>
      <div className="auth-points"><span><ShieldCheck size={17} /> Suas notas, só suas</span><span><Check size={17} /> Cálculos transparentes</span></div></div><small>Feito para transformar números em próximos passos.</small></section>
    <section className="auth-form-section"><div className="auth-mobile-brand"><Brand /></div><div className="auth-form-card"><span className="small-icon"><BookOpen size={22} /></span><h2>{mode === 'signup' ? 'Comece seu próximo capítulo.' : 'Bom ter você por aqui.'}</h2><p>{mode === 'signup' ? 'Crie sua conta e organize o seu ano letivo.' : 'Entre para acompanhar suas notas e suas metas.'}</p>
      <div className="segmented auth-tabs"><button className={mode === 'login' ? 'selected' : ''} onClick={() => { setMode('login'); setError(''); }}>Entrar</button><button className={mode === 'signup' ? 'selected' : ''} onClick={() => { setMode('signup'); setError(''); }}>Criar conta</button></div>
      <form onSubmit={submit}>
        <label>Nome de usuário<input name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="seu.usuario" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.\-]{3,30}" /><small className="hint">3 a 30 letras, números, pontos, hífens ou sublinhados.</small></label>
        <label>Senha<span className="password-field"><input name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Sua senha' : 'Pelo menos 10 caracteres'} required minLength={mode === 'login' ? 1 : 10} maxLength={128} /><button type="button" aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setVisible(!visible)}>{visible ? <EyeOff size={18} /> : <Eye size={18} />}</button></span></label>
        {error && <div className="notice error" role="alert">{error}</div>}
        <button className="button primary auth-submit" disabled={busy}>{busy ? 'Aguarde…' : mode === 'signup' ? 'Criar minha conta' : 'Acessar minha planilha'}<ArrowRight size={18} /></button>
      </form>
      <div className="auth-security"><LockKeyhole size={14} /> Acesso individual. Notas protegidas.</div>
      {provider === 'local' && <div className="local-note"><span className="live-dot" /> <div><strong>Ambiente local</strong><p>Contas e notas salvas no servidor deste computador. A sincronização entre dispositivos depende da configuração do Supabase.</p></div></div>}
    </div></section>
  </main>;
}
