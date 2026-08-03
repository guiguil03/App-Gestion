import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';

import { ThemedView } from '@/components/themed-view';
import { initialRouteForRole } from '@/navigation/roleGuard';
import { getDecodedAccessToken } from '@/services/secureStorage';

type Destination = ReturnType<typeof initialRouteForRole> | '/(auth)/login';

// Un token stocké peut être expiré : on redirige quand même vers le stack du
// rôle, l'intercepteur 401 de apiClient (cf. api/client.ts) tentera un
// refresh transparent au premier appel API, et renverra vers /login lui-même
// si le refresh token est lui aussi invalide.
export default function Index() {
  const [destination, setDestination] = useState<Destination | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getDecodedAccessToken();
      if (cancelled) return;
      setDestination(token ? initialRouteForRole(token.role) : '/(auth)/login');
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!destination) return <ThemedView style={{ flex: 1 }} />;

  return <Redirect href={destination} />;
}
