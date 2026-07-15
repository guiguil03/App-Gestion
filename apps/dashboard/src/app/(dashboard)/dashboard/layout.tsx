import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { decodeAccessToken } from '@/lib/auth/decode-access-token';
import { AUTH_COOKIE } from '@/lib/auth/session-cookies';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Un ADMIN n'a pas d'école propre : sans école sélectionnée (cookie posé
  // par /admin en cliquant "Entrer"), toutes les requêtes de ces pages
  // échoueraient (403, x-school-id manquant côté backend) — on renvoie donc
  // directement vers la liste des écoles plutôt que d'afficher une page cassée.
  const cookieStore = cookies();
  const token = cookieStore.get(AUTH_COOKIE.access)?.value;
  const session = token ? decodeAccessToken(token) : null;
  if (session?.role === 'ADMIN' && !cookieStore.get(AUTH_COOKIE.adminSchool)?.value) {
    redirect('/admin');
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <main className="ml-60 p-8">{children}</main>
    </div>
  );
}
