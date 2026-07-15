import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';

/**
 * Maintient la dernière position GPS connue en arrière-plan pendant que
 * l'écran de scan est monté, plutôt que de redemander une position fraîche à
 * chaque scan (getCurrentPositionAsync peut prendre plusieurs secondes pour
 * un premier fix GPS — incompatible avec l'exigence <2s du cahier des
 * charges). Un scan lit simplement `ref.current`, qui peut être `null` si
 * aucun fix n'est encore arrivé (permission refusée, GPS désactivé, etc.).
 */
export function useCurrentLocation() {
  const locationRef = useRef<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted' || cancelled) return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, timeInterval: 5000, distanceInterval: 5 },
        (position) => {
          locationRef.current = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        },
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return locationRef;
}
