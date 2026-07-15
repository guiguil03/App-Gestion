'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { ArrowLeft, ClipboardX, GraduationCap, LayoutDashboard, LogOut, School, Settings, UserCircle, Users } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/auth-provider';

const NAV_LINKS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Élèves', href: '/dashboard/eleves', icon: GraduationCap },
  { label: 'Classes', href: '/dashboard/classes', icon: School },
  { label: 'Personnel', href: '/dashboard/personnel', icon: Users },
  { label: 'Absences', href: '/dashboard/absences', icon: ClipboardX },
  { label: 'Paramètres', href: '/dashboard/parametres', icon: Settings },
  { label: 'Profil', href: '/dashboard/profil', icon: UserCircle },
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { session, logout } = useAuth();
  const initials = (session?.username ?? '??').slice(0, 2).toUpperCase();
  const isAdmin = session?.role === 'ADMIN';

  async function handleExitToSchools() {
    await adminApi.exitSchool();
    router.push('/admin');
  }

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 z-50 flex flex-col bg-white border-r border-zinc-100 shadow-[2px_0_24px_rgba(0,0,0,0.04)]">
      <div className="flex items-center gap-3 px-4 py-3.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0">
          <span className="text-xs font-bold text-white tracking-tight">PS</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-900 leading-tight truncate tracking-tight">Présence Scolaire</p>
          <span className="inline-block text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full leading-none mt-0.5">
            {isAdmin ? 'Admin' : 'Direction'}
          </span>
        </div>
      </div>

      {isAdmin && (
        <button
          type="button"
          onClick={() => void handleExitToSchools()}
          className="mx-3 mb-1 flex items-center gap-2 px-3 py-1.5 rounded-xl text-[13px] font-medium text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900"
        >
          <ArrowLeft size={15} className="flex-shrink-0 text-zinc-400" />
          <span>Toutes les écoles</span>
        </button>
      )}

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_LINKS.map(({ label, href, icon: Icon }) => {
          const active = href === '/dashboard' ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                active ? 'bg-zinc-900 text-white shadow-sm' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
              )}
            >
              <Icon size={15} className={cn('flex-shrink-0', active ? 'text-emerald-400' : 'text-zinc-400')} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 pb-3 border-t border-zinc-100 pt-2.5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-700 truncate leading-tight">{session?.username}</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            title="Déconnexion"
            className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  );
}
