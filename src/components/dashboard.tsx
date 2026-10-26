'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Calculator, Check, CheckCheck, ChevronRight, CircleHelp, FileUp, Cloud, CloudCheck, GraduationCap, LayoutDashboard, LoaderCircle, LogOut, Moon, Plus, Search, Settings2, ShieldCheck, Sparkles, Sun, Target, TrendingUp, X } from 'lucide-react';
import { analyze, ceilGrade, fmt, groupMean, overallAverage, type Status } from '@/lib/calculations';
import { newSubject, setBlockGrade, setSemesterGrade, workspaceSchema, type Subject, type Workspace } from '@/lib/model';
import { api, Auth, Brand } from './auth';
import type { ParsedReport } from '@/lib/report-import';
import { ReportImport } from './report-import';
import { Onboarding } from './onboarding';
import { GradeInput, Modal, StatusBadge, statusLabels } from './ui';
import { SubjectPanel } from './subject-panel';
import { SemesterOverview, type SemesterKey } from './semester-overview';
import { AnnualGrade, RemainingTarget } from './block-grade';
type User = { id: string; name: string; username: string };
type SaveState = 'saved'|'pending'|'saving'|'error';
const subjectLetters = (name: string) => name.split(' ').filter(w => !['de','e','suas'].includes(w)).slice(0, 2).map(w => w[0]).join('');
export function Dashboard() {
  const [session, setSession] = useState<{ user: User | null; provider: string } | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [error, setError] = useState(''), [saveState, setSaveState] = useState<SaveState>('saved');
  const [search, setSearch] = useState(''), [filter, setFilter] = useState<Status|'all'>('all');
  const [panelId, setPanelId] = useState<string | null>(null), [modal, setModal] = useState<'help'|'manage'|'add'|'reload'|'export'|'onboarding'|null>(null);
  const [panelSemester, setPanelSemester] = useState<SemesterKey>('s2');
  const [panelGroup, setPanelGroup] = useState<'N1' | 'N2'>('N1');
  const [loadFailed, setLoadFailed] = useState(false);
  const [exporting, setExporting] = useState(false), [exportError, setExportError] = useState('');
  const pending = useRef<Workspace | null>(null), lastSaved = useRef<Workspace | null>(null), revision = useRef(0);
  const inflight = useRef<Promise<void> | null>(null), blocked = useRef(false);
  const [manageSearch, setManageSearch] = useState('');
  const [importReport, setImportReport] = useState<ParsedReport | null>(null), [importing, setImporting] = useState(false), [importError, setImportError] = useState('');
  const importInput = useRef<HTMLInputElement>(null);
  const [goalError, setGoalError] = useState('');
  const [subjectError, setSubjectError] = useState('');
  useEffect(() => { if (modal === 'add') setSubjectError(''); }, [modal]);
  const load = useCallback(async () => {
    setError(''); setLoadFailed(false);
    try {
      const auth = await api<{ user: User | null; provider: string }>('/api/auth'); setSession(auth);
      if (auth.user) {
        const result = await api<{ data: Workspace; revision: number }>('/api/workspace');
        const data = workspaceSchema.parse(result.data); revision.current = result.revision;
        pending.current = lastSaved.current = data; blocked.current = false; setWorkspace(data); setSaveState('saved');
        if (!data.onboardingSeen) setModal(current => current ?? 'onboarding');
      }
    } catch (err) { setError((err as Error).message); setLoadFailed(true); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const save = useCallback(async function persist(): Promise<void> {
    if (inflight.current) { await inflight.current; if (pending.current !== lastSaved.current) return persist(); return; }
    const snapshot = pending.current;
    if (!snapshot || snapshot === lastSaved.current) return;
    setSaveState('saving');
    const operation = (async () => {
      try {
        const result = await api<{ revision: number }>('/api/workspace', { method: 'PUT', body: JSON.stringify({ data: snapshot, revision: revision.current }) });
        revision.current = result.revision; lastSaved.current = snapshot; setError('');
        setSaveState(pending.current === snapshot ? 'saved' : 'pending');
      } catch (err) { blocked.current = true; setSaveState('error'); setError((err as Error).message); throw err; }
    })();
    inflight.current = operation;
    try { await operation; } finally { inflight.current = null; }
    if (pending.current !== lastSaved.current) return persist();
  }, []);
  useEffect(() => {
    if (!workspace || blocked.current || workspace === lastSaved.current) return;
    const timer = setTimeout(() => { void save().catch(() => {}); }, 650);
    return () => clearTimeout(timer);
  }, [workspace, save]);
  useEffect(() => {
    function warn(event: BeforeUnloadEvent) { if (pending.current !== lastSaved.current) { event.preventDefault(); event.returnValue = ''; } }
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = workspace?.theme || 'light'; }, [workspace?.theme]);
  function mutate(change: (w: Workspace) => Workspace) {
    if (!pending.current) return;
    const next = change(pending.current); pending.current = next; setWorkspace(next); setSaveState(blocked.current ? 'error' : 'pending');
  }
  function updateSubject(subject: Subject) { mutate(w => ({ ...w, subjects: w.subjects.map(s => s.id === subject.id ? subject : s) })); }
  function openSubject(id: string, semester: SemesterKey = 's2', group: 'N1' | 'N2' = 'N1') { setPanelSemester(semester); setPanelGroup(group); setPanelId(id); }
  function updateBlock(subject: Subject, semester: SemesterKey, group: 'N1' | 'N2', grade: number | null) { updateSubject({ ...subject, [semester]: setBlockGrade(subject[semester], group, grade) }); }
  async function logout() {
    try { await save(); await api('/api/auth', { method: 'POST', body: JSON.stringify({ action: 'logout' }) }); pending.current = lastSaved.current = null; setWorkspace(null); setSession(s => s ? { ...s, user: null } : null); setError(''); }
    catch (err) { setError((err as Error).message); }
  }
  function exportData() {
    const blob = new Blob([JSON.stringify(workspace, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), anchor = document.createElement('a'); anchor.href = url; anchor.download = `nota-clara-${workspace?.year}.json`; anchor.click(); URL.revokeObjectURL(url);
  }
  async function downloadGrades() {
    if (!workspace || !session?.user || exporting) return;
    setExporting(true); setExportError('');
    try {
      const { createReportPdf } = await import('@/lib/pdf-report');
      const content = createReportPdf(workspace,session.user.name);
      const blob = new Blob([new Uint8Array(content).buffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob), anchor = document.createElement('a');
      anchor.href = url; anchor.download = `nota-clara-estimativa-${workspace.year}.pdf`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setExportError('Não foi possível gerar o PDF. Tente novamente.'); }
    finally { setExporting(false); }
  }
  async function importPdf(file: File) {
    if (!pending.current || importing) return;
    setImporting(true); setImportError('');
    try { const { readReportPdf } = await import('@/lib/pdf-reader'); setImportReport(await readReportPdf(file,pending.current)); }
    catch(error) { setImportError(error instanceof Error ? error.message : 'Não foi possível ler o PDF. Nenhuma nota foi alterada.'); }
    finally { setImporting(false); if (importInput.current) importInput.current.value=''; }
  }
  function closeOnboarding() {
    if (pending.current && !pending.current.onboardingSeen) mutate(current=>({...current,onboardingSeen:true}));
    setModal(null);
  }
  if (loadFailed) return <main className="boot"><CircleHelp size={34} /><h1>Não conseguimos carregar sua planilha.</h1><p role="alert">{error}</p><button className="button primary" onClick={() => void load()}>Tentar novamente</button></main>;
  if (!session) return <main className="boot"><Brand /><LoaderCircle className="spin" size={28} /><p>Preparando seu espaço…</p></main>;
  if (!session.user) return <Auth provider={session.provider} onLogin={() => void load()} />;
  if (!workspace) return <main className="boot"><LoaderCircle className="spin" /><p>Carregando suas notas…</p></main>;
  const goal = workspace.personalGoal ?? 7;
  const visible = workspace.subjects.filter(s => !s.hidden);
  const general = overallAverage(visible);
  const analyses = visible.map(s => ({ s, a: analyze(s) }));
  const counts = (status: Status) => analyses.filter(({ a }) => a.status === status).length;
  const rows = analyses.filter(({ s, a }) => s.name.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(search.toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[\u0300-\u036f]/g, '')) && (filter === 'all' || a.status === filter));
  const filled = analyses.reduce((total, { a }) => total + a.first.filled + a.second.filled, 0);
  const panel = workspace.subjects.find(s => s.id === panelId);
  const saveLabel = saveState === 'saved' ? 'Tudo salvo' : saveState === 'saving' ? 'Salvando…' : saveState === 'pending' ? 'Alterações pendentes' : 'Falha ao salvar';
  const SaveIcon = saveState === 'saving' ? LoaderCircle : saveState === 'saved' ? CloudCheck : Cloud;
  return <div className="app-shell">
    <aside className="sidebar"><Brand /><div className="workspace-label">MEU ANO LETIVO</div><nav><button className="nav-item active" onClick={() => { setFilter('all'); setSearch(''); }}><LayoutDashboard size={18} /> Visão geral <span className="nav-active-dot" /></button><button className="nav-item" onClick={() => setModal('manage')}><BookOpen size={18} /> Minhas matérias <span className="nav-count">{visible.length}</span></button><button className="nav-item" onClick={() => setModal('help')}><Calculator size={18} /> Entenda os cálculos</button></nav>
      <div className="sidebar-note"><span className="sidebar-note-icon"><Target size={25} /></span><h3>Sua meta é {fmt(goal)}.</h3><button onClick={() => setModal('help')}>Como funciona <ArrowRight size={14} /></button><span className="sidebar-orbit" /></div>
      <div className="sidebar-bottom"><div className="private-note"><ShieldCheck size={16} /><span>Um espaço só seu.<small>Suas notas são privadas.</small></span></div><button className="nav-item" onClick={() => setModal('help')}><CircleHelp size={18} /> Ajuda e regras da escola</button><div className="sidebar-foot">nota clara <span>ESTUDE COM DIREÇÃO</span></div></div></aside>
    <div className="app-main"><header className="topbar"><span className="mobile-logo"><Brand /></span><div className="breadcrumb">Área do estudante <ChevronRight size={14} /><span>Visão geral</span></div><div className="topbar-actions"><span className={`save-status ${saveState}`} aria-live="polite"><SaveIcon size={16} className={saveState === 'saving' ? 'spin' : ''} /><span>{saveLabel}</span></span><button className="icon-button theme-toggle" aria-label={workspace.theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'} onClick={() => mutate(w => ({ ...w, theme: w.theme === 'light' ? 'dark' : 'light' }))}>{workspace.theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button><span className="topbar-divider" /><div className="user-info"><span className="avatar">{session.user.name.slice(0, 2).toUpperCase()}</span><span>{session.user.name}<small>Estudante</small></span></div><button className="icon-button" aria-label="Sair da conta" onClick={() => void logout()}><LogOut size={17} /></button></div></header>
      <main className="dashboard-content"><div className="page-heading"><div><span className="eyebrow">SEU ANO, SOB CONTROLE</span><h1>Suas notas, com clareza<span>.</span></h1><p>Saiba onde você está. Descubra o que falta para chegar lá.</p></div><label className="year-pill"><GraduationCap size={18} /><span>Ano letivo</span><input aria-label="Ano letivo" type="number" min={2000} max={2100} value={workspace.year} onChange={e => { const year = Number(e.target.value); if (year >= 2000 && year <= 2100) mutate(w => ({ ...w, year })); }} /></label></div>
      {error && <div className="notice error save-error" role="alert"><span>{error} Seus lançamentos continuam nesta aba.</span><button className="text-button" onClick={() => { blocked.current = false; void save().catch(() => {}); }}>Tentar salvar</button><button className="text-button" onClick={exportData}>Baixar cópia</button><button className="text-button" onClick={() => setModal('reload')}>Recarregar</button></div>}
      {session.provider === 'local' && <div className="local-banner"><span className="live-dot" /><span><strong>Versão local</strong> · Seus dados ficam no servidor deste computador.</span><span className="local-banner-end">Sincronização entre dispositivos: configuração pendente <CircleHelp size={14} /></span></div>}
      <section className="welcome-banner"><div><span className="banner-label"><Sparkles size={14} /> PLANEJAR TAMBÉM É APRENDER</span><h2>Um semestre de cada vez.</h2><p>Registre suas notas e transforme o “quanto falta?”<br className="desktop-break" /> em um próximo passo possível.</p><button onClick={() => setModal('help')}>Entenda como calculamos suas metas <ArrowRight size={16} /></button></div><div className="formula-art" aria-label="Primeiro semestre peso um, segundo semestre peso dois, meta anual sete"><span className="formula-art-orbit" /><span className="formula-card formula-first"><small>1º SEMESTRE</small><strong>1<span>×</span></strong><span>seu começo</span></span><span className="formula-plus">+</span><span className="formula-card formula-second"><small>2º SEMESTRE</small><strong>2<span>×</span></strong><span>sua próxima chance</span></span><span className="formula-goal"><Target size={15} /> meta anual <strong>7,0</strong></span></div></section>
      <section className="stats-grid" aria-label="Resumo das matérias"><Stat label="Média geral" value={fmt(general.average)} detail={general.count===0?'Preencha a média de um semestre':`${general.partial?'Parcial · médias disponíveis':'Médias anuais'} · ${general.count}/${general.total} matérias`} description="Média simples das matérias visíveis. Usa a média anual quando concluída; caso contrário, usa S1 concluído ou, se ausente, S2 concluído. Notas vazias e blocos parciais não contam. Não determina aprovação individual." icon={<Calculator size={19}/>} tone="green" /><Stat label="Matérias em curso" value={visible.length} detail="Seu percurso neste ano" icon={<BookOpen size={19} />} tone="neutral" /><Stat label="Aprovação garantida" value={counts('guaranteed')} detail="Mesmo com zero nas pendências" icon={<CheckCheck size={19} />} tone="green" /><Stat label="Precisam de atenção" value={counts('possible') + counts('impossible')} detail={counts('impossible') ? `${counts('impossible')} fora do alcance direto` : 'Metas para acompanhar de perto'} icon={<Target size={19} />} tone="amber" /><Stat label="Notas registradas" value={filled} detail="Cada lançamento traz mais clareza" icon={<TrendingUp size={19} />} tone="blue" /></section>
      <section className="spreadsheet"><div className="table-heading"><div><h2>Minhas matérias <span className="count">{visible.length} matérias</span></h2><p>Suas médias e o próximo passo em cada disciplina.</p></div><div className="table-actions"><input ref={importInput} type="file" accept="application/pdf,.pdf" aria-label="Selecionar boletim PDF" hidden onChange={event=>{const file=event.target.files?.[0];if(file)void importPdf(file);}}/><button className="button secondary import-button" disabled={importing} onClick={()=>importInput.current?.click()}><FileUp size={16}/>{importing?'Lendo PDF…':'Importar PDF'}</button><button className="button secondary manage-button" onClick={() => setModal('manage')}><Settings2 size={16} /> Gerenciar</button><button className="button primary" onClick={() => setModal('add')}><Plus size={17} /> Nova matéria</button></div></div>
        <div className="table-toolbar"><div className="table-tabs"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>Todas <span>{visible.length}</span></button><button className={filter === 'possible' ? 'active' : ''} onClick={() => setFilter('possible')}>Atenção <span>{counts('possible')}</span></button><button className={filter === 'guaranteed' ? 'active' : ''} onClick={() => setFilter('guaranteed')}>Garantidas <span>{counts('guaranteed')}</span></button><button className={filter === 'impossible' ? 'active' : ''} onClick={() => setFilter('impossible')}>Fora do alcance <span>{counts('impossible')}</span></button></div><label className="search-field"><Search size={16} /><input aria-label="Buscar matéria" placeholder="Buscar matéria…" value={search} onChange={e => setSearch(e.target.value)} />{search && <button aria-label="Limpar busca" onClick={() => setSearch('')}><X size={13} /></button>}</label></div>
        <p className="table-semester-hint">Clique em N1, N2 ou FINAL para digitar. Uma média final direta preserva N1/N2; apagar a direta volta a usá-las. Use <strong>+</strong> para detalhar. “Falta tirar” acompanha sua meta de {fmt(goal)}.</p>
        {importError && <p className="notice error import-error" role="alert">{importError}</p>}
        <div className="mobile-subject-list">{rows.map(({ s, a }) => <article className="mobile-subject" key={s.id}>
          <header><button className="subject-link" onClick={() => openSubject(s.id)}><span className={`subject-symbol tone-${workspace.subjects.findIndex(item => item.id === s.id) % 5}`}>{subjectLetters(s.name)}</span><span>{s.name}</span></button><button className="icon-button" aria-label={`Abrir ${s.name}`} onClick={() => openSubject(s.id)}><ChevronRight size={19} /></button></header>
          <div className="mobile-semesters">{(['s1','s2'] as const).map(key => <SemesterOverview key={key} semester={s[key]} semesterKey={key} subjectName={s.name} onDirectChange={grade => updateSubject({ ...s, [key]: setSemesterGrade(s[key],grade) })} onBlockChange={(group,grade) => updateBlock(s,key,group,grade)} onOpen={group => openSubject(s.id, key, group)} />)}</div>
          <div className="mobile-semester-target"><span>Falta tirar</span><RemainingTarget subject={s} goal={goal} /></div>
          <footer><div className="mobile-status-annual"><StatusBadge status={a.status} /><div><span>Final do ano</span><AnnualGrade subject={s} /></div></div><button className="text-button" onClick={() => openSubject(s.id)}>Avaliações e cálculos <ArrowRight size={13} /></button></footer>
          {a.adjusted && a.first.final && a.adjusted.gt(a.first.final) && <small className="recovered">S1 ajustado pela média recuperada: {fmt(a.adjusted)}</small>}
        </article>)}</div>
        {!rows.length && <div className="table-empty"><Search size={26} /><strong>Nenhuma matéria por aqui.</strong><p>{search ? 'Tente outro nome na busca.' : filter !== 'all' ? 'As matérias aparecerão aqui conforme suas notas forem registradas.' : 'Adicione uma matéria ou reative uma disciplina em Gerenciar.'}</p></div>}
        <div className="table-footer"><span><span className="live-dot" /> Os cálculos acompanham cada alteração.</span><span>{rows.length} de {visible.length} matérias</span></div>
      </section>
      <div className="below-table"><div className="legend"><span><i className="legend-green" /> Garantida</span><span><i className="legend-amber" /> Atenção</span><span><i className="legend-red" /> Fora do alcance direto</span><span><i className="legend-gray" /> Sem definição</span></div><button className="text-button" onClick={() => { setExportError(''); setModal('export'); }}><ArrowDownToLine size={14} /> Exportar boletim PDF</button></div>
      <div className="bottom-note"><ShieldCheck size={15} /><p>Aprovação garantida considera o pior resultado possível nas pendências. <button onClick={() => setModal('help')}>Conheça as regras de cálculo.</button></p></div><footer className="page-footer"><span>Seu futuro começa nas pequenas conquistas.</span><span>Feito para o seu próximo passo <span className="tiny-brand">nc.</span></span></footer>
    </main></div>
    {panel && <SubjectPanel key={panel.id} subject={panel} goal={goal} initialSemester={panelSemester} initialGroup={panelGroup} onChange={updateSubject} onClose={() => setPanelId(null)} saveLabel={saveLabel} saveError={saveState === 'error' ? error : ''} onRetry={() => { blocked.current = false; void save().catch(() => {}); }} />}
    {modal === 'onboarding' && <Onboarding onClose={closeOnboarding}/>}
    {importReport && <ReportImport workspace={workspace} report={importReport} onClose={()=>setImportReport(null)} onApply={change=>{mutate(change);setImportReport(null);}}/>}
    {modal === 'export' && <Modal title="Exportar boletim em PDF" onClose={() => setModal(null)}><div className="help-content"><p>O documento terá a tabela de disciplinas e médias, sem faltas nem frequência, com o título <strong>Estimativa de situação atual do boletim</strong>.</p><p>Somente matérias visíveis entram no relatório. A situação usa a regra de aprovação em 7,0; a coluna de meta acompanha sua meta pessoal de {fmt(goal)}. Notas pendentes ficam como traço.</p><div className="notice">Este PDF não é um boletim oficial da escola e não inclui recuperação final.</div><div className="export-options"><button className="button primary" disabled={exporting} onClick={() => void downloadGrades()}><ArrowDownToLine size={18} />{exporting?'Preparando PDF…':'Baixar PDF'}</button></div>{exportError && <p role="alert" className="notice error">{exportError}</p>}</div></Modal>}
    {modal === 'help' && <Modal title="Entenda suas notas" onClose={() => setModal(null)}><div className="help-content"><span className="small-icon"><Calculator size={24} /></span><h3>Uma meta clara, sem adivinhação.</h3><button className="button secondary" onClick={()=>setModal('onboarding')}>Rever introdução do site</button><p>As regras abaixo foram transcritas do documento da escola.</p><div className="formula-box">Média anual = (S1 ajustado + 2 × S2) ÷ 3<strong>Aprovação direta: média ≥ 7,0</strong></div><h4>A chance de recuperar S1</h4><p>Quando S1 está abaixo de 7 e S2 supera S1, usamos <strong>(S1 + S2) ÷ 2</strong> para ajustar S1, com limite de 7,0. S2 é a média do segundo semestre.</p><p>Por exemplo: com S1 = 6,0 e S2 = 7,2, o S1 ajustado é 6,6 e a média anual é exatamente 7,0.</p><h4>N1, N2 e avaliações pendentes</h4><p>Digite a média completa de N1 ou N2 diretamente na célula. O botão + permite detalhar provas, pesos e tipos. Só os blocos detalhados precisam de planejamento confirmado. Os pesos das avaliações valem dentro de seu próprio bloco; os pesos de N1/N2 compõem o semestre. Os pesos anuais são sempre 1 e 2. A coluna “Falta tirar” usa as notas já lançadas para projetar o que falta no segundo semestre. Sua meta pessoal pode variar de 7 a 10 em Gerenciar; os indicadores de aprovação continuam usando a regra escolar de 7,0. Digitar em FINAL ativa a média direta; apagar essa média volta a usar N1/N2, sem perder avaliações.</p><h4>O que significa cada situação?</h4>{(['guaranteed','possible','impossible','unknown'] as const).map(status => <div className="status-explanation" key={status}><StatusBadge status={status} /><p>{status === 'guaranteed' ? 'Mesmo com zero nas pendências, a média anual será pelo menos 7.' : status === 'possible' ? 'S1 está definido e a aprovação ainda é possível. Depende das notas restantes.' : status === 'impossible' ? 'Mesmo com 10 nas pendências, a média anual ficará abaixo de 7.' : 'Faltam dados ou o planejamento ainda não permite concluir.'}</p></div>)}<h4>Precisão e recuperação final</h4><p>O anexo não informa arredondamento oficial. Uma média abaixo de 7 não vira aprovação por arredondamento visual. As metas são arredondadas para cima em centésimos. O anexo também informa (recuperação final + média anual) ÷ 2 ≥ 6; essa etapa não entra na classificação de aprovação direta.</p><p className="hint">Ano letivo identifica esta planilha; alterar o ano não cria um histórico separado.</p></div></Modal>}
    {modal === 'add' && <Modal title="Nova matéria" onClose={() => setModal(null)}>
      <form className="add-form" onSubmit={e => {
        e.preventDefault(); const name = String(new FormData(e.currentTarget).get('name')).trim();
        if (!name) return;
        if (workspace.subjects.some(s => s.name.toLocaleLowerCase('pt-BR') === name.toLocaleLowerCase('pt-BR'))) { setSubjectError('Já existe uma matéria com esse nome. Você pode reativá-la em Gerenciar.'); return; }
        if (workspace.subjects.length >= 100) { setSubjectError('Você atingiu o limite de 100 matérias nesta planilha.'); return; }
        const subject = newSubject(name); mutate(w => ({ ...w, subjects: [...w.subjects, subject] })); setModal(null); openSubject(subject.id);
      }}><p>Organize mais uma parte do seu percurso.</p><label>Nome da matéria<input name="name" placeholder="Como a disciplina se chama?" required maxLength={120} autoFocus /></label>
        {subjectError && <div className="notice error" role="alert">{subjectError}</div>}
        <button className="button primary"><Plus size={16} /> Adicionar matéria</button>
      </form>
    </Modal>}
    {modal === 'manage' && <Modal title="Minhas matérias" onClose={() => { setModal(null); setManageSearch(''); }}><div className="manage-content"><section className="personal-goal-setting"><Target size={24}/><div><h3>Sua meta pessoal</h3><p>Escolha de 7,0 a 10,0. Ela muda o que falta tirar; a aprovação da escola continua em 7,0.</p></div><label>Meta anual<GradeInput label="Meta pessoal anual" value={goal} onChange={value=>{if(value!==null && value>=7 && value<=10){mutate(current=>({...current,personalGoal:value}));setGoalError('');}else setGoalError('A meta pessoal deve ficar entre 7,0 e 10,0.');}}/></label>{goalError&&<p className="notice error" role="alert">{goalError}</p>}</section><p>Oculte as matérias que você não cursa. Suas notas continuam guardadas e podem ser reativadas.</p><label className="search-field"><Search size={16} /><input aria-label="Filtrar matérias" placeholder="Buscar disciplina…" value={manageSearch} onChange={e => setManageSearch(e.target.value)} /></label><div className="manage-list">{workspace.subjects.filter(s => s.name.toLowerCase().includes(manageSearch.toLowerCase())).map(s => <label key={s.id}><span className="subject-symbol tone-1">{subjectLetters(s.name)}</span><span>{s.name}<small>{s.hidden ? 'Oculta na planilha' : 'Visível na planilha'}</small></span><input type="checkbox" aria-label={`Mostrar ${s.name}`} checked={!s.hidden} onChange={e => updateSubject({ ...s, hidden: !e.target.checked })} /></label>)}</div><button className="button secondary" onClick={() => setModal('add')}><Plus size={15} /> Adicionar matéria personalizada</button></div></Modal>}
    {modal === 'reload' && <Modal title="Recarregar os dados salvos?" onClose={() => setModal(null)}><div className="help-content"><p>As alterações ainda não salvas nesta aba serão descartadas. Você pode baixar uma cópia antes de continuar.</p><div className="table-actions"><button className="button secondary" onClick={exportData}>Baixar cópia</button><button className="button primary" onClick={() => { setModal(null); void load(); }}>Recarregar dados</button></div></div></Modal>}
  </div>;
}
function Stat({ label, value, detail, icon, tone, description }: { label: string; value: number | string; detail: string; icon: React.ReactNode; tone: string; description?: string }) {
  return <article className={`stat-card ${tone}`} title={description} aria-description={description}><div><span>{label}</span><span className="stat-icon">{icon}</span></div><strong>{typeof value === 'number' ? String(value).padStart(2, '0') : value}</strong><p>{detail}</p></article>;
}
