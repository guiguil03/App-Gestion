import { useEffect, useState } from 'react';

/** Retourne `value`, mais mis à jour au plus une fois toutes les `delayMs` ms — évite une requête serveur à chaque frappe dans un champ de recherche. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
