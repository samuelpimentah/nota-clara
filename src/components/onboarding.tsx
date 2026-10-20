'use client';
import { BookOpen, FileUp, Plus, Target, CloudCheck } from 'lucide-react';
import { Modal } from './ui';
export function Onboarding({onClose}:{onClose:()=>void}) {
  return <Modal title="Seu ano, com mais clareza" onClose={onClose}><div className="onboarding"><p>Bem-vindo ao Nota Clara. Veja como organizar seu boletim em poucos passos.</p>
    <ol><li><BookOpen size={22}/><div><strong>Comece pelas notas que você já sabe</strong><p>Clique nas caixas de N1, N2 ou na média final de cada semestre. Digitar a média usa o modo direto; apagar a média direta volta a usar N1/N2.</p></div></li>
    <li><Plus size={22}/><div><strong>Detalhe só quando precisar</strong><p>O botão + abre provas, trabalhos, tipos e pesos. Alternar os modos preserva suas avaliações; só o modo ativo entra no cálculo.</p></div></li>
    <li><Target size={22}/><div><strong>Entenda o que falta</strong><p>A meta se atualiza a cada nota. S1 tem peso 1 e S2 tem peso 2. A situação escolar usa aprovação em 7,0; em Gerenciar, você pode escolher uma meta pessoal maior.</p></div></li>
    <li><FileUp size={22}/><div><strong>Importe ou baixe seu boletim</strong><p>Importe o PDF da escola, revise as notas e confirme. O PDF gerado pelo site é uma estimativa da situação atual, sem frequência e sem valor de boletim oficial.</p></div></li>
    <li><CloudCheck size={22}/><div><strong>Suas notas são salvas automaticamente</strong><p>Aguarde “Tudo salvo”. No site online, você pode acessar suas notas de outros dispositivos com a mesma conta. Dados de outras contas não são compartilhados.</p></div></li></ol>
    <button className="button primary" onClick={onClose}>Entendi, começar minha planilha</button><p className="hint">Você pode rever esta introdução em Ajuda e regras da escola.</p>
  </div></Modal>;
}
