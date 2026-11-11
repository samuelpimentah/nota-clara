import type { Metadata } from 'next';
import { Dashboard } from '@/components/dashboard';
export const metadata: Metadata = { title: 'Nota Clara — Seu ano, sob controle', description: 'Organize suas notas, confira os pesos e acompanhe estimativas transparentes de aprovação.' };
export default function Page() { return <Dashboard />; }
