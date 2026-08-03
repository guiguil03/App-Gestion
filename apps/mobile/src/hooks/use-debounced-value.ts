import { useEffect, useState } from 'react';

/** Retarde la propagation d'une valeur qui change vite (saisie clavier) — évite une requête réseau à chaque frappe. */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
