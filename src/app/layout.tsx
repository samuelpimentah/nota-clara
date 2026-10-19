import type { Metadata } from 'next';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import '@fontsource/manrope/400.css';
import '@fontsource/manrope/500.css';
import '@fontsource/manrope/600.css';
import '@fontsource/manrope/700.css';
import '@fontsource/manrope/800.css';
import './globals.css';
export const metadata: Metadata = { title: 'Nota Clara — Seu ano, sob controle', description: 'Organize suas notas escolares e descubra o próximo passo para a aprovação direta.' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Extensões de revisão de texto podem inserir atributos no <html> antes da hidratação.
  // A exceção fica restrita a este elemento; o restante da árvore continua verificado.
  return <html lang="pt-BR" suppressHydrationWarning><body>{children}</body></html>;
}
