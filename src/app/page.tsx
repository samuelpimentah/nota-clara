import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Nota Clara | Manutenção temporária',
  description: 'Estamos revisando os cálculos. Previsão de retorno: 12/11/2026. Seus dados permanecem preservados.',
};

// Manutenção temporária: não monta o Dashboard nem acessa autenticação ou dados.
// A reabertura exige uma alteração explícita após a revisão dos cálculos.
export default function Page() {
  return (
    <main className="maintenance">
      <style>{`
        .maintenance { min-height:100svh; display:grid; place-items:center; padding:32px 20px; background:radial-gradient(ellipse at top,#e1f2e9,transparent 65%),#f5f8f6; color:#173d36; }
        .maintenance-card { width:100%; max-width:640px; padding:clamp(28px,6vw,54px); border:1px solid #dce8e1; border-radius:26px; background:#ffffffed; box-shadow:0 20px 70px #163d3709; }
        .maintenance-brand { display:flex; align-items:center; gap:12px; font:800 23px Manrope,sans-serif; letter-spacing:-.8px; margin-bottom:36px; }
        .maintenance-mark { display:grid; place-items:center; width:43px; height:43px; border-radius:13px 13px 13px 4px; background:#a4e7cf; }
        .maintenance-label { display:inline-flex; align-items:center; gap:8px; padding:7px 11px; background:#edf5f0; border-radius:30px; font-size:12px; font-weight:600; }
        .maintenance-label::before { content:''; width:7px; height:7px; background:#36806b; border-radius:50%; }
        .maintenance h1 { font-size:clamp(29px,5vw,39px); line-height:1.2; letter-spacing:-1.3px; margin:21px 0 18px; }
        .maintenance p { font-size:16px; line-height:1.75; color:#52675f; }
        .maintenance-return { display:flex; align-items:center; justify-content:space-between; gap:16px; margin:26px 0; padding:18px 20px; border-radius:15px; background:#e9f5ee; }
        .maintenance-return span { font-size:14px; color:#49665a; }
        .maintenance-return time { font:800 20px Manrope,sans-serif; white-space:nowrap; }
        .maintenance-note { padding-top:23px; border-top:1px solid #e4ece7; }
        .maintenance-note h2 { font-size:15px; margin:0 0 8px; }
        .maintenance-note p { font-size:14px; line-height:1.7; }
        .maintenance-safe { display:flex; align-items:flex-start; gap:9px; margin-top:24px; }
        .maintenance-safe svg { flex-shrink:0; margin-top:4px; color:#34775f; }
        .maintenance-safe p { font-size:13px; }
        .maintenance-thanks { margin-top:22px; font-size:13px!important; }
        @media(max-width:400px) { .maintenance-return { align-items:flex-start; flex-direction:column; gap:5px; } }
      `}</style>
      <section className="maintenance-card" aria-labelledby="maintenance-title">
        <div className="maintenance-brand">
          <span className="maintenance-mark" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 7v14m0-14C9 4 5 4 2 5v14c3-1 7-1 10 2 3-3 7-3 10-2V5c-3-1-7-1-10 2Z" /></svg>
          </span>
          Nota Clara
        </div>
        <span className="maintenance-label">Uma pausa para conferir tudo</span>
        <h1 id="maintenance-title">Estamos cuidando<br />de cada cálculo.</h1>
        <p>O Nota Clara está temporariamente indisponível enquanto revisamos os cálculos, após relatos de divergências em alguns resultados. Queremos que você acompanhe suas notas com mais clareza e confiança.</p>
        <div className="maintenance-return">
          <span>Previsão de retorno</span>
          <time dateTime="2026-11-12">12/11/2026</time>
        </div>
        <section className="maintenance-note" aria-labelledby="maintenance-guidance">
          <h2 id="maintenance-guidance">Enquanto isso, confira com a escola</h2>
          <p>Os resultados do site são estimativas e não substituem o boletim oficial. Até concluirmos a revisão, confirme suas médias e as notas necessárias com seus professores.</p>
          <p style={{ marginTop: 12 }}>Cada usuário é responsável por informar corretamente as notas e os pesos, conforme os critérios do professor. Pesos incorretos podem alterar as médias e as estimativas de aprovação.</p>
        </section>
        <div className="maintenance-safe">
          <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></svg>
          <p>Suas notas e configurações continuam preservadas. Esta manutenção não apaga os dados da sua conta.</p>
        </div>
        <p className="maintenance-thanks">Obrigado pela paciência. A data é uma previsão e pode mudar conforme a revisão.</p>
      </section>
    </main>
  );
}
