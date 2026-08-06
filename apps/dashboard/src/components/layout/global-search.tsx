'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GraduationCap, School, Search, Users } from 'lucide-react';
import { useDebouncedValue } from '@/lib/hooks/useDebouncedValue';
import { useGlobalSearch } from '@/lib/hooks/useSearch';

const ROLE_LABEL: Record<string, string> = { DIRECTION: 'Direction', ENSEIGNANT: 'Enseignant', SURVEILLANT: 'Surveillant' };

/**
 * Recherche transverse élèves/classes/personnel — un seul champ plutôt qu'un
 * champ de recherche par page. Les élèves pointent vers leur fiche
 * (/dashboard/eleves/[id]) ; classes et personnel n'ont pas de route dédiée
 * aujourd'hui, donc renvoient vers leur page de liste.
 */
export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const debouncedQuery = useDebouncedValue(query, 250);
  const results = useGlobalSearch(debouncedQuery);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function go(href: string) {
    router.push(href);
    setIsOpen(false);
    setQuery('');
  }

  const hasQuery = query.trim().length >= 2;
  const data = results.data;
  const hasResults = !!data && (data.students.length > 0 || data.classes.length > 0 || data.staff.length > 0);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="Rechercher un élève, une classe, un membre du personnel…"
          className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-1.5 pl-8 pr-3 text-sm focus:border-zinc-300 focus:bg-white focus:outline-none"
        />
      </div>

      {isOpen && hasQuery && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {results.isLoading && <p className="p-3 text-sm text-zinc-400">Recherche…</p>}
          {!results.isLoading && !hasResults && <p className="p-3 text-sm text-zinc-400">Aucun résultat.</p>}

          {!!data?.students.length && (
            <ResultSection icon={GraduationCap} label="Élèves">
              {data.students.map((s) => (
                <ResultRow key={s.id} onClick={() => go(`/dashboard/eleves/${s.id}`)}>
                  <span className="font-medium text-zinc-900">{s.fullName}</span>
                  <span className="ml-2 text-xs text-zinc-400">{s.schoolClassName}</span>
                </ResultRow>
              ))}
            </ResultSection>
          )}

          {!!data?.classes.length && (
            <ResultSection icon={School} label="Classes">
              {data.classes.map((c) => (
                <ResultRow key={c.id} onClick={() => go('/dashboard/classes')}>
                  <span className="font-medium text-zinc-900">{c.name}</span>
                  <span className="ml-2 text-xs text-zinc-400">{c.promotion}</span>
                </ResultRow>
              ))}
            </ResultSection>
          )}

          {!!data?.staff.length && (
            <ResultSection icon={Users} label="Personnel">
              {data.staff.map((u) => (
                <ResultRow key={u.id} onClick={() => go('/dashboard/personnel')}>
                  <span className="font-medium text-zinc-900">{u.username}</span>
                  <span className="ml-2 text-xs text-zinc-400">
                    {ROLE_LABEL[u.role] ?? u.role}
                    {u.disabled ? ' — désactivé' : ''}
                  </span>
                </ResultRow>
              ))}
            </ResultSection>
          )}
        </div>
      )}
    </div>
  );
}

function ResultSection({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Search;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 py-1.5 last:border-b-0">
      <p className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
        <Icon size={12} /> {label}
      </p>
      {children}
    </div>
  );
}

function ResultRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center px-3 py-1.5 text-left text-sm hover:bg-zinc-50"
    >
      {children}
    </button>
  );
}
