'use client';
import { useState } from 'react';
import { AlertTriangle, BookOpen, Calculator, HardDrive, ShieldCheck, Sparkles } from 'lucide-react';
import { Modal } from './ui';

export function RulesOverview({ onGuide }: { onGuide: () => void }) {
  return <section className="rules-overview" aria-label="Regras do cálculo">
    <header><div><h2>Como calculamos</h2></div><button className="button secondary" onClick={onGuide}><BookOpen size={16}/> Guia de pesos</button></header>
    <div className="rules-steps">
      <article><span className="rule-number">1</span><h3>Média do semestre</h3><code>(N1 × peso N1 + N2 × peso N2) ÷ soma dos pesos</code><p>Padrão: <strong>50% para cada bloco</strong>. O peso de uma avaliação vale dentro de N1 ou N2.</p></article>
      <article><span className="rule-number">2</span><h3>Recuperação de S1</h3><code>S1 ajustado = menor entre 7 e (S1 + S2) ÷ 2</code><p>Se <strong>S1 &lt; 7 e S2 &gt; S1</strong>, o ajuste pode elevar S1 <strong>até 7,0</strong>. Não garante nota 7. Nos demais casos, S1 não muda.</p></article>
      <article><span className="rule-number">3</span><h3>Média anual</h3><code>(S1 ajustado + 2 × S2) ÷ 3</code><p>Pesos fixos: <strong>S1 = 1 · S2 = 2</strong>.<br/>Aprovação direta: <strong>média ≥ 7,0</strong>.</p></article>
    </div>
    <details className="rules-more"><summary>Ver exemplo e detalhes</summary><div className="rule-example"><strong>Exemplo com recuperação:</strong> S1 = 6,0 e S2 = 7,2 → S1 ajustado = 6,6 → (6,6 + 2 × 7,2) ÷ 3 = <strong>7,0</strong>. Sem esse ajuste de S1, seriam necessários 7,5 em S2. A meta do site já considera a média recuperada.</div>
    <p className="rules-footnote">“Falta tirar” desconta as notas já preenchidas. Avaliações futuras devem estar cadastradas com nota vazia e planejamento confirmado para uma resposta exata. Sem isso, a projeção é estimativa. Não há arredondamento oficial informado: o status usa o valor exato; a recomendação sobe para o próximo centésimo.</p>
    <p className="rules-footnote">S1 e S2 são as médias do 1º e 2º semestre. A média FINAL direta substitui N1/N2 no cálculo e preserva os lançamentos. A meta pessoal, em Gerenciar, muda o “Falta tirar”, sem alterar a aprovação escolar.</p></details>
  </section>;
}
const guideSteps = [
  ['Abra os detalhes da matéria', 'Na linha da matéria, clique no + ao lado da N1 ou N2 do semestre desejado. O mesmo botão está disponível no celular. Não altere uma nota só para abrir os detalhes.'],
  ['Ajuste o peso de N1 e N2 no semestre', 'Confira se está no 1º ou 2º semestre. Abra “Personalizar os pesos de N1 e N2”. Digite os pesos do professor e confirme saindo do campo ou pressionando Enter. 30 e 70 significam 30% e 70%; 1 e 2 significam 1/3 e 2/3.'],
  ['Para pesos de provas, use avaliações detalhadas', 'Selecione N1 ou N2, escolha “Avaliações de N1/N2” e cadastre cada atividade. O campo “Peso em N1/N2” muda somente a participação daquela avaliação dentro desse bloco. O tipo Individual/Em grupo é uma identificação, não muda o peso sozinho.'],
  ['Cadastre o que falta e confira os percentuais', 'Inclua também as avaliações futuras e deixe a nota vazia. Só marque “Cadastrei todas as avaliações” quando o planejamento dos blocos detalhados estiver completo. Confira os percentuais e o semestre antes de concluir. Nota zero é diferente de nota vazia.'],
] as const;
export function WeightGuide({ onClose }: { onClose: () => void }) {
  const base=process.env.NEXT_PUBLIC_APP_BASE_PATH || '';
  return <Modal title="Passo a passo: configurar os pesos" onClose={onClose} wide><div className="weight-guide"><p className="guidance-callout"><AlertTriangle size={20}/> Use os critérios do seu professor. Você é responsável pelas notas e pelos pesos que informar. As capturas abaixo mostram dados de exemplo, sem notas de usuários reais.</p>
    {guideSteps.map(([title,text],i)=><section key={title}><h3><span>{i+1}</span>{title}</h3><p>{text}</p><a href={`${base}/guide/pesos-${i+1}.png`} target="_blank" rel="noreferrer"><img src={`${base}/guide/pesos-${i+1}.png`} alt={`Captura da interface: ${title}. Dados de exemplo. Clique para ampliar.`} loading="lazy"/></a><small>Captura real com dados demonstrativos. Clique no print para ampliar.</small></section>)}
    <div className="notice"><strong>Exemplo:</strong> prova 6,0 com peso 1 e trabalho 10,0 com peso 3 resultam em N1 = (6 × 1 + 10 × 3) ÷ 4 = 9,0. Se N1 vale 30% e N2 = 7,0 vale 70%, o semestre fica em 7,6. Mudar o peso da prova não altera os 30% de N1.</div>
    <button className="button primary" onClick={onClose}>Entendi os pesos</button></div></Modal>;
}
export function ReleaseHighlights({ onGuest }: { onGuest?: () => void }) {
  const [guide,setGuide]=useState(false);
  return <><section className="release-highlights" aria-label="Novidades desta atualização"><span className="eyebrow"><Sparkles size={16}/> NOVIDADES DO NOTA CLARA</span><h3>Mais contexto para conferir suas notas</h3><p>Regras visuais, guia de pesos com prints e rascunho temporário sem login.</p><p><strong>Você informa as notas e configura os pesos.</strong> Confira os critérios do professor; as estimativas não substituem o boletim oficial.</p><div><button className="text-button" onClick={()=>setGuide(true)}>Ver passo a passo com prints</button>{onGuest&&<button className="button secondary" onClick={onGuest}><HardDrive size={16}/> Usar sem login</button>}</div>{onGuest&&<small>Rascunho provisório neste navegador por até 24h após a última edição. Sem backup, conta ou sincronização. Limpar o navegador pode apagá-lo; outras pessoas neste navegador podem vê-lo.</small>}</section>{guide&&<WeightGuide onClose={()=>setGuide(false)}/>}</>;
}
export function EntryNotice({ guest, onClose, onGuide }: { guest: boolean; onClose: () => void; onGuide: () => void }) {
  return <Modal title="Antes de confiar na estimativa, confira os dados" onClose={onClose}><div className="entry-notice"><span className="entry-warning-icon"><AlertTriangle size={32}/></span><h3>As notas e os pesos são informados por você.</h3><p>Confirme as médias, o semestre e os pesos com seu professor. Um peso incorreto pode mudar o resultado. O site não conhece automaticamente os critérios de cada matéria.</p><div className="guidance-callout"><ShieldCheck size={22}/><p>Este site oferece estimativas. O boletim oficial e a orientação da escola são as referências para sua aprovação. Compare os resultados antes de planejar suas notas.</p></div>{guest&&<div className="guest-warning"><HardDrive size={22}/><p><strong>Você está sem login.</strong> Seu rascunho fica só neste navegador por até 24h após a última edição. Não está salvo na conta, não tem backup e não será importado automaticamente ao entrar.</p></div>}<div className="entry-actions"><button className="button primary" onClick={onGuide}>Aprender a ajustar pesos com prints</button><button className="button secondary" onClick={onClose}>Entendi, conferir minha planilha</button></div></div></Modal>;
}
